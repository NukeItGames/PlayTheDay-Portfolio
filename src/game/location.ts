import { Coordinates, GameState, Quest, SelectedLocation } from "./types";

export function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== "object") return false;
  const p = value as Coordinates;
  return (
    Number.isFinite(p.latitude) &&
    Math.abs(p.latitude) <= 90 &&
    Number.isFinite(p.longitude) &&
    Math.abs(p.longitude) <= 180
  );
}

export function coordinateLabel(p: Coordinates) {
  return `${p.latitude.toFixed(5)}, ${p.longitude.toFixed(5)}`;
}

export function saveLocation(
  state: GameState,
  location: SelectedLocation,
  questId?: string,
): GameState {
  if (!validCoordinates(location)) throw new Error("Choose a valid location.");
  if (questId) {
    // A destination never changes the discovery origin or completed memories.
    if (state.journal.some((entry) => entry.id === questId)) return state;
    const next = {
      ...state,
      questLocations: { ...state.questLocations, [questId]: location },
    };
    if (state.accepted[questId])
      next.accepted = {
        ...state.accepted,
        [questId]: questWithLocation(state.accepted[questId], next),
      };
    return next;
  }
  return {
    ...state,
    selectedLocation: location,
    player:
      state.player && location.city
        ? { ...state.player, city: location.city }
        : state.player,
  };
}

export function questWithLocation(quest: Quest, state: GameState): Quest {
  const location = state.questLocations?.[quest.id];
  if (!location || state.journal.some((entry) => entry.id === quest.id))
    return quest;
  return {
    ...quest,
    coordinates: { latitude: location.latitude, longitude: location.longitude },
    location: location.address || location.name,
  };
}

export function cityCenter(city: string): Coordinates {
  const centers: Record<string, Coordinates> = {
    "Austin, Texas": { latitude: 30.2672, longitude: -97.7431 },
    "Dallas, Texas": { latitude: 32.7767, longitude: -96.797 },
    "Houston, Texas": { latitude: 29.7604, longitude: -95.3698 },
    "San Antonio, Texas": { latitude: 29.4241, longitude: -98.4936 },
  };
  return centers[city] || centers["Austin, Texas"];
}
