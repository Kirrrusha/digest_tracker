import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.describe("Sign In Page", () => {
    test("should display the sign in form", async ({ page }) => {
      await page.goto("/auth/signin");

      // Check for email input
      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page.getByPlaceholder(/пароль|password/i);
      await expect(passwordInput).toBeVisible();

      // Check for submit button
      const submitButton = page.getByRole("button", {
        name: /(Войти|Sign In)/i,
      });
      await expect(submitButton).toBeVisible();
    });

    test("should show validation errors for empty form", async ({ page }) => {
      await page.goto("/auth/signin");

      // Click submit without filling the form
      const submitButton = page.getByRole("button", {
        name: /(Войти|Sign In)/i,
      });
      await submitButton.click();

      // Should show validation message (either browser validation or custom)
      // Check that we're still on the sign in page
      await expect(page).toHaveURL(/signin/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/signin");

      // Fill in invalid credentials
      await page.getByPlaceholder(/email/i).fill("invalid@example.com");
      await page.getByPlaceholder(/пароль|password/i).fill("wrongpassword");

      // Submit the form
      const submitButton = page.getByRole("button", {
        name: /(Войти|Sign In)/i,
      });
      await submitButton.click();

      // Should see an error message or stay on sign in page
      // Wait for either error message or page to settle
      await page.waitForLoadState("networkidle");

      // Still on sign in page (not redirected to dashboard)
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/signin|auth/);
    });

    test("should have link to sign up", async ({ page }) => {
      await page.goto("/auth/signin");

      // Check for registration link
      const signUpLink = page.getByRole("link", {
        name: /(Регистрация|Sign Up|Создать аккаунт|Create account)/i,
      });
      await expect(signUpLink).toBeVisible();
    });
  });

  test.describe("Sign Up Page", () => {
    test("should display the sign up form", async ({ page }) => {
      await page.goto("/auth/signup");

      // Check for email input
      const emailInput = page.getByPlaceholder(/email/i);
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page
        .getByPlaceholder(/пароль|password/i)
        .first();
      await expect(passwordInput).toBeVisible();

      // Check for submit button
      const submitButton = page.getByRole("button", {
        name: /(Зарегистрироваться|Sign Up|Создать)/i,
      });
      await expect(submitButton).toBeVisible();
    });

    test("should have link to sign in", async ({ page }) => {
      await page.goto("/auth/signup");

      // Check for sign in link
      const signInLink = page.getByRole("link", {
        name: /(Войти|Sign In|Уже есть аккаунт)/i,
      });
      await expect(signInLink).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to auth when accessing dashboard without login", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should redirect to sign in page
      await expect(page).toHaveURL(/signin|auth/);
    });

    test("should redirect to auth when accessing channels without login", async ({
      page,
    }) => {
      await page.goto("/dashboard/channels");

      // Should redirect to sign in page
      await expect(page).toHaveURL(/signin|auth/);
    });

    test("should redirect to auth when accessing summaries without login", async ({
      page,
    }) => {
      await page.goto("/dashboard/summaries");

      // Should redirect to sign in page
      await expect(page).toHaveURL(/signin|auth/);
    });

    test("should redirect to auth when accessing settings without login", async ({
      page,
    }) => {
      await page.goto("/dashboard/settings");

      // Should redirect to sign in page
      await expect(page).toHaveURL(/signin|auth/);
    });
  });
});
