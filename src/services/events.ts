import { EventCache } from "../game/types";
import bundled from "../data/events.json";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { z } from "zod";

const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  start: z.string().datetime(),
  end: z.string().datetime().optional(),
  venue: z.string().optional(),
  address: z.string().optional(),
  coordinates: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  category: z.string(),
  cost: z.number().nonnegative().nullable(),
  sourceUrl: z
    .string()
    .url()
    .refine((url) => url.startsWith("https://")),
  city: z.string(),
  checkedAt: z.string().datetime(),
});
const cacheSchema = z.object({
  refreshedAt: z.string().nullable(),
  attemptedAt: z.string().nullable(),
  sources: z.array(
    z.object({ url: z.string(), status: z.string(), count: z.number() }),
  ),
  events: z.array(eventSchema),
  error: z.string().optional(),
});
export const bundledEvents = bundled as EventCache;
export async function loadEvents(refresh = false): Promise<EventCache> {
  let cache = bundledEvents;
  try {
    const saved = await AsyncStorage.getItem("playtheday:events:v1");
    if (saved) {
      const parsed = cacheSchema.parse(JSON.parse(saved));
      if ((parsed.refreshedAt || "") > (cache.refreshedAt || ""))
        cache = parsed;
    }
  } catch {
    /* Bundled cache remains available offline. */
  }
  const endpoint =
    process.env.EXPO_PUBLIC_EVENTS_URL ||
    (Platform.OS === "web" ? "/events.json" : undefined);
  if (refresh && endpoint) {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Event cache endpoint unavailable");
      cache = cacheSchema.parse(await response.json());
      await AsyncStorage.setItem("playtheday:events:v1", JSON.stringify(cache));
    } catch {
      return {
        ...cache,
        error: "Could not refresh. Showing the saved event schedule.",
      };
    }
  } else if (refresh)
    return {
      ...cache,
      error:
        "Using the bundled schedule. Run npm run events:refresh and reload Expo, or configure an optional public cache URL.",
    };
  return cache;
}
