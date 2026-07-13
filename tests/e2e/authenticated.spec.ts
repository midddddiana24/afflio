import { expect, test } from "@playwright/test";

test("client campaign and billing workspace", async ({ page }) => {
  test.skip(!process.env.E2E_CLIENT_EMAIL || !process.env.E2E_CLIENT_PASSWORD, "Set E2E client credentials.");
  await page.goto("/login"); await page.getByLabel("Email").fill(process.env.E2E_CLIENT_EMAIL!); await page.getByLabel("Password").fill(process.env.E2E_CLIENT_PASSWORD!); await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/); await page.goto("/dashboard/campaigns"); await expect(page.getByRole("heading", { name: /Campaign/i }).first()).toBeVisible(); await page.goto("/dashboard/billing"); await expect(page.getByText("Current subscription")).toBeVisible();
});

test("admin moderation workspace", async ({ page }) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD, "Set E2E admin credentials.");
  await page.goto("/login"); await page.getByLabel("Email").fill(process.env.E2E_ADMIN_EMAIL!); await page.getByLabel("Password").fill(process.env.E2E_ADMIN_PASSWORD!); await page.getByRole("button", { name: "Log in" }).click(); await page.goto("/admin/flags"); await expect(page.getByRole("heading", { name: "Flags" })).toBeVisible();
});
