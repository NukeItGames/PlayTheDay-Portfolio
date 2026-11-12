import { readFile, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import robotsParser from "robots-parser";

export const FEED = "https://library.austintexas.gov/events-feed.xml";
const AGENT =
  "PlayTheDay/1.0 (+local public-event discovery; no personal data)";
const file = new URL("../src/data/events.json", import.meta.url);
const plain = (text) =>
  cheerio
    .load(`<div>${String(text ?? "")}</div>`)("div")
    .text()
    .replace(/\s+/g, " ")
    .trim();
export function parseFeed(xml) {
  const feed = new XMLParser().parse(xml);
  if (!feed.rss?.channel) throw new Error("Source did not return RSS");
  const items = feed.rss.channel.item ?? [];
  return (Array.isArray(items) ? items : [items]).map((item) => ({
    title: plain(item.title),
    description: plain(item.description),
    url: String(item.link).replace(/^http:/, "https:"),
    date: item.pubDate,
  }));
}
export function parseEvent(html, item, now = new Date()) {
  const $ = cheerio.load(html),
    nodes = [];
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    if ([node["@type"]].flat().includes("Event")) nodes.push(node);
    if (node["@graph"]) walk(node["@graph"]);
  }
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      walk(JSON.parse($(element).text()));
    } catch {
      /* Invalid publisher metadata is skipped. */
    }
  });
  const event = nodes.find((e) => e.startDate);
  if (
    !event ||
    !/(Z|[+-]\d\d:?\d\d)$/.test(event.startDate) ||
    !Number.isFinite(Date.parse(event.startDate))
  )
    return null;
  if (
    /Cancelled|Postponed|OnlineEventAttendanceMode/.test(
      `${event.eventStatus} ${event.eventAttendanceMode}`,
    )
  )
    return null;
  const start = new Date(event.startDate).toISOString();
  const end =
    event.endDate &&
    /(Z|[+-]\d\d:?\d\d)$/.test(event.endDate) &&
    Date.parse(event.endDate) > Date.parse(start)
      ? new Date(event.endDate).toISOString()
      : undefined;
  if (Date.parse(end ?? start) <= now.getTime()) return null;
  const locationParts =
    $(".event_location")
      .html()
      ?.split(/<br\s*\/?\s*>/i)
      .map(plain)
      .filter(Boolean) ?? [];
  const location = event.location ?? {};
  const geo = location.geo;
  const coords =
    geo &&
    Number.isFinite(Number(geo.latitude)) &&
    Number.isFinite(Number(geo.longitude))
      ? { latitude: Number(geo.latitude), longitude: Number(geo.longitude) }
      : undefined;
  const address =
    typeof location.address === "string"
      ? location.address
      : location.address?.streetAddress;
  const free =
    String(event.isAccessibleForFree).toLowerCase() === "true" ||
    $(".apl-free").text().includes("Free and open");
  const offer = Array.isArray(event.offers) ? event.offers[0] : event.offers;
  const cost = free
    ? 0
    : offer?.priceCurrency === "USD" && Number.isFinite(Number(offer.price))
      ? Number(offer.price)
      : null;
  return {
    id: createHash("sha256")
      .update(item.url + start)
      .digest("hex")
      .slice(0, 20),
    title: plain(event.name || item.title),
    // Publish factual listings and links without redistributing publisher prose.
    description:
      "A public program from Austin Public Library. Check the original listing for audience, accessibility and registration details.",
    start,
    end,
    venue: location.name || locationParts[0],
    address: address || locationParts.slice(1).join(", ") || undefined,
    coordinates: coords,
    category: /music|concert/i.test(item.title)
      ? "Music"
      : /walk|yoga|fitness/i.test(item.title)
        ? "Fitness"
        : /class|workshop|learn/i.test(item.title)
          ? "Workshop"
          : /festival|celebrat/i.test(item.title)
            ? "Festival"
            : "Community",
    cost,
    sourceUrl: item.url,
    city: "Austin, Texas",
    checkedAt: now.toISOString(),
  };
}
export function deduplicate(events) {
  const seen = new Set();
  return events
    .filter((e) => {
      const key = `${e.title.toLowerCase()}|${e.start}|${e.venue || e.address || ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}
async function request(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": AGENT },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.text();
}
export async function ingest() {
  const now = new Date(),
    attemptedAt = now.toISOString();
  let previous = { refreshedAt: null, events: [], sources: [] };
  try {
    previous = JSON.parse(await readFile(file, "utf8"));
  } catch {
    /* First refresh */
  }
  try {
    const robotsUrl = new URL("/robots.txt", FEED).href;
    const robots = robotsParser(robotsUrl, await request(robotsUrl));
    const allowed = (url) => {
      if (
        new URL(url).origin !== new URL(FEED).origin ||
        robots.isAllowed(url, AGENT) === false
      )
        throw new Error(`Source restrictions disallow ${url}`);
    };
    const candidates = new Map();
    // RSS publication dates are only used to prioritize fetching; event-page structured dates are authoritative.
    for (let page = 0; page < 4; page++) {
      const url = page ? `${FEED}?page=${page}` : FEED;
      allowed(url);
      const items = parseFeed(await request(url));
      for (const item of items)
        if (Date.parse(item.date) >= now.getTime() - 86400000)
          candidates.set(item.url, item);
      if (candidates.size >= 50 || !items.length) break;
    }
    const events = [],
      failures = [];
    for (const item of [...candidates.values()].slice(0, 48)) {
      try {
        allowed(item.url);
        const event = parseEvent(await request(item.url), item, now);
        if (event) events.push(event);
      } catch (error) {
        failures.push(error.message);
      }
      // Small, bounded, sequential requests. Never bypass restrictions or challenges.
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    if (!events.length)
      throw new Error(
        "No usable upcoming scheduled events returned. " + (failures[0] || ""),
      );
    const normalized = deduplicate(events);
    const result = {
      refreshedAt: attemptedAt,
      attemptedAt,
      sources: [
        {
          url: FEED,
          status: `RSS + event-page structured metadata; ${failures.length} page failures`,
          count: normalized.length,
        },
      ],
      events: normalized,
    };
    await writeFile(file, JSON.stringify(result, null, 2) + "\n");
    await mkdir(new URL("../public/", import.meta.url), { recursive: true });
    await writeFile(
      new URL("../public/events.json", import.meta.url),
      JSON.stringify(result),
    );
    console.log(
      `Saved ${normalized.length} genuine events. ${normalized[0].start} to ${normalized.at(-1).start}. Source: ${FEED}`,
    );
    return result;
  } catch (error) {
    const result = {
      ...previous,
      attemptedAt,
      error: error.message,
      events: previous.events.filter(
        (e) => Date.parse(e.end ?? e.start) > now.getTime(),
      ),
    };
    await writeFile(file, JSON.stringify(result, null, 2) + "\n");
    await mkdir(new URL("../public/", import.meta.url), { recursive: true });
    await writeFile(
      new URL("../public/events.json", import.meta.url),
      JSON.stringify(result),
    );
    console.error(
      `Refresh failed; preserved ${result.events.length} cached upcoming events: ${error.message}`,
    );
    process.exitCode = 1;
    return result;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await ingest();
