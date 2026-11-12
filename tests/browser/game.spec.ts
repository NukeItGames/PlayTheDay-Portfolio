import { test, expect, Page } from "@playwright/test";
import cache from "../../src/data/events.json";
test.beforeEach(async ({ page }) => {
  // Test the checked-in schedule deterministically, even after its real dates expire.
  await page.clock.setFixedTime(new Date(cache.refreshedAt!));
});
const key = "playtheday:game:v1";
async function saved(page: Page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || "{}"), key);
}
async function onboard(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start Adventure", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill("Ari");
  await page.getByRole("button", { name: "Fresh mint", exact: true }).click();
  await page.getByRole("button", { name: "Night owl", exact: true }).click();
  await page
    .getByRole("button", { name: "Let’s play the day", exact: true })
    .click();
  await expect(page.getByText("Your everyday, upgraded.")).toBeVisible();
}
test("complete daily adventures, level up, equip rewards, journal, weekly claim, reload and leaderboard", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await onboard(page);
  expect((await saved(page)).player).toMatchObject({
    username: "Ari",
    face: "cool",
    color: "mint",
  });
  await page.screenshot({
    path: `artifacts/${info.project.name}-home.png`,
    fullPage: true,
  });
  const cards = page.getByRole("button", { name: /, \d+ XP, available$/ });
  await expect(cards).toHaveCount(5);
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    await page
      .getByRole("button", { name: /, \d+ XP, available$/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Accept Quest", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Place visited" })
      .fill(`Place ${i % 3}`);
    await page.getByRole("button", { name: /^Complete Quest/ }).click();
    await expect(
      page.getByRole("button", { name: "Close quest", exact: true }),
    ).toHaveCount(0);
  }
  const after = await saved(page);
  expect(after.journal).toHaveLength(5);
  expect(after.xp).toBe(
    after.journal.reduce((sum: number, j: { xp: number }) => sum + j.xp, 0),
  );
  await page
    .getByRole("button", { name: /, \d+ XP, completed$/ })
    .first()
    .click();
  await expect(
    page.getByText("Adventure complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Complete Quest/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close quest" }).click();
  await page.getByRole("button", { name: "Visit your wardrobe" }).click();
  await page
    .getByRole("button", { name: "Equip", exact: true })
    .first()
    .click();
  await expect.poll(async () => (await saved(page)).player.color).toBe("violet");
  await page.getByRole("button", { name: "Open Adventure Journal" }).click();
  await expect(page.getByRole("button", { name: /^Read / })).toHaveCount(5);
  await page
    .getByRole("button", { name: /^Read / })
    .first()
    .click();
  await expect(
    page.getByText(/Self-reported — not independently verified/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close journal entry" }).click();
  await page.getByRole("button", { name: "Quests", exact: true }).click();
  await page.getByRole("button", { name: "Weekly", exact: true }).click();
  await page
    .getByRole("button", { name: "Claim reward", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Claimed", exact: true }),
  ).toHaveCount(1);
  expect((await saved(page)).xp).toBe(after.xp + 250);
  await page.getByRole("button", { name: "Leaderboard", exact: true }).click();
  await expect(page.getByText("Ari (you)", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Ari (you)", { exact: true })).toBeVisible();
  expect((await saved(page)).journal).toHaveLength(5);
  expect((await saved(page)).player.color).toBe("violet");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /, \d+ XP, completed$/ }),
  ).toHaveCount(5);
  expect(errors).toEqual([]);
});
test("real event quests, discovery filters, source and Maps links, city selection, offline refresh", async ({
  page,
  context,
}) => {
  await onboard(page);
  await page.getByRole("button", { name: "Events", exact: true }).click();
  const cards = page.getByRole("button", { name: /, 150 XP, available$/ });
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  await expect(
    page.getByRole("button", { name: "View Event", exact: true }),
  ).toBeVisible();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "View Event", exact: true }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain("library.austintexas.gov");
  await popup.close();
  await page.getByRole("button", { name: "Accept Quest", exact: true }).click();
  await page.getByRole("button", { name: "Close quest" }).click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page
    .getByRole("button", { name: "What Can I Do Right Now?", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "30 minutes", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "2 hours", exact: true }).click();
  await page.getByRole("button", { name: "Under $20", exact: true }).click();
  await page
    .getByRole("button", { name: "Anywhere in city", exact: true })
    .click();
  const ordinary = page
    .getByRole("button", { name: /, (75|100) XP, available$/ })
    .first();
  await ordinary.click();
  await page.getByRole("button", { name: "Choose a place", exact: true }).click();
  await expect(page.getByText("Choose location", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm Location", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Cancel location selection" }).click();
  await page.getByRole("button", { name: "Close quest" }).click();
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await context.setOffline(true);
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(
    page
      .getByText("Could not refresh. Showing the saved event schedule.")
      .filter({ visible: true })
      .first(),
  ).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Profile", exact: true }).click();
  await page.getByRole("textbox", { name: "Edit username" }).fill("Riley");
  await page.getByRole("button", { name: "Dallas", exact: true }).click();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect.poll(async () => (await saved(page)).player.city).toBe('Dallas, Texas');
  await page.getByRole("button", { name: "Events", exact: true }).click();
  await expect(
    page.getByText("This city is next on our map").filter({ visible: true }),
  ).toBeVisible();
});
test("GPS denial falls back, browser photo persists and can be removed", async ({
  page,
  context,
}) => {
  await context.clearPermissions();
  await context.grantPermissions([], { origin: "http://127.0.0.1:4173" });
  await onboard(page);
  await page.getByRole("button", { name: "Quests", exact: true }).click();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page.getByRole("button", { name: /^A library with a view,/ }).click();
  await page.getByRole("button", { name: "Accept Quest", exact: true }).click();
  await page
    .getByRole("button", { name: "GPS check-in · within 150 m", exact: true })
    .click();
  await expect(
    page.getByText(/Location permission was declined/),
  ).toBeVisible();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Choose photo", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "adventure.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(
    page.getByRole("img", { name: "Your adventure photo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Complete Quest/ }).click();
  await expect(page.getByRole('button', { name: 'Close quest', exact: true })).toHaveCount(0);
  expect((await saved(page)).journal[0].verification).toBe("Photo-submitted");
  expect((await saved(page)).journal[0].photo).toMatch(/^data:image/);
  await page.reload();
  await page
    .getByRole("button", { name: "Adventure Journal", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Read / })
    .first()
    .click();
  await expect(
    page.getByRole("img", { name: "Saved adventure photo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove saved evidence" }).click();
  await expect(
    page.getByRole("img", { name: "Saved adventure photo" }),
  ).toHaveCount(0);
  expect((await saved(page)).journal[0].photo).toBeUndefined();
  expect((await saved(page)).xp).toBe(100);
});
test("simulated GPS presence records proximity only; far-away check-in does not award XP", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 31, longitude: -97, accuracy: 10 });
  await onboard(page);
  await page.getByRole("button", { name: "Quests", exact: true }).click();
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await page.getByRole("button", { name: /^A library with a view,/ }).click();
  await page.getByRole("button", { name: "Accept Quest", exact: true }).click();
  await page
    .getByRole("button", { name: "GPS check-in · within 150 m", exact: true })
    .click();
  await expect(page.getByText(/Check-in not confirmed/)).toBeVisible();
  expect((await saved(page)).xp).toBe(0);
  await context.setGeolocation({
    latitude: 30.266101984,
    longitude: -97.751692979,
    accuracy: 10,
  });
  await page
    .getByRole("button", { name: "GPS check-in · within 150 m", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Proximity confirmed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Complete Quest/ }).click();
  await expect(page.getByRole('button', { name: 'Close quest', exact: true })).toHaveCount(0);
  const state = await saved(page);
  expect(state.journal[0].verification).toBe("GPS proximity-confirmed");
  expect(state.xp).toBe(100);
  expect(state.journal[0].latitude).toBeUndefined();
});
