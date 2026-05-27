import { expect, test } from "@playwright/test";

test("public vault renders homepage and nested pages", async ({ request }) => {
  const home = await request.get("/");
  expect(home.ok()).toBe(true);
  const homeHtml = await home.text();
  expect(homeHtml).toContain("Silica");
  expect(homeHtml).toContain("Authentication");

  const auth = await request.get("/auth");
  expect(auth.ok()).toBe(true);
  const authHtml = await auth.text();
  expect(authHtml).toContain("Authentication");
  expect(authHtml).toContain("Google OAuth");
});

test("search API returns matching private server index results", async ({
  request,
}) => {
  const response = await request.get("/api/search?q=oauth");
  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    results: Array<{ slug: string; title: string; excerpt: string }>;
  };
  expect(payload.results[0]).toMatchObject({
    slug: "auth",
    title: "Authentication",
  });
  expect(payload.results[0]?.excerpt.toLowerCase()).toContain("oauth");
});

test("custom frontmatter renders as page properties", async ({ request }) => {
  const response = await request.get("/writing/frontmatter");
  expect(response.ok()).toBe(true);

  const html = await response.text();
  expect(html).toContain('data-slot="page-properties"');
  expect(html).toContain(">Page Properties<");
  expect(html).toContain(">featured<");
  expect(html).toContain(">true<");
});

test("draft content is excluded from direct routes", async ({ request }) => {
  const response = await request.get("/drafts/hidden");
  expect(response.status()).toBe(404);
});

test("auth-enabled cached pages redirect before content is served", async ({
  request,
}) => {
  const response = await request.get("http://localhost:3011/", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("/sign-in?callbackUrl=%2F");
});
