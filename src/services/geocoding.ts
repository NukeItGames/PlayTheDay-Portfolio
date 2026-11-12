import { Coordinates, SelectedLocation } from "../game/types";
import { validCoordinates } from "../game/location";

// Explicit searches only (no autocomplete). Shared queue caps all requests at
// one per second; cached lookups and aborts avoid repeated traffic on map taps.
const endpoint =
  process.env.EXPO_PUBLIC_GEOCODING_URL ||
  "https://nominatim.openstreetmap.org";
const cache = new Map<string, unknown>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;
async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  if (cache.has(path)) return cache.get(path);
  const task = queue
    .catch(() => {})
    .then(async () => {
      if (cache.has(path)) return cache.get(path);
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, 1100 - (Date.now() - lastRequest))),
      );
      // React Native's AbortSignal does not implement throwIfAborted.
      if (signal?.aborted) throw new Error("Location lookup cancelled.");
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      const timeout = setTimeout(abort, 12000);
      try {
        lastRequest = Date.now();
        const response = await fetch(`${endpoint}${path}`, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "PlayTheDay/1.0 (https://github.com/NukeItGames/PlayTheDay-Portfolio)",
            Accept: "application/json",
          },
        });
        if (!response.ok)
          throw new Error(
            "Location search is unavailable. Try again shortly or tap the map.",
          );
        const data: unknown = await response.json();
        if (cache.size >= 100) cache.delete(cache.keys().next().value!);
        cache.set(path, data);
        return data;
      } finally {
        clearTimeout(timeout);
        signal?.removeEventListener("abort", abort);
      }
    });
  queue = task;
  return task;
}

export function parsePlace(value: unknown): SelectedLocation | undefined {
  if (!value || typeof value !== "object") return;
  const p = value as Record<string, unknown>;
  if (typeof p.lat !== "string" || typeof p.lon !== "string") return;
  const point = { latitude: Number(p.lat), longitude: Number(p.lon) };
  if (!validCoordinates(point) || typeof p.display_name !== "string") return;
  const address =
    p.address && typeof p.address === "object"
      ? (p.address as Record<string, unknown>)
      : {};
  const locality =
    address.city || address.town || address.village || address.municipality;
  const region = address.state || address.country;
  return {
    ...point,
    name:
      typeof p.name === "string" && p.name
        ? p.name
        : p.display_name.split(",")[0],
    address: p.display_name,
    city:
      typeof locality === "string"
        ? [locality, region].filter((v) => typeof v === "string").join(", ")
        : undefined,
  };
}

export async function searchLocations(
  query: string,
  signal?: AbortSignal,
  center?: Coordinates,
) {
  const q = query.trim().slice(0, 200);
  if (!q) return [];
  // A viewbox biases place searches around the selected origin without excluding other cities.
  const bias = center
    ? `&viewbox=${Math.max(-180, center.longitude - 0.3)},${Math.min(90, center.latitude + 0.3)},${Math.min(180, center.longitude + 0.3)},${Math.max(-90, center.latitude - 0.3)}`
    : "";
  const data = await request(
    `/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}${bias}`,
    signal,
  );
  if (!Array.isArray(data))
    throw new Error("Could not read search results. Try again.");
  return data.map(parsePlace).filter((p): p is SelectedLocation => !!p);
}

export async function reverseLocation(
  point: Coordinates,
  signal?: AbortSignal,
) {
  const data = await request(
    `/reverse?format=jsonv2&addressdetails=1&lat=${point.latitude.toFixed(5)}&lon=${point.longitude.toFixed(5)}`,
    signal,
  );
  const place = parsePlace(data);
  // Reverse geocoding identifies a nearby feature, never move the tapped pin to it.
  return place ? { ...place, ...point } : undefined;
}
