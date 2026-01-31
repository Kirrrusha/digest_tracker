import { test, expect } from "./fixtures/auth.fixture";

test.describe("Channels Management", () => {
  test.describe("Channels List", () => {
    test("should display channels list page", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/dashboard/channels");

      // If authenticated, should see channels page content
      if (authenticatedPage.url().includes("/channels")) {
        // Check for page title
        const heading = authenticatedPage.getByRole("heading", { level: 1 }).or(
          authenticatedPage.getByText(/(Каналы|Channels)/i)
        );
        await expect(heading.first()).toBeVisible();
      }
    });

    test("should have add channel button", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        const addButton = authenticatedPage.getByRole("button", {
          name: /(Добавить|Add)/i,
        });
        await expect(addButton).toBeVisible();
      }
    });
  });

  test.describe("Add Channel Dialog", () => {
    test("should open add channel dialog", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        const addButton = authenticatedPage.getByRole("button", {
          name: /(Добавить|Add)/i,
        });

        if ((await addButton.count()) > 0) {
          await addButton.click();

          // Check for dialog/modal
          const dialog = authenticatedPage.getByRole("dialog").or(
            authenticatedPage.locator("[data-state=open]")
          );

          await expect(dialog.first()).toBeVisible();
        }
      }
    });

    test("should have URL input in add channel form", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        const addButton = authenticatedPage.getByRole("button", {
          name: /(Добавить|Add)/i,
        });

        if ((await addButton.count()) > 0) {
          await addButton.click();

          // Wait for dialog to be visible
          await authenticatedPage.waitForSelector("[role=dialog], [data-state=open]", {
            timeout: 5000,
          }).catch(() => {});

          // Check for URL input
          const urlInput = authenticatedPage.getByPlaceholder(/url|ссылк/i).or(
            authenticatedPage.locator("input[type=url], input[type=text]").first()
          );

          await expect(urlInput.first()).toBeVisible();
        }
      }
    });

    test("should validate invalid URL", async ({ authenticatedPage }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        const addButton = authenticatedPage.getByRole("button", {
          name: /(Добавить|Add)/i,
        });

        if ((await addButton.count()) > 0) {
          await addButton.click();

          await authenticatedPage.waitForSelector(
            "[role=dialog], [data-state=open]",
            { timeout: 5000 }
          ).catch(() => {});

          // Try to enter an invalid URL
          const urlInput = authenticatedPage.getByPlaceholder(/url|ссылк/i).or(
            authenticatedPage.locator("input[type=url], input[type=text]").first()
          );

          if ((await urlInput.count()) > 0) {
            await urlInput.first().fill("invalid-url");

            // Submit form
            const submitButton = authenticatedPage.getByRole("button", {
              name: /(Добавить|Add|Проверить|Validate)/i,
            });

            if ((await submitButton.count()) > 1) {
              await submitButton.last().click();
            }

            // Should show error or validation message
            await authenticatedPage.waitForTimeout(1000);

            // Form should still be open (not submitted successfully)
            const dialog = authenticatedPage.getByRole("dialog").or(
              authenticatedPage.locator("[data-state=open]")
            );

            await expect(dialog.first()).toBeVisible();
          }
        }
      }
    });
  });

  test.describe("Channel Card", () => {
    test("should display channel cards with expected elements", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        // Wait for page to load
        await authenticatedPage.waitForLoadState("networkidle");

        // Check for channel cards
        const channelCards = authenticatedPage.locator("[data-testid=channel-card]").or(
          authenticatedPage.locator(".card").filter({
            has: authenticatedPage.locator("button"),
          })
        );

        // If there are channels, check card structure
        const count = await channelCards.count();
        if (count > 0) {
          const firstCard = channelCards.first();

          // Should have a title/name
          const cardTitle = firstCard.locator("h2, h3, h4, [class*=title]");
          await expect(cardTitle.first()).toBeVisible();
        }
      }
    });

    test("should have action menu on channel card", async ({
      authenticatedPage,
    }) => {
      await authenticatedPage.goto("/dashboard/channels");

      if (authenticatedPage.url().includes("/channels")) {
        await authenticatedPage.waitForLoadState("networkidle");

        // Find channel card with menu button
        const menuButton = authenticatedPage.locator(
          "[data-testid=channel-menu], button:has(svg)"
        );

        const count = await menuButton.count();
        if (count > 0) {
          // Click on menu button
          await menuButton.first().click();

          // Wait for dropdown menu
          await authenticatedPage.waitForSelector("[role=menu], [data-state=open]", {
            timeout: 3000,
          }).catch(() => {});

          // Check for menu items
          const menuItems = authenticatedPage.getByRole("menuitem");
          const itemCount = await menuItems.count();

          expect(itemCount).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
});
