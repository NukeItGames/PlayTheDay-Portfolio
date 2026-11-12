# Publication audit

Reviewed November 12, 2026. This records a bounded source and dependency review, not a guarantee against every possible vulnerability.

## Scope and confidentiality

Reviewed the complete checked-in source tree: routes, game rules, persistence, event ingestion and caches, location/photo services, native/web maps, screens, tests, build configuration, CI, developer scripts, and image assets. The portfolio was assembled in a separate directory from a source snapshot. No prior commits, Git metadata, remotes, local runtime state, environment files, personal photos, or private reports were copied into publication history.

Gitleaks 8.30.1 (official release with verified SHA-256 download checksum) found no secrets in the source snapshot. The exact publication snapshot passed Gitleaks and a supplemental every-file review: 60 files, including seven PNGs. Checks covered credentials, personal contact information, private filesystem paths, credential files, symlinks, and unexpected binary/configuration content. PNG assets and genuine app screenshots were inspected; retained images have no EXIF or text metadata. Only fictional test character names, public city/venue information, and public program facts are included. No private personal data or working credentials were identified.

Local assistant configuration, assistant instructions that described a different route layout, an unused template splash image, historical testing narratives, and private-repository URLs were excluded. Generated output, node_modules, reports, local settings/credentials, and environment files are ignored. Public Expo configuration requires no keys. Git commits use the owner's public GitHub noreply identity.

## Ownership and assets

The source declares MIT licensing; GitHub contributor metadata lists NukeItGames. The existing Expo notice remains intact, with application attribution added. The controller assets match the included geometric-art generator, and the UI draws its avatar/skyline in code. No purchased artwork or external photography is included.

No redistribution license for library event descriptions was documented. To resolve that issue, both caches and the importer use an original neutral summary instead of copied descriptions. A regression test checks that source prose cannot re-enter the published event summary. Public factual listings retain source links; third-party data and trademarks are not relicensed as application code. Map attribution remains visible. See `THIRD_PARTY_NOTICES.md` and the complete lockfile license inventory in `docs/DEPENDENCIES.csv`.

## Dependency remediation

The initial npm audit reported 17 affected package entries (2 high, 13 moderate, 2 low; including inherited findings). Compatible updates patched Expo CLI/configuration tooling, XML parsing, glob, deepmerge, node-forge, and CLI Zod dependencies. Native modules were aligned through Expo's SDK-aware installer. Application validation remains on Zod 4; no forced replacement of CLI Zod 3 was used.

The remaining minimatch advisory (GHSA-g3hv-75wg-m249) required a targeted override for versions `>=7 <11` to patched `^11.0.8`. Older minimatch 3 instances are outside that advisory and remain unchanged. The existing decode-uri-component override is retained. Full type, lint, unit, Expo compatibility, build, and browser checks passed with the resolved tree. The final npm audit reports zero known vulnerabilities. This is a point-in-time result; re-run the audit as advisories change.

The web map iframe no longer grants same-origin privileges to its remotely loaded script. Leaflet remains version-pinned with integrity checks; message handling validates source and coordinates. Network requests, storage, optional permissions, and the absence of server-side verification are documented in the README.

## Publication boundary

Only reviewed staged files are eligible for publication. The new repository begins with a new root commit and has no connection to private source history. The original private repository is read only throughout this workflow; its visibility, branch head, and local worktree are checked again after publication. No source pushes or settings changes are authorized or performed.
