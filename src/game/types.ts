export type Category =
  "Exploration" | "Fitness" | "Social" | "Events" | "Adventure";
export type Coordinates = { latitude: number; longitude: number };
export type SelectedLocation = Coordinates & {
  name: string;
  address?: string;
  city?: string;
};
export type Verification =
  "Self-reported" | "GPS proximity-confirmed" | "Photo-submitted";
export type Quest = {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: "Easy" | "Medium" | "Hard";
  xp: number;
  minutes: number | null;
  cost: number | null;
  location?: string;
  coordinates?: Coordinates;
  search?: string;
  city: string;
  kind: "daily" | "ordinary" | "event";
  period?: string;
  start?: string;
  end?: string;
  sourceUrl?: string;
  completionMethods: Verification[];
};
export type Player = {
  username: string;
  city: string;
  face: string;
  color: string;
  outfit: string;
  accessory: string;
  badge: string;
  title: string;
};
export type JournalEntry = {
  id: string;
  quest: Quest;
  completedAt: string;
  localDay: string;
  week: string;
  xp: number;
  verification: Verification;
  photo?: string;
  place?: string;
  evidenceRemoved?: boolean;
};
export type GameState = {
  version: 1;
  selectedLocation?: SelectedLocation;
  questLocations?: Record<string, SelectedLocation>;
  player: Player | null;
  xp: number;
  accepted: Record<string, Quest>;
  journal: JournalEntry[];
  weeklyClaims: string[];
  generation: number;
};
export type EventRecord = {
  id: string;
  title: string;
  description: string;
  start: string;
  end?: string;
  venue?: string;
  address?: string;
  coordinates?: Coordinates;
  category: string;
  cost: number | null;
  sourceUrl: string;
  city: string;
  checkedAt: string;
};
export type EventCache = {
  refreshedAt: string | null;
  attemptedAt: string | null;
  sources: { url: string; status: string; count: number }[];
  events: EventRecord[];
  error?: string;
};
