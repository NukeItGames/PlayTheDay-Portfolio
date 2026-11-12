# Validation record

Performed November 12, 2026 on Linux with Node.js 24.22.1 and npm 11.9.0.

| Check | Result |
| --- | --- |
| Standard installation from a fresh staged-file copy, `npm ci` | Passed; 877 packages installed |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm test` | 25 passed, zero failed or skipped |
| `npm run check:expo` | Passed; SDK-compatible dependencies |
| `npx expo-doctor` | 21/21 checks passed |
| `npm run export:web` | Passed; production export generated |
| `npm run test:e2e` | 16 passed, zero failed; desktop and mobile Chromium |
| `npm audit` | Zero reported vulnerabilities after remediation |

The browser suite ran against the real production export using the repository's preview server. It exercised onboarding, five daily completions, duplicate prevention, rewards, weekly claims, journal, leaderboard, reload persistence, event/source/directions links, offline refresh fallback, photo attachment/removal, GPS success/denial/distance, and search/map selection. Screenshots in `docs/screenshots/` were captured by that suite and visually reviewed. They use a fictional character, not a real user's save.

The event suite fixes its clock to the bundled schedule retrieval date. Location tests mock geocoder responses; map loading uses real Leaflet assets. Browser GPS coordinates and the uploaded 1-pixel image are synthetic test inputs. Test passes do not establish live source freshness, real-world GPS accuracy, physical camera capture, or device durability.

Initial attempts encountered environment restrictions: the unit runner's local IPC socket required execution outside the command sandbox, and Expo Doctor's metadata fetch needed Node's supported `NODE_USE_ENV_PROXY=1` setting. Both checks subsequently passed. The source's lint BOM warning was removed, and initial Expo dependency mismatches were corrected. Build logs contain Node color-environment warnings; these did not fail the build.

## Installation verification

A separate directory containing only the staged publication files was used for standard `npm ci`, without the initial audit installation's `--ignore-scripts` flag. The installation succeeded with 877 packages installed. `npm run web -- --port 8083` started from that fresh directory. Chromium verified onboarding, the current-date expired-event empty state, profile deep links, and zero page errors on both that development server and the production preview. npm reported deprecation notices for ESLint 9 and whatwg-encoding; neither blocks installation.

## Platform and service limits

- No physical Android/iOS device, Android emulator, signed native build, Windows launcher, or native camera acceptance test was run in this Linux environment.
- The October 28 bundled event schedule has expired at the actual validation date. The current-date UI correctly omits expired listings. No live event ingestion run is claimed for this audit; refresh is an optional, explicitly documented operation.
- Third-party public maps/geocoding have availability and usage limits. Multi-user deployment needs an appropriate provider or shared rate limiting.
- No automated accessibility conformance or penetration-testing certification is claimed.
