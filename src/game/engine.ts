import {
  Coordinates,
  GameState,
  JournalEntry,
  Player,
  Quest,
  Verification,
} from "./types";

export const initialState = (): GameState => ({
  version: 1,
  player: null,
  xp: 0,
  accepted: {},
  journal: [],
  weeklyClaims: [],
  generation: 0,
});
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function localWeek(date = new Date()) {
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDay(monday);
}
export function levelInfo(xp: number) {
  let level = 1,
    floor = 0,
    needed = 250;
  while (xp >= floor + needed) {
    floor += needed;
    level++;
    needed = 250 + (level - 1) * 100;
  }
  return {
    level,
    current: xp - floor,
    needed,
    progress: (xp - floor) / needed,
  };
}
export const rewards = [
  {
    id: "violet",
    kind: "color",
    name: "Cosmic violet",
    level: 2,
    icon: "color-palette-outline",
  },
  {
    id: "ranger",
    kind: "outfit",
    name: "Night ranger",
    level: 3,
    icon: "shirt-outline",
  },
  {
    id: "explorer",
    kind: "badge",
    name: "Explorer badge",
    level: 5,
    icon: "compass-outline",
  },
  {
    id: "headphones",
    kind: "accessory",
    name: "Pulse headphones",
    level: 7,
    icon: "headset-outline",
  },
  {
    id: "City Legend",
    kind: "title",
    name: "City Legend",
    level: 10,
    icon: "sparkles-outline",
  },
] as const;
export const basePlayer = (
  username: string,
  city: string,
  face = "happy",
  color = "blue",
): Player => ({
  username: username.trim().slice(0, 24),
  city,
  face,
  color,
  outfit: "starter",
  accessory: "none",
  badge: "none",
  title: "New adventurer",
});
export const GPS_THRESHOLD_METERS = 150;
export function distanceMiles(a: Coordinates, b: Coordinates) {
  const r = Math.PI / 180,
    dlat = (b.latitude - a.latitude) * r,
    dlon = (b.longitude - a.longitude) * r;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.latitude * r) *
      Math.cos(b.latitude * r) *
      Math.sin(dlon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function proximity(
  a: Coordinates,
  b: Coordinates,
  accuracy: number | null,
) {
  const meters = distanceMiles(a, b) * 1609.344;
  return {
    meters,
    confirmed:
      accuracy !== null &&
      accuracy <= 100 &&
      meters + accuracy <= GPS_THRESHOLD_METERS,
  };
}
export function statusOf(state: GameState, id: string) {
  return state.journal.some((j) => j.id === id)
    ? "completed"
    : state.accepted[id]
      ? "accepted"
      : "available";
}
export function isExpired(quest: Quest, now = new Date()) {
  return quest.kind === "daily"
    ? quest.period !== localDay(now)
    : quest.kind === "event" &&
        Date.parse(quest.end ?? quest.start!) < now.getTime();
}
export function acceptQuest(
  state: GameState,
  quest: Quest,
  now = new Date(),
): GameState {
  if (statusOf(state, quest.id) !== "available" || isExpired(quest, now))
    return state;
  return { ...state, accepted: { ...state.accepted, [quest.id]: quest } };
}
export function completeQuest(
  state: GameState,
  id: string,
  verification: Verification,
  options: { photo?: string; place?: string; gpsConfirmed?: boolean } = {},
  now = new Date(),
): GameState {
  const quest = state.accepted[id];
  if (
    !quest ||
    statusOf(state, id) === "completed" ||
    (quest.kind === "daily" && isExpired(quest, now))
  )
    return state;
  if (quest.kind === "event" && Date.parse(quest.start!) > now.getTime())
    throw new Error(
      "This event has not started yet. Come back after you attend.",
    );
  if (
    verification === "GPS proximity-confirmed" &&
    (!quest.coordinates || !options.gpsConfirmed)
  )
    throw new Error("A successful location check-in is required.");
  if (verification === "Photo-submitted" && !options.photo)
    throw new Error("Choose a photo first.");
  const entry: JournalEntry = {
    id,
    quest,
    completedAt: now.toISOString(),
    localDay: localDay(now),
    week: localWeek(now),
    xp: quest.xp,
    verification,
    photo: options.photo,
    place: options.place?.trim().slice(0, 100) || quest.location,
  };
  const accepted = { ...state.accepted };
  delete accepted[id];
  return {
    ...state,
    accepted,
    xp: state.xp + quest.xp,
    journal: [entry, ...state.journal],
  };
}
export function weeklyObjectives(state: GameState, now = new Date()) {
  const week = localWeek(now),
    entries = state.journal.filter((j) => j.week === week);
  return [
    {
      id: `${week}:quests`,
      title: "Make it a habit",
      description: "Complete 5 adventures this week",
      current: entries.length,
      target: 5,
      xp: 250,
    },
    {
      id: `${week}:places`,
      title: "Leave your usual route",
      description: "Explore 3 different named places",
      current: new Set(
        entries.map((j) => j.place?.trim().toLowerCase()).filter(Boolean),
      ).size,
      target: 3,
      xp: 200,
    },
    {
      id: `${week}:categories`,
      title: "A little of everything",
      description: "Try 3 different quest categories",
      current: new Set(entries.map((j) => j.quest.category)).size,
      target: 3,
      xp: 200,
    },
  ].map((q) => ({ ...q, claimed: state.weeklyClaims.includes(q.id) }));
}
export function claimWeekly(state: GameState, id: string, now = new Date()) {
  const objective = weeklyObjectives(state, now).find((q) => q.id === id);
  if (!objective || objective.claimed || objective.current < objective.target)
    return state;
  return {
    ...state,
    xp: state.xp + objective.xp,
    weeklyClaims: [...state.weeklyClaims, id],
  };
}
export function equip(state: GameState, id: string) {
  const reward = rewards.find((r) => r.id === id);
  if (!state.player || !reward || levelInfo(state.xp).level < reward.level)
    return state;
  return { ...state, player: { ...state.player, [reward.kind]: reward.id } };
}
export function mapsUrl(
  quest: Pick<Quest, "coordinates" | "location" | "search" | "city">,
  origin?: Coordinates,
) {
  if (quest.coordinates || quest.location)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(quest.coordinates ? `${quest.coordinates.latitude},${quest.coordinates.longitude}` : `${quest.location}, ${quest.city}`)}`;
  // Never put the player's precise coordinates into an external URL.
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${quest.search || "parks"} near ${origin ? "me" : quest.city}`)}`;
}
export function leaderboard(state: GameState) {
  return [
    { id: "demo-1", username: "Trailblazer", xp: 2200, demo: true },
    { id: "demo-2", username: "Luna", xp: 1150, demo: true },
    { id: "demo-3", username: "Sidequest Sam", xp: 400, demo: true },
    { id: "demo-4", username: "Wanderer", xp: 120, demo: true },
    {
      id: "you",
      username: state.player?.username || "You",
      xp: state.xp,
      demo: false,
    },
  ].sort((a, b) => b.xp - a.xp);
}
