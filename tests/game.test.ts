import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptQuest,
  basePlayer,
  claimWeekly,
  completeQuest,
  equip,
  initialState,
  leaderboard,
  levelInfo,
  localDay,
  localWeek,
  mapsUrl,
  proximity,
  rewards,
  weeklyObjectives,
} from "../src/game/engine";
import {
  dailyQuests,
  eventQuest,
  ordinaryQuests,
  recommend,
} from "../src/game/quests";
import {
  GameStore,
  STORAGE_KEY,
  StorageAdapter,
} from "../src/services/storage";
import { EventRecord } from "../src/game/types";

const city = "Austin, Texas",
  monday = new Date(2026, 9, 26, 12),
  tuesday = new Date(2026, 9, 27, 12);
test("level boundaries and all reward thresholds are deterministic", () => {
  assert.equal(levelInfo(0).level, 1);
  assert.equal(levelInfo(249).level, 1);
  assert.equal(levelInfo(250).level, 2);
  assert.equal(levelInfo(600).level, 3);
  for (let xp = 0; xp < 30000; xp += 37) {
    const info = levelInfo(xp);
    assert.ok(info.current >= 0 && info.current < info.needed);
    assert.ok(info.progress >= 0 && info.progress < 1);
  }
  for (const reward of rewards) {
    let xp = 0;
    while (levelInfo(xp).level < reward.level) xp++;
    const state = {
      ...initialState(),
      xp: xp - 1,
      player: basePlayer("Test", city),
    };
    assert.equal(equip(state, reward.id), state);
    assert.equal(
      equip({ ...state, xp }, reward.id).player![reward.kind],
      reward.id,
    );
  }
});
test("five stable local daily quests reset only on calendar day; city changes preserve claim IDs", () => {
  const first = dailyQuests(city, monday);
  assert.equal(first.length, 5);
  assert.equal(new Set(first.map((q) => q.id)).size, 5);
  assert.deepEqual(first, dailyQuests(city, monday));
  assert.deepEqual(
    first.map((q) => q.id),
    dailyQuests("Dallas, Texas", monday).map((q) => q.id),
  );
  assert.notEqual(first[0].id, dailyQuests(city, tuesday)[0].id);
  assert.equal(localDay(new Date(2026, 9, 26, 23, 59)), "2026-10-26");
  assert.equal(localDay(new Date(2026, 9, 27, 0, 0)), "2026-10-27");
});
test("week begins Monday and handles year boundaries and DST weekends", () => {
  assert.equal(localWeek(new Date(2026, 9, 25)), "2026-10-19");
  assert.equal(localWeek(monday), "2026-10-26");
  assert.equal(localWeek(new Date(2027, 0, 3)), "2026-12-28");
  assert.equal(localWeek(new Date(2026, 10, 1)), "2026-10-26");
});
test("accept and completion create one journal entry and grant XP once", () => {
  const quest = dailyQuests(city, monday)[0];
  let state = initialState();
  assert.equal(
    completeQuest(state, quest.id, "Self-reported", {}, monday),
    state,
  );
  state = acceptQuest(state, quest, monday);
  state = completeQuest(
    state,
    quest.id,
    "Self-reported",
    { place: "Test Park" },
    monday,
  );
  assert.equal(state.xp, quest.xp);
  assert.equal(state.journal.length, 1);
  assert.equal(state.journal[0].verification, "Self-reported");
  assert.equal(state.journal[0].place, "Test Park");
  assert.equal(
    completeQuest(state, quest.id, "Self-reported", {}, monday),
    state,
  );
  assert.equal(acceptQuest(state, quest, monday), state);
});
test("expired daily cannot be accepted or completed; completed daily stays in history", () => {
  const quest = dailyQuests(city, monday)[0],
    state = initialState();
  assert.equal(acceptQuest(state, quest, tuesday), state);
  const accepted = acceptQuest(state, quest, monday);
  assert.equal(
    completeQuest(accepted, quest.id, "Self-reported", {}, tuesday),
    accepted,
  );
});
test("weekly objectives count unique places and categories, bonuses claim once and reset Monday", () => {
  let state = initialState();
  for (const [index, quest] of dailyQuests(city, monday).entries()) {
    state = completeQuest(
      acceptQuest(state, quest, monday),
      quest.id,
      "Self-reported",
      { place: `Park ${index % 3}` },
      monday,
    );
  }
  const goals = weeklyObjectives(state, monday);
  assert.equal(goals[0].current, 5);
  assert.equal(goals[1].current, 3);
  assert.ok(goals[2].current >= 3);
  const xp = state.xp;
  state = claimWeekly(state, goals[0].id, monday);
  assert.equal(state.xp, xp + 250);
  assert.equal(claimWeekly(state, goals[0].id, monday), state);
  const next = weeklyObjectives(state, new Date(2026, 10, 2));
  assert.equal(next[0].current, 0);
  assert.equal(next[0].claimed, false);
});
test("GPS threshold accounts for accuracy and evidence methods are explicit", () => {
  const coords = { latitude: 30.266, longitude: -97.751 };
  assert.equal(proximity(coords, coords, 5).confirmed, true);
  assert.equal(proximity(coords, coords, 101).confirmed, false);
  assert.equal(proximity(coords, coords, null).confirmed, false);
  assert.equal(
    proximity(coords, { ...coords, latitude: 30.27 }, 5).confirmed,
    false,
  );
  const q = ordinaryQuests(city).at(-1)!,
    accepted = acceptQuest(initialState(), q);
  assert.throws(
    () => completeQuest(accepted, q.id, "GPS proximity-confirmed"),
    /check-in/,
  );
  assert.throws(
    () => completeQuest(accepted, q.id, "Photo-submitted"),
    /photo/,
  );
  assert.equal(
    completeQuest(accepted, q.id, "GPS proximity-confirmed", {
      gpsConfirmed: true,
    }).journal[0].verification,
    "GPS proximity-confirmed",
  );
  assert.equal(
    completeQuest(accepted, q.id, "Photo-submitted", {
      photo: "data:image/jpeg;base64,test",
    }).journal[0].verification,
    "Photo-submitted",
  );
});
const event: EventRecord = {
  id: "real-source-id",
  title: "Test schedule fixture",
  description: "Not production content",
  start: "2026-10-26T16:00:00Z",
  end: "2026-10-26T18:00:00Z",
  category: "Workshop",
  cost: 0,
  sourceUrl: "https://library.austintexas.gov/events",
  city,
  checkedAt: "2026-10-26T12:00:00Z",
};
test("event conversion preserves identity and actual schedule; future event completion rejected", () => {
  const q = eventQuest(event),
    now = new Date("2026-10-26T15:00:00Z");
  assert.equal(q.id, "event:real-source-id");
  assert.equal(q.minutes, 120);
  assert.equal(q.sourceUrl, event.sourceUrl);
  const accepted = acceptQuest(initialState(), q, now);
  assert.throws(
    () => completeQuest(accepted, q.id, "Self-reported", {}, now),
    /not started/,
  );
  assert.equal(
    completeQuest(
      accepted,
      q.id,
      "Self-reported",
      {},
      new Date("2026-10-26T19:00:00Z"),
    ).xp,
    150,
  );
});
test("right now filters time, strict under-$20, actual distance, unknowns, and event schedule", () => {
  const base = ordinaryQuests(city)[0],
    coords = { latitude: 30.266, longitude: -97.751 },
    now = new Date("2026-10-26T17:00:00Z");
  const filter = { minutes: 30, budget: 0, miles: 5 };
  assert.equal(recommend([base], filter, undefined, now).length, 1); // Explicit generic Maps suggestion, never a measured place.
  assert.equal(
    recommend([{ ...base, minutes: 60 }], filter, undefined, now).length,
    0,
  );
  assert.equal(
    recommend([{ ...base, cost: null }], filter, undefined, now).length,
    0,
  );
  assert.equal(
    recommend(
      [{ ...base, cost: 20 }],
      { ...filter, budget: 20 },
      undefined,
      now,
    ).length,
    0,
  );
  assert.equal(
    recommend([{ ...base, coordinates: coords }], filter, undefined, now)
      .length,
    0,
  );
  assert.equal(
    recommend([{ ...base, coordinates: coords }], filter, coords, now).length,
    1,
  );
  assert.equal(
    recommend(
      [{ ...base, coordinates: { ...coords, latitude: 31 } }],
      filter,
      coords,
      now,
    ).length,
    0,
  );
  const all = { minutes: Infinity, budget: Infinity, miles: Infinity };
  assert.equal(recommend([eventQuest(event)], all, undefined, now).length, 1);
  assert.equal(
    recommend(
      [eventQuest(event)],
      all,
      undefined,
      new Date("2026-10-26T15:00:00Z"),
    ).length,
    0,
  );
  assert.equal(
    recommend([eventQuest({ ...event, end: undefined })], all, undefined, now)
      .length,
    0,
  );
  assert.equal(
    recommend(
      [eventQuest(event)],
      all,
      undefined,
      new Date("2026-10-26T19:00:00Z"),
    ).length,
    0,
  );
});
test("Maps links encode destinations and city fallback, leaderboard moves actual player", () => {
  const q = ordinaryQuests(city)[0];
  const url = new URL(mapsUrl(q));
  assert.equal(url.hostname, "www.google.com");
  assert.ok(url.searchParams.get("query")!.includes(city));
  assert.ok(
    new URL(mapsUrl(ordinaryQuests(city).at(-1)!)).searchParams
      .get("destination")!
      .includes("30.266"),
  );
  const ranks = leaderboard({
    ...initialState(),
    xp: 2300,
    player: basePlayer("Ari", city),
  });
  assert.equal(ranks[0].demo, false);
  assert.equal(ranks[0].username, "Ari");
});
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      await new Promise((r) => setTimeout(r, 2));
      data.set(key, value);
    },
  };
}
test("concurrent completion requests serialize; restart restores progress, cosmetic and journal", async () => {
  const storage = memoryStorage(),
    store = new GameStore(storage),
    quest = dailyQuests(city, monday)[0];
  await store.hydrate();
  await store.savePlayer(basePlayer("Ari", city, "cool", "mint"));
  await store.update((s) => acceptQuest(s, quest, monday));
  await Promise.all(
    Array.from({ length: 12 }, () =>
      store.update((s) =>
        completeQuest(s, quest.id, "Self-reported", {}, monday),
      ),
    ),
  );
  assert.equal(store.state.xp, quest.xp);
  assert.equal(store.state.journal.length, 1);
  const reloaded = new GameStore(storage);
  await reloaded.hydrate();
  assert.deepEqual(reloaded.state, JSON.parse(JSON.stringify(store.state)));
  assert.equal(reloaded.state.player!.color, "mint");
});
test("failed storage writes do not grant XP and queue recovers", async () => {
  const adapter = memoryStorage();
  let fail = false;
  const storage: StorageAdapter = {
    getItem: adapter.getItem,
    setItem: async (key, value) => {
      if (fail) throw new Error("Quota exceeded");
      await adapter.setItem(key, value);
    },
  };
  const store = new GameStore(storage),
    quest = dailyQuests(city, monday)[0];
  await store.update((s) => acceptQuest(s, quest, monday));
  fail = true;
  await assert.rejects(
    store.update((s) =>
      completeQuest(s, quest.id, "Self-reported", {}, monday),
    ),
  );
  assert.equal(store.state.xp, 0);
  fail = false;
  await store.update((s) =>
    completeQuest(s, quest.id, "Self-reported", {}, monday),
  );
  assert.equal(store.state.xp, quest.xp);
});
test("corrupt saved data is rejected without overwriting the original", async () => {
  const storage = memoryStorage();
  storage.data.set(STORAGE_KEY, "{broken");
  const store = new GameStore(storage);
  await assert.rejects(store.hydrate());
  assert.equal(storage.data.get(STORAGE_KEY), "{broken");
});

