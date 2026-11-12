import { z } from "zod";
import { GameState, Player } from "../game/types";
import { initialState } from "../game/engine";

const coordinates = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
const verification = z.enum([
  "Self-reported",
  "GPS proximity-confirmed",
  "Photo-submitted",
]);
const selectedLocation = coordinates.extend({
  name: z.string(),
  address: z.string().optional(),
  city: z.string().optional(),
});
const quest = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["Exploration", "Fitness", "Social", "Events", "Adventure"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  xp: z.number().int().nonnegative(),
  minutes: z.number().nullable(),
  cost: z.number().nullable(),
  location: z.string().optional(),
  coordinates: coordinates.optional(),
  search: z.string().optional(),
  city: z.string(),
  kind: z.enum(["daily", "ordinary", "event"]),
  period: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  sourceUrl: z.string().optional(),
  completionMethods: z.array(verification),
});
const schema = z.object({
  version: z.literal(1),
  selectedLocation: selectedLocation.optional(),
  questLocations: z.record(z.string(), selectedLocation).optional(),
  player: z
    .object({
      username: z.string(),
      city: z.string(),
      face: z.string(),
      color: z.string(),
      outfit: z.string(),
      accessory: z.string(),
      badge: z.string(),
      title: z.string(),
    })
    .nullable(),
  xp: z.number().int().nonnegative(),
  accepted: z.record(z.string(), quest),
  journal: z.array(
    z.object({
      id: z.string(),
      quest,
      completedAt: z.string(),
      localDay: z.string(),
      week: z.string(),
      xp: z.number(),
      verification,
      photo: z.string().optional(),
      place: z.string().optional(),
      evidenceRemoved: z.boolean().optional(),
    }),
  ),
  weeklyClaims: z.array(z.string()),
  generation: z.number().int().nonnegative(),
});
export const STORAGE_KEY = "playtheday:game:v1";
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  withLock?<T>(task: () => Promise<T>): Promise<T>;
}
export class GameStore {
  state = initialState();
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  constructor(private storage: StorageAdapter) {}
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  snapshot = () => this.state;
  async hydrate() {
    const saved = await this.storage.getItem(STORAGE_KEY);
    if (saved) this.state = schema.parse(JSON.parse(saved));
    this.listeners.forEach((fn) => fn());
  }
  update(transform: (state: GameState) => GameState): Promise<GameState> {
    const transaction = async () => {
      if (this.storage.withLock) {
        const saved = await this.storage.getItem(STORAGE_KEY);
        if (saved) this.state = schema.parse(JSON.parse(saved));
      }
      const next = transform(this.state);
      if (next === this.state) {
        this.listeners.forEach((fn) => fn());
        return this.state;
      }
      // Persist a single complete snapshot before publishing; failed writes never grant rewards.
      await this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
      this.state = next;
      this.listeners.forEach((fn) => fn());
      return next;
    };
    const task = this.queue.then(() =>
      this.storage.withLock
        ? this.storage.withLock(transaction)
        : transaction(),
    );
    this.queue = task.catch(() => {});
    return task;
  }
  savePlayer(player: Player) {
    return this.update((state) => ({ ...state, player }));
  }
}
