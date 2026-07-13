import { expect, test } from "@playwright/test";

test("landing and legal routes are available", async ({ page }) => {
  await page.goto("/"); await expect(page.getByRole("heading", { name: /Turn product photos/i })).toBeVisible();
  for (const route of ["/privacy", "/terms", "/refund-policy", "/contact", "/report-abuse"]) {
    const response = await page.goto(route); expect(response?.status()).toBe(200); await expect(page.locator("h1")).toBeVisible();
  }
});

test("protected routes redirect anonymous visitors", async ({ page }) => {
  await page.goto("/dashboard"); await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/admin"); await expect(page).toHaveURL(/\/login\?next=/);
});

test("password recovery form is usable", async ({ page }) => {
  await page.goto("/forgot-password"); await page.getByLabel("Email").fill("test@example.com"); await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled();
});
