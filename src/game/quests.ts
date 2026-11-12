import { localDay, distanceMiles } from "./engine";
import { Category, Quest, EventRecord, Coordinates } from "./types";

type Template = {
  key: string;
  title: string;
  description: string;
  category: Category;
  minutes: number;
  xp: number;
  search?: string;
};
const templates: Template[] = [
  {
    key: "walk",
    title: "Take the scenic route",
    description:
      "Head outside for a 20-minute walk. Notice three things you usually pass by.",
    category: "Fitness",
    minutes: 20,
    xp: 75,
    search: "walking trails",
  },
  {
    key: "park",
    title: "Find your green escape",
    description:
      "Visit a public park and spend a little time away from your screen. Check opening hours before setting out.",
    category: "Exploration",
    minutes: 30,
    xp: 100,
    search: "public parks",
  },
  {
    key: "art",
    title: "Spot a splash of color",
    description:
      "Discover a public mural or outdoor sculpture. Take a moment to look closely at its details.",
    category: "Adventure",
    minutes: 30,
    xp: 100,
    search: "public art murals",
  },
  {
    key: "library",
    title: "Open a new chapter",
    description:
      "Explore a public library and browse a subject you know nothing about. Check the branch hours first.",
    category: "Exploration",
    minutes: 30,
    xp: 75,
    search: "public library",
  },
  {
    key: "outdoors",
    title: "A little more outside",
    description:
      "Spend 30 minutes outdoors at your own pace. Walk, stretch, or simply explore an accessible route.",
    category: "Fitness",
    minutes: 30,
    xp: 100,
    search: "accessible trails",
  },
  {
    key: "landmark",
    title: "See your city differently",
    description:
      "Find a local landmark and learn one new thing about it. Stay in public, accessible areas.",
    category: "Exploration",
    minutes: 45,
    xp: 125,
    search: "landmarks",
  },
  {
    key: "mile",
    title: "One mile, endless possibilities",
    description:
      "Walk a mile on a comfortable route, with breaks whenever you need them.",
    category: "Fitness",
    minutes: 30,
    xp: 100,
    search: "walking paths",
  },
  {
    key: "hello",
    title: "A small hello",
    description:
      "Start a friendly conversation with someone new in a public setting, if you feel comfortable. Respect their time and space.",
    category: "Social",
    minutes: 20,
    xp: 75,
  },
  {
    key: "route",
    title: "The road less familiar",
    description:
      "Explore a public street or neighborhood you have not visited. Find something worth coming back for.",
    category: "Adventure",
    minutes: 60,
    xp: 150,
    search: "historic districts",
  },
  {
    key: "hike",
    title: "Follow the trail",
    description:
      "Choose a trail that suits your ability and enjoy an hour outdoors. Bring water and check conditions.",
    category: "Fitness",
    minutes: 60,
    xp: 150,
    search: "free hiking trails",
  },
  {
    key: "kindness",
    title: "Make someone’s day",
    description:
      "Share a kind word or help someone with a small task. A little connection goes a long way.",
    category: "Social",
    minutes: 15,
    xp: 50,
  },
  {
    key: "sunset",
    title: "Chase a different view",
    description:
      "Find a public overlook or an open green space and take in a new perspective.",
    category: "Adventure",
    minutes: 45,
    xp: 125,
    search: "scenic viewpoints",
  },
];
function fromTemplate(
  t: Template,
  id: string,
  city: string,
  kind: Quest["kind"],
  period?: string,
): Quest {
  const { key: _key, ...definition } = t;
  return {
    ...definition,
    id,
    city,
    kind,
    period,
    difficulty: t.xp > 100 ? "Medium" : "Easy",
    cost: 0,
    completionMethods: ["Self-reported", "Photo-submitted"],
  };
}
const hash = (text: string) =>
  [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0);
export function dailyQuests(city: string, now = new Date()): Quest[] {
  const day = localDay(now),
    shift = hash(day) % 7;
  // Non-social rotation always includes exploration, fitness and adventure.
  const pool = templates.filter((t) => t.category !== "Social");
  return Array.from({ length: 5 }, (_, i) =>
    fromTemplate(
      pool[(shift + i) % pool.length],
      `daily:${day}:${i}`,
      city,
      "daily",
      day,
    ),
  );
}
export function ordinaryQuests(city: string, generation = 0): Quest[] {
  const quests = Array.from({ length: 6 }, (_, i) => {
    const t = templates[(generation * 3 + i) % templates.length];
    return fromTemplate(
      t,
      `ordinary:${city}:${generation}:${t.key}`,
      city,
      "ordinary",
    );
  });
  if (city === "Austin, Texas")
    quests.push({
      id: "place:austin-central-library",
      title: "A library with a view",
      description:
        "Visit Austin Central Library at 710 W. Cesar Chavez Street. Explore a floor or browse a new subject. Check current opening hours before your visit.",
      category: "Exploration",
      difficulty: "Easy",
      xp: 100,
      minutes: 30,
      cost: 0,
      location: "Austin Central Library, 710 W. Cesar Chavez Street",
      coordinates: { latitude: 30.266101984, longitude: -97.751692979 },
      city,
      kind: "ordinary",
      sourceUrl: "https://library.austintexas.gov/central-library",
      completionMethods: [
        "Self-reported",
        "GPS proximity-confirmed",
        "Photo-submitted",
      ],
    });
  return quests;
}
export function eventQuest(event: EventRecord): Quest {
  return {
    id: `event:${event.id}`,
    title: event.title,
    description: event.description,
    category: "Events",
    difficulty: "Medium",
    xp: 150,
    minutes: event.end
      ? Math.round((Date.parse(event.end) - Date.parse(event.start)) / 60000)
      : null,
    cost: event.cost,
    location: event.address || event.venue,
    city: event.city,
    coordinates: event.coordinates,
    kind: "event",
    start: event.start,
    end: event.end,
    sourceUrl: event.sourceUrl,
    completionMethods: event.coordinates
      ? ["Self-reported", "GPS proximity-confirmed", "Photo-submitted"]
      : ["Self-reported", "Photo-submitted"],
  };
}
export type Filters = { minutes: number; budget: number; miles: number };
export function recommend(
  quests: Quest[],
  filters: Filters,
  origin: Coordinates | undefined,
  now = new Date(),
) {
  return quests.filter((q) => {
    if (
      Number.isFinite(filters.minutes) &&
      (q.minutes === null || q.minutes > filters.minutes)
    )
      return false;
    if (
      Number.isFinite(filters.budget) &&
      (q.cost === null ||
        (filters.budget === 0 ? q.cost > 0 : q.cost >= filters.budget))
    )
      return false;
    if (q.kind === "event") {
      // Never assume an event with no end time is currently ongoing.
      if (
        !q.end ||
        Date.parse(q.start!) > now.getTime() ||
        Date.parse(q.end) <= now.getTime()
      )
        return false;
      if (
        Number.isFinite(filters.minutes) &&
        Date.parse(q.end) - now.getTime() > filters.minutes * 60000
      )
        return false;
    }
    if (Number.isFinite(filters.miles)) {
      // Generic activities remain unmeasured until a destination is chosen.
      if (q.kind === "event" || q.coordinates || q.location)
        return (
          !!origin &&
          !!q.coordinates &&
          distanceMiles(origin, q.coordinates) <= filters.miles
        );
    }
    return true;
  });
}
