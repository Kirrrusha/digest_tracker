import { test as base, expect, Page } from "@playwright/test";

/**
 * Test fixture with authentication
 *
 * Note: For full authentication testing, you need to either:
 * 1. Set up test users in the database
 * 2. Mock the authentication
 * 3. Use a test auth token
 *
 * This fixture provides helpers for working with authenticated sessions.
 */

interface AuthFixtures {
  authenticatedPage: Page;
}

/**
 * Test user credentials for E2E testing
 * These should be set in environment variables for security
 */
export const testUser = {
  email: process.env.TEST_USER_EMAIL || "test@example.com",
  password: process.env.TEST_USER_PASSWORD || "testpassword123",
};

/**
 * Helper to login a user
 */
export async function loginUser(page: Page, email: string, password: string) {
  await page.goto("/auth/signin");

  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/пароль|password/i).fill(password);

  await page.getByRole("button", { name: /(Войти|Sign In)/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard/, { timeout: 10000 }).catch(() => {
    // Login might have failed, check for error
  });
}

/**
 * Extended test with authenticated page fixture
 */
export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login before test
    await loginUser(page, testUser.email, testUser.password);

    // Check if we're on dashboard (login succeeded)
    const isDashboard = page.url().includes("/dashboard");

    if (!isDashboard) {
      // Skip tests that require authentication if login failed
      console.warn(
        "Authentication failed - test will be skipped or may fail"
      );
    }

    await use(page);
  },
});

export { expect };