test("two independent stores serialize across a shared lock without losing adventures", async () => {
  const adapter = memoryStorage();
  let queue: Promise<unknown> = Promise.resolve();
  const storage: StorageAdapter = {
    ...adapter,
    withLock: <T>(task: () => Promise<T>) => {
      const result = queue.then(task);
      queue = result.catch(() => {});
      return result;
    },
  };
  const one = new GameStore(storage),
    two = new GameStore(storage),
    quests = dailyQuests(city, monday);
  await Promise.all([one.hydrate(), two.hydrate()]);
  await Promise.all([
    one.update((s) => acceptQuest(s, quests[0], monday)),
    two.update((s) => acceptQuest(s, quests[1], monday)),
  ]);
  await Promise.all([
    one.update((s) =>
      completeQuest(s, quests[0].id, "Self-reported", {}, monday),
    ),
    two.update((s) =>
      completeQuest(s, quests[1].id, "Self-reported", {}, monday),
    ),
  ]);
  const final = new GameStore(storage);
  await final.hydrate();
  assert.equal(final.state.journal.length, 2);
  assert.equal(final.state.xp, quests[0].xp + quests[1].xp);
});
test("Maps never receives the player GPS coordinates", () => {
  const url = mapsUrl(ordinaryQuests(city)[0], {
    latitude: 32.123456,
    longitude: -95.654321,
  });
  assert.ok(!url.includes("32.123456"));
  assert.ok(!url.includes("-95.654321"));
  assert.equal(
    new URL(url).searchParams.get("query"),
    "walking trails near me",
  );
});
