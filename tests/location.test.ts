import { test } from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  basePlayer,
  acceptQuest,
  completeQuest,
  mapsUrl,
} from "../src/game/engine";
import { ordinaryQuests, recommend } from "../src/game/quests";
import {
  saveLocation,
  questWithLocation,
  validCoordinates,
} from "../src/game/location";
import { parsePlace, searchLocations } from "../src/services/geocoding";
import { GameStore, STORAGE_KEY } from "../src/services/storage";
import { mapHtml } from "../src/ui/locationMapHtml";
import { GameState } from "../src/game/types";

const austin = {
  latitude: 30.2661,
  longitude: -97.7517,
  name: "Austin Central Library",
  address: "710 W Cesar Chavez St",
  city: "Austin, Texas",
};
const dallas = {
  latitude: 32.7767,
  longitude: -96.797,
  name: "Dallas",
  city: "Dallas, Texas",
};
test("search supports the React Native AbortSignal subset without throwIfAborted", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return new Response(
      JSON.stringify([
        {
          lat: "30.2661",
          lon: "-97.7517",
          name: austin.name,
          display_name: austin.address,
          address: { city: "Austin", state: "Texas" },
        },
      ]),
    );
  };
  const signal = {
    aborted: false,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as AbortSignal;
  try {
    assert.deepEqual(
      await searchLocations("Native signal regression", signal),
      [austin],
    );
    assert.deepEqual(
      await searchLocations("Native signal regression", signal),
      [austin],
    );
    assert.equal(calls, 1);
    await assert.rejects(
      searchLocations("Cancelled native search", {
        ...signal,
        aborted: true,
      } as AbortSignal),
      /cancelled/,
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("legacy saves hydrate; locations survive restart without losing progression or accepted destinations", async () => {
  const now = new Date();
  const quest = ordinaryQuests("Austin, Texas")[0];
  let old: GameState = {
    ...initialState(),
    player: basePlayer("Ari", "Austin, Texas", "happy", "mint"),
  };
  old = completeQuest(
    acceptQuest(old, quest, now),
    quest.id,
    "Self-reported",
    {},
    now,
  );
  let serialized = JSON.stringify(old);
  const adapter = {
    getItem: async () => serialized,
    setItem: async (_key: string, data: string) => {
      serialized = data;
    },
  };
  const store = new GameStore(adapter);
  await store.hydrate();
  assert.equal(store.state.selectedLocation, undefined);
  await store.update((s) => saveLocation(s, austin, "destination"));
  await store.update((s) => saveLocation(s, dallas));
  const restarted = new GameStore(adapter);
  await restarted.hydrate();
  assert.deepEqual(restarted.state.selectedLocation, dallas);
  assert.deepEqual(restarted.state.questLocations?.destination, austin);
  assert.equal(restarted.state.player?.city, dallas.city);
  assert.equal(restarted.state.xp, old.xp);
  assert.deepEqual(
    restarted.state.journal,
    JSON.parse(JSON.stringify(old.journal)),
  );
  assert.deepEqual(
    restarted.state.accepted,
    JSON.parse(JSON.stringify(old.accepted)),
  );
  assert.deepEqual(restarted.state.weeklyClaims, old.weeklyClaims);
});

test("failed location writes leave discovery origin and all existing state intact", async () => {
  const store = new GameStore({
    getItem: async () => null,
    setItem: async () => {
      throw new Error("disk full");
    },
  });
  const before = store.snapshot();
  await assert.rejects(
    store.update((s) => saveLocation(s, austin)),
    /disk full/,
  );
  assert.equal(store.snapshot(), before);
  assert.ok(STORAGE_KEY.endsWith(":v1"));
});

test("saved origins filter actual destinations; choosing a quest place preserves its identity and routes directions", () => {
  const library = ordinaryQuests("Austin, Texas").find((q) => q.coordinates)!;
  const filters = { minutes: 30, budget: 0, miles: 2 };
  assert.equal(recommend([library], filters, austin).length, 1);
  assert.equal(recommend([library], filters, dallas).length, 0);
  const quest = ordinaryQuests("Austin, Texas")[0];
  const state = saveLocation(
    saveLocation(initialState(), dallas),
    austin,
    quest.id,
  );
  const located = questWithLocation(quest, state);
  assert.equal(located.id, quest.id);
  assert.equal(located.xp, quest.xp);
  assert.deepEqual(located.completionMethods, quest.completionMethods);
  assert.deepEqual(state.selectedLocation, dallas);
  assert.equal(recommend([located], filters, dallas).length, 0);
  assert.match(
    decodeURIComponent(mapsUrl(located, dallas)),
    /destination=30.2661,-97.7517/,
  );
  assert.ok(!mapsUrl(located, dallas).includes("32.7767"));
});

test("geocoding parses usable addresses and rejects invalid data; map HTML includes only coordinates", () => {
  assert.deepEqual(
    parsePlace({
      lat: "30.2661",
      lon: "-97.7517",
      name: austin.name,
      display_name: austin.address,
      address: { city: "Austin", state: "Texas" },
    }),
    austin,
  );
  assert.equal(
    parsePlace({ lat: "bad", lon: "0", display_name: "bad" }),
    undefined,
  );
  assert.equal(validCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(validCoordinates({ latitude: 0, longitude: Infinity }), false);
  assert.equal(validCoordinates({ latitude: 0, longitude: 0 }), true);
  assert.throws(() =>
    saveLocation(initialState(), { ...austin, latitude: NaN }),
  );
  const untrusted = { ...austin, name: "</script><script>bad</script>" };
  assert.ok(!mapHtml(austin, untrusted).includes(untrusted.name));
});
