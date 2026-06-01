import { test, expect } from "@playwright/test";

test("discover page visual snapshot", async ({ page }) => {
  await page.goto("/discover");

  await page.waitForLoadState("networkidle");

  await expect(page).toHaveScreenshot("discover-page.png", {
    fullPage: true,
  });
});

test("clicking like button advances to the next card", async ({ page }) => {
  await page.goto("/discover");
  await page.waitForLoadState("networkidle");

  const cardTitle = page.locator("h2").first();
  const firstTitle = await cardTitle.textContent();

  await page.getByRole("button", { name: "Like" }).click();

  await expect(cardTitle).not.toHaveText(firstTitle!);
});
