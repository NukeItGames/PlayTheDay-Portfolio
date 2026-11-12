# Third-party notices

## Application and visual assets

The source project carries an MIT license with the Expo / 650 Industries notice. That notice is retained in `LICENSE`, alongside attribution for NukeItGames application changes. The portfolio contains a fresh source snapshot without previous Git commits or contributor metadata.

The controller icons in `assets/` are simple geometric artwork matching the included `scripts/generate-icons.py` utility. The unused template splash asset was excluded. Avatars and skyline illustrations are drawn with React Native views in `src/ui/components.tsx`. No stock photography, private screenshots, or purchased art is included. README screenshots show the actual app with fictional test data.

## Libraries and fonts

Dependencies retain their own licenses; the MIT application license does not replace them. `package-lock.json` records exact versions and package integrity hashes. `docs/DEPENDENCIES.csv` inventories the lockfile's package/license declarations. Installations obtain the original license files from npm packages.

- **Expo / React Native / React / Expo Router**: MIT. Existing Expo copyright notice retained.
- **Ionicons**, loaded through `@expo/vector-icons`: MIT (ionic-team/ionicons). The app imports the Ionicons set, not every bundled font family.
- **Leaflet 1.9.4**, loaded from unpkg with pinned URLs and Subresource Integrity: BSD-2-Clause. Copyright 2010–2023 Vladimir Agafonkin; copyright 2010–2011 CloudMade. See https://github.com/Leaflet/Leaflet/blob/v1.9.4/LICENSE.
- **Pillow**, used only by the optional icon generator: https://pillow.readthedocs.io/en/stable/about.html#license. Not needed to run the app.

The inventory includes permissive, attribution, and weak-copyleft packages. MPL-2.0 dependency files are not modified or vendored here; upstream source remains available through their package repositories. `node-forge` is dual licensed BSD-3-Clause OR GPL-2.0 and can be used under BSD-3-Clause. Preserve relevant upstream notices when redistributing compiled applications or dependencies.

## Maps and geocoding

Map data © OpenStreetMap contributors, available under the Open Database License (ODbL): https://www.openstreetmap.org/copyright. Tile imagery is provided by OpenStreetMap; attribution is visible on the map. No tiles or geocoder result database is committed. Respect the service policies linked in the README.

The fixed Austin Central Library destination comes from City of Austin's public library-location dataset: https://data.austintexas.gov/d/tc36-hn4j/visualization. The committed values describe a public venue, not a person's location.

## Public event listings

The event cache contains factual schedules, venue/address fields, event titles, and links from Austin Public Library's public feed and event-page structured metadata: https://library.austintexas.gov/events-feed.xml. The cache records its retrieval date. No publisher images, contact details, attendee lists, or descriptive excerpts are redistributed. Neutral descriptions direct users to the original listing. Public accessibility and robots permission do not grant a blanket copyright license; the importer deliberately omits expressive descriptions.

Event names, third-party names, and marks remain with their owners. No affiliation or endorsement is claimed. The repository's MIT license covers application code and original assets, not third-party data, marks, map content, or dependencies.
