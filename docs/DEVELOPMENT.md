# Development guide

Setup, architecture, testing, external services, and privacy details for contributors. For a quick overview, see the [README](../README.md).

## Run locally

Use **Node.js 24 LTS**, npm, and Git. The dependency tree requires Node 22.13 or newer; validation for this portfolio uses Node 24.

```sh
git clone https://github.com/NukeItGames/PlayTheDay-Portfolio.git
cd PlayTheDay-Portfolio
npm ci
npm run web
```

Open the local URL printed by Expo. No API key, account, database, or environment file is required. Choose **Start Adventure**, enter a fictional name, and create your character.

For a production web preview:

```sh
npm run export:web
npm run preview:web
```

Open http://localhost:4173. The preview server binds to loopback and supports application deep links. Static hosting needs a fallback from unknown routes to `index.html`. Camera/location permissions require HTTPS or localhost.

For native development:

```sh
npm start          # Scan with an Expo Go version compatible with SDK 57
npm run android   # Requires a running Android emulator or connected device
npm run ios       # Requires macOS, Xcode, and an iOS simulator
```

Match Expo Go to the project's SDK; availability changes as Expo releases new SDKs. Physical camera/GPS behavior and native installation have not been validated in this portfolio preparation. On Windows, an optional [Android launcher](android-windows.md) is included.

## Architecture

```text
app/                  Expo Router layout and section routes
src/game/             Pure TypeScript quest, date, XP, reward, and location logic
src/store/            Shared React state, hydration, notifications, clock updates
src/services/         Storage transactions, event validation, photos, geocoding
src/ui/               React Native screens, reusable components, platform maps
src/data/events.json  Bundled factual public-event schedule
public/events.json    Web refresh endpoint copied into the production export
scripts/              Event importer, static preview server, developer utilities
tests/                Unit/integration tests and Playwright acceptance flows
```

Screens call `GameProvider`, which submits transformations to `GameStore`. The store serializes mutations and persists a complete, versioned JSON snapshot before publishing successful changes to the UI. Failed writes award no XP; later operations can retry. Zod validates saved data, and corrupt saves produce a load error without overwriting the original. Browser Web Locks coordinate updates across tabs where supported; use one tab otherwise.

Location services are separate from progression. Discovery selections and quest destinations are saved only after confirmation. A GPS check-in reads a fresh position, requires accuracy within 100 m and the entire accuracy radius within 150 m of the destination, and retains only the completion label. It confirms proximity, not attendance. Maps use Leaflet in a native WebView or a sandboxed web iframe.

## Tests and checks

```sh
npm run typecheck
npm run lint
npm test
npm run check:expo
npm run export:web
npx playwright install chromium
npm run test:e2e
```

On a minimal Linux machine, Playwright may also require `npx playwright install --with-deps chromium` with system package installation permissions. Browser tests require the production export first and start their own loopback preview server.

Unit/integration tests cover reward boundaries, daily/week rollover, duplicate completion, filtering, storage failures, concurrent mutations, migration-compatible saves, and event normalization. Browser tests exercise onboarding, progression, equipment, journal photos, reload persistence, event links, and location flows at desktop and mobile viewport sizes. GPS is simulated; geocoder responses are mocked in location tests, while the map library requires internet access. Event tests fix the clock to the bundled cache's refresh time for reproducibility.

See [validation results](VALIDATION.md) and the [publication audit](AUDIT.md) for the actual checks and their limits.

## Events and external services

The bundled schedule was retrieved on October 28, 2026 and its events have expired as of the November 12 portfolio validation. Events therefore starts empty at the current date until a successful refresh. It is a dated snapshot, not a live calendar. Expired events disappear automatically. Coverage is limited to Austin Public Library; other selectable cities still have ordinary quests. Source pages remain authoritative for registration, age suitability, accessibility, prices, and cancellations.

```sh
npm run events:refresh
```

The importer checks `robots.txt`, makes bounded sequential requests to the public RSS feed and event-page structured metadata, and writes both caches. It publishes factual fields and a neutral summary with a source link; it does not copy event descriptions or images. Failed refreshes preserve upcoming cached events and exit nonzero. Reload Expo or rebuild web after updating the cache. No live source scraping happens inside the app.

The in-app Refresh button loads `/events.json` on web. Native refresh can use an optional public HTTPS `EXPO_PUBLIC_EVENTS_URL`. `EXPO_PUBLIC_GEOCODING_URL` can select another Nominatim-compatible HTTPS endpoint. Both are bundled public configuration, **never secrets**, and browser endpoints need CORS. No configuration is required for the default demo.

## Privacy and limitations

Player names, XP, journal entries, selected destinations, and photos are stored on the device. No backend, account system, analytics, cloud sync, or background location tracking is implemented. Storage is not encrypted by this app. Removing app data or browser storage deletes progress; there is no backup/export workflow. Browser photo storage is limited, and native photo durability still needs device testing.

Search text and a coordinate-based search bias go to Nominatim; reverse lookups send the chosen coordinates. Map tiles disclose the visible map area to OpenStreetMap, and the map library loads from unpkg. Directions send the destination to Google Maps. These services receive ordinary network metadata and apply their own privacy policies. Photos and progression are not uploaded by the app.

Public OSM services are suitable only for light demo use. Geocoder requests are serialized and cached per app instance, which is not an application-wide traffic limit. A wider deployment needs an appropriate provider or shared rate-limited proxy. Respect the [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/) and [tile policy](https://operations.osmfoundation.org/policies/tiles/).

This is a working portfolio MVP. There is no trusted server clock, anti-cheat protection, multiplayer, or independent attendance/photo verification. Native bundled gameplay works without a backend; web needs connectivity on first load and has no service worker for offline reloads. Future work includes physical-device QA, broader permitted event sources, journal export, and stronger accessibility review.
