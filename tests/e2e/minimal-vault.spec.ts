import { expect, test } from "@playwright/test";

test("public vault renders homepage and nested pages", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Welcome to Silica" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Auth notes" }).first()).toBeVisible();
  await expect(page.locator('img[src="/silica/images/sample.svg"]')).toBeVisible();

  await page.getByRole("link", { name: "Auth notes" }).first().click();
  await expect(page).toHaveURL(/\/notes\/auth$/);
  await expect(page.getByRole("heading", { name: "Auth notes" }).first()).toBeVisible();
  await expect(page.getByText("Google OAuth")).toBeVisible();
});

test("search API returns matching private server index results", async ({ request }) => {
  const response = await request.get("/api/search?q=oauth");
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    results: Array<{ slug: string; title: string; excerpt: string }>;
  };
  expect(payload.results[0]).toMatchObject({
    slug: "notes/auth",
    title: "Auth notes",
  });
  expect(payload.results[0]?.excerpt.toLowerCase()).toContain("oauth");
});

test("draft content is excluded from direct routes", async ({ request }) => {
  const response = await request.get("/drafts/hidden");
  expect(response.status()).toBe(404);
});

test("auth-enabled cached pages redirect before content is served", async ({ request }) => {
  const response = await request.get("http://localhost:3011/", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/sign-in?callbackUrl=%2F");
});
