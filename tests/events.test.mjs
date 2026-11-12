import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEvent,
  parseFeed,
  deduplicate,
} from "../scripts/ingest-events.mjs";
const item = {
  title: "Workshop",
  description: "A public activity",
  url: "https://library.austintexas.gov/event/test",
};
const now = new Date("2026-10-28T12:00:00Z");
function html(extra = {}) {
  return `<script type="application/ld+json">${JSON.stringify({ "@graph": [{ "@type": "Event", name: "Workshop", startDate: "2026-10-29T18:00:00-0500", endDate: "2026-10-29T19:00:00-0500", isAccessibleForFree: "True", ...extra }] })}</script><span class="event_location">Central Library<br>710 W Cesar Chavez St.</span>`;
}
test("RSS parsing decodes HTML and upgrades source links", () => {
  const items = parseFeed(
    "<rss><channel><item><title>Arts &amp; Crafts</title><link>http://library.austintexas.gov/event/test</link><description>Library - Try it</description><pubDate>Thu, 29 Oct 2026 18:00:00 -0500</pubDate></item></channel></rss>",
  );
  assert.equal(items[0].title, "Arts & Crafts");
  assert.ok(items[0].url.startsWith("https:"));
  assert.throws(() => parseFeed("<html>Access denied</html>"));
});
test("event metadata provides explicit timezone, price and venue without inventing coordinates", () => {
  const e = parseEvent(html(), item, now);
  assert.equal(e.start, "2026-10-29T23:00:00.000Z");
  assert.equal(e.end, "2026-10-30T00:00:00.000Z");
  assert.equal(e.cost, 0);
  assert.equal(e.venue, "Central Library");
  assert.equal(e.address, "710 W Cesar Chavez St.");
  assert.equal(e.coordinates, undefined);
});
test("expired, cancelled and ambiguous schedule events are rejected", () => {
  assert.equal(
    parseEvent(
      html({ eventStatus: "https://schema.org/EventCancelled" }),
      item,
      now,
    ),
    null,
  );
  assert.equal(
    parseEvent(html({ startDate: "2026-10-29T18:00:00" }), item, now),
    null,
  );
  assert.equal(parseEvent(html(), item, new Date("2026-11-01")), null);
  assert.equal(parseEvent("<html>No data</html>", item, now), null);
});
test("unknown price and end are preserved; duplicate events removed", () => {
  const e = parseEvent(
    html({ isAccessibleForFree: undefined, endDate: undefined }),
    item,
    now,
  );
  assert.equal(e.cost, null);
  assert.equal(e.end, undefined);
  assert.equal(deduplicate([e, { ...e, id: "duplicate" }]).length, 1);
});

test("published event summaries omit unlicensed source descriptions", () => {
  const privateProse = "Publisher text that must remain at the source";
  const event = parseEvent(html({ description: privateProse }), { ...item, description: privateProse }, now);
  assert.ok(!event.description.includes(privateProse));
  assert.match(event.description, /Check the original listing/);
});
