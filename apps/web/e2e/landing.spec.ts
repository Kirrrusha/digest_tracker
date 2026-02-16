import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("should load the landing page", async ({ page }) => {
    await page.goto("/");

    // Check page title
    await expect(page).toHaveTitle(/DevDigest/);

    // Check main heading is visible
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should have navigation links", async ({ page }) => {
    await page.goto("/");

    // Check for sign in / sign up buttons or links
    const authButtons = page.getByRole("link").filter({
      hasText: /(Войти|Sign In|Регистрация|Sign Up)/i,
    });
    await expect(authButtons.first()).toBeVisible();
  });

  test("should navigate to auth page when clicking sign in", async ({ page }) => {
    await page.goto("/");

    // Click on sign in/login link
    const signInLink = page.getByRole("link").filter({
      hasText: /(Войти|Sign In)/i,
    });

    if ((await signInLink.count()) > 0) {
      await signInLink.first().click();
      await expect(page).toHaveURL(/\/(auth|login|signin)/i);
    }
  });

  test("should be responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Page should still be functional
    await expect(page.locator("h1")).toBeVisible();
  });
});

test.describe("Public Pages Accessibility", () => {
  test("should have proper page structure", async ({ page }) => {
    await page.goto("/");

    // Check for proper heading hierarchy
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Check for main landmark
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });
});
