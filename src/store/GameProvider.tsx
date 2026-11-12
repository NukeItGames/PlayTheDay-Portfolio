import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { platformStorage } from "../services/platformStorage";
import { GameStore } from "../services/storage";
import { SelectedLocation, EventCache, GameState } from "../game/types";
import { bundledEvents, loadEvents } from "../services/events";
import { levelInfo, rewards } from "../game/engine";

const store = new GameStore(platformStorage);
type Context = {
  state: GameState;
  ready: boolean;
  loadError: string;
  now: Date;
  events: EventCache;
  origin?: SelectedLocation;
  notice: string;
  notify: (text: string) => void;
  run: (fn: (state: GameState) => GameState) => Promise<boolean>;
  refreshEvents: () => Promise<void>;
};
const GameContext = createContext<Context | null>(null);
export function GameProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.snapshot,
  );
  const [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(""),
    [now, setNow] = useState(new Date());
  const [events, setEvents] = useState(bundledEvents),
    [notice, notify] = useState("");
  const origin = state.selectedLocation;
  useEffect(() => {
    store
      .hydrate()
      .then(() => setReady(true))
      .catch(() =>
        setLoadError(
          "Your saved adventure could not be loaded. Your data has been preserved. Free device storage if needed, then restart the app.",
        ),
      );
    loadEvents().then(setEvents);
    const interval = setInterval(() => setNow(new Date()), 30000);
    let midnight: ReturnType<typeof setTimeout>;
    const scheduleMidnight = () => {
      const current = new Date(),
        next = new Date(current);
      next.setHours(24, 0, 0, 10);
      midnight = setTimeout(() => {
        setNow(new Date());
        scheduleMidnight();
      }, next.getTime() - current.getTime());
    };
    scheduleMidnight();
    const listener = AppState.addEventListener("change", (value) => {
      if (value === "active") setNow(new Date());
    });
    return () => {
      clearInterval(interval);
      clearTimeout(midnight);
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function run(fn: (state: GameState) => GameState) {
    try {
      let before = 0;
      const result = await store.update((s) => {
        before = s.xp;
        return fn(s);
      });
      const oldLevel = levelInfo(before).level,
        newLevel = levelInfo(result.xp).level;
      const unlocked = rewards.filter(
        (r) => r.level > oldLevel && r.level <= newLevel,
      );
      if (newLevel > oldLevel)
        notify(
          `Level ${newLevel}! ${unlocked.length ? `Unlocked: ${unlocked.map((r) => r.name).join(", ")}` : "Your next adventure awaits."}`,
        );
      else if (result.xp > before)
        notify(`+${result.xp - before} XP · Adventure saved!`);
      return true;
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not save. Please try again.",
      );
      return false;
    }
  }
  async function refreshEvents() {
    const next = await loadEvents(true);
    setEvents(next);
    notify(next.error || "Latest available event schedule loaded.");
  }
  return (
    <GameContext.Provider
      value={{
        state,
        ready,
        loadError,
        now,
        events,
        origin,
        notice,
        notify,
        run,
        refreshEvents,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("GameProvider missing");
  return context;
}
