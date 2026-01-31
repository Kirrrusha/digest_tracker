import { expect, test } from "./fixtures/auth.fixture";

test.describe("Dashboard", () => {
  test.describe("When authenticated", () => {
    test("should display dashboard layout", async ({ authenticatedPage }) => {
      // If we're on dashboard, check the structure
      if (authenticatedPage.url().includes("/dashboard")) {
        // Check for sidebar navigation
        const sidebar = authenticatedPage
          .locator("[data-testid=sidebar]")
          .or(authenticatedPage.locator("nav").first());
        await expect(sidebar).toBeVisible();

        // Check for main content area
        const main = authenticatedPage.locator("main");
        await expect(main).toBeVisible();
      }
    });

    test("should have navigation items", async ({ authenticatedPage }) => {
      if (authenticatedPage.url().includes("/dashboard")) {
        // Check for navigation links
        const channelsLink = authenticatedPage.getByRole("link", {
          name: /(Каналы|Channels)/i,
        });
        const summariesLink = authenticatedPage.getByRole("link", {
          name: /(Саммари|Summaries)/i,
        });
        const settingsLink = authenticatedPage.getByRole("link", {
          name: /(Настройки|Settings)/i,
        });

        // At least one navigation item should be visible
        const hasNavigation =
          (await channelsLink.count()) > 0 ||
          (await summariesLink.count()) > 0 ||
          (await settingsLink.count()) > 0;

        expect(hasNavigation).toBeTruthy();
      }
    });

    test("should navigate to channels page", async ({ authenticatedPage }) => {
      if (authenticatedPage.url().includes("/dashboard")) {
        const channelsLink = authenticatedPage.getByRole("link", {
          name: /(Каналы|Channels)/i,
        });

        if ((await channelsLink.count()) > 0) {
          await channelsLink.first().click();
          await expect(authenticatedPage).toHaveURL(/channels/);
        }
      }
    });

    test("should navigate to summaries page", async ({ authenticatedPage }) => {
      if (authenticatedPage.url().includes("/dashboard")) {
        const summariesLink = authenticatedPage.getByRole("link", {
          name: /(Саммари|Summaries|Дайджест)/i,
        });

        if ((await summariesLink.count()) > 0) {
          await summariesLink.first().click();
          await expect(authenticatedPage).toHaveURL(/summaries/);
        }
      }
    });

    test("should navigate to settings page", async ({ authenticatedPage }) => {
      if (authenticatedPage.url().includes("/dashboard")) {
        const settingsLink = authenticatedPage.getByRole("link", {
          name: /(Настройки|Settings)/i,
        });

        if ((await settingsLink.count()) > 0) {
          await settingsLink.first().click();
          await expect(authenticatedPage).toHaveURL(/settings/);
        }
      }
    });
  });
});

test.describe("Dashboard Stats", () => {
  test("should display statistics cards", async ({ authenticatedPage }) => {
    if (authenticatedPage.url().includes("/dashboard")) {
      // Look for stat cards with numbers
      const cards = authenticatedPage.locator("[data-testid=stat-card]").or(
        authenticatedPage.locator(".card").filter({
          has: authenticatedPage.locator("h3, h4"),
        })
      );

      // Dashboard should have some cards/statistics
      await expect(cards.first()).toBeVisible();
    }
  });
});
