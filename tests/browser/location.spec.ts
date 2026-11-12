import { test, expect, Page } from "@playwright/test";

const key = "playtheday:game:v1";
const place = {
  lat: "30.2661",
  lon: "-97.7517",
  name: "Austin Central Library",
  display_name: "Austin Central Library, 710 W Cesar Chavez St, Austin, Texas",
  address: { city: "Austin", state: "Texas" },
};
async function saved(page: Page) {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) || "{}"),
    key,
  );
}
async function onboard(page: Page) {
  await page.route("https://nominatim.openstreetmap.org/**", (route) =>
    route.fulfill({
      json: route.request().url().includes("/search?") ? [place] : place,
    }),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start Adventure", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("Location tester");
  await page
    .getByRole("button", { name: "Let’s play the day", exact: true })
    .click();
  await expect(page.getByText("Your everyday, upgraded.")).toBeVisible();
}
async function openPicker(page: Page) {
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page
    .getByRole("button", { name: /^(Choose|Change) Location$/, exact: true })
    .click();
}
async function searchPlace(page: Page) {
  await page
    .getByRole("textbox", { name: "Search city, address, or place" })
    .fill("Austin Central Library");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("button", { name: "Select Austin Central Library", exact: true })
    .click();
}

test("manual search, map pin, cancel, persistence and nearby discovery require no GPS", async ({
  page,
}) => {
  let gpsCalls = 0;
  await page.exposeFunction("recordGpsCall", () => {
    gpsCalls++;
  });
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = () => {
      (window as unknown as { recordGpsCall: () => void }).recordGpsCall();
    };
  });
  await onboard(page);
  const before = await saved(page);
  await openPicker(page);
  await expect(
    page.getByRole("button", { name: "Confirm Location" }),
  ).toBeDisabled();
  await searchPlace(page);
  await expect(
    page.getByText("30.26610, -97.75170", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm Location" }).click();
  await expect
    .poll(async () => (await saved(page)).selectedLocation?.name)
    .toBe(place.name);
  await expect(
    page.getByRole("button", { name: /^A library with a view,/ }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: "Change Location", exact: true })
    .click();
  await expect(
    page.getByText("30.26610, -97.75170", { exact: true }),
  ).toBeVisible();
  const map = page.frameLocator('iframe[title="Location map"]');
  await expect(map.locator(".leaflet-container")).toBeVisible({
    timeout: 20000,
  });
  await map.locator("#map").click({ position: { x: 160, y: 100 } });
  await expect(
    page.getByText("30.26610, -97.75170", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel location selection" }).click();
  expect((await saved(page)).selectedLocation.latitude).toBe(30.2661);
  expect((await saved(page)).xp).toBe(before.xp);
  expect((await saved(page)).journal).toEqual(before.journal);
  expect(gpsCalls).toBe(0);
});

test("accepted quest gets a persistent destination, external directions, and keeps it in its journal", async ({
  page,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Quests", exact: true }).click();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page.getByRole("button", { name: /^Take the scenic route,/ }).click();
  await page.getByRole("button", { name: "Accept Quest", exact: true }).click();
  await page
    .getByRole("button", { name: "Choose a place", exact: true })
    .click();
  await searchPlace(page);
  await page.getByRole("button", { name: "Confirm Location" }).click();
  await expect(
    page.getByRole("button", { name: "Get Directions", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /GPS check-in/ })).toHaveCount(
    0,
  );
  const popup = page.waitForEvent("popup");
  await page
    .getByRole("button", { name: "Get Directions", exact: true })
    .click();
  const maps = await popup;
  expect(decodeURIComponent(maps.url())).toContain(
    "destination=30.2661,-97.7517",
  );
  await maps.close();
  await page.getByRole("button", { name: /^Complete Quest/ }).click();
  await expect.poll(async () => (await saved(page)).journal.length).toBe(1);
  const after = await saved(page);
  expect(after.journal[0].quest.coordinates).toEqual({
    latitude: 30.2661,
    longitude: -97.7517,
  });
  expect(after.selectedLocation).toBeUndefined();
  await page.reload();
  expect((await saved(page)).questLocations).toEqual(after.questLocations);
  expect((await saved(page)).xp).toBe(75);
});

test("optional current location previews before confirmation and survives restart", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 30.2661,
    longitude: -97.7517,
    accuracy: 10,
  });
  await onboard(page);
  await openPicker(page);
  await page.getByRole("button", { name: "Use My Current Location" }).click();
  await expect(
    page.getByText("30.26610, -97.75170", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Confirm Location" }),
  ).toBeEnabled();
  expect((await saved(page)).selectedLocation).toBeUndefined();
  await page.getByRole("button", { name: "Confirm Location" }).click();
  await page.reload();
  expect((await saved(page)).selectedLocation).toMatchObject({
    latitude: 30.2661,
    longitude: -97.7517,
  });
  expect((await saved(page)).xp).toBe(0);
});

test("GPS denial and search failure leave manual pin selection usable", async ({
  page,
  context,
}) => {
  await context.grantPermissions([]);
  await onboard(page);
  await openPicker(page);
  await page.getByRole("button", { name: "Use My Current Location" }).click();
  await expect(
    page.getByText(/You can search or tap the map without GPS/),
  ).toBeVisible();
  await page.route("https://nominatim.openstreetmap.org/**", (route) =>
    route.abort(),
  );
  await page
    .getByRole("textbox", { name: "Search city, address, or place" })
    .fill("Unavailable address");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText(/Search unavailable/)).toBeVisible();
  const map = page.frameLocator('iframe[title="Location map"]');
  await expect(map.locator(".leaflet-container")).toBeVisible({
    timeout: 20000,
  });
  await map.locator("#map").click({ position: { x: 160, y: 100 } });
  await expect(
    page.getByRole("button", { name: "Confirm Location" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm Location" }).click();
  await expect
    .poll(async () => (await saved(page)).selectedLocation?.name)
    .toBe("Dropped pin");
});
