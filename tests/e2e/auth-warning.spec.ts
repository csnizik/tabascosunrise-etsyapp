import { test, expect } from '@playwright/test';

test.describe('Auth Warning Styling', () => {
  test('should display authentication expired message with warning styling', async ({
    page,
  }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Mock the API status response to return token expired state
    await page.route('/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            tokenExpired: true,
            shopId: '12345678',
            sync: null,
          },
        }),
      });
    });

    // Mock the sync API to return auth error
    await page.route('/api/sync/manual', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Access token expired',
          },
        }),
      });
    });

    // Navigate again to get mocked status
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for the dashboard content to load
    await page.waitForSelector('h1:has-text("TabascoSunrise Dashboard")');

    // Take initial screenshot showing Token Expired badge
    await page.screenshot({
      path: 'tests/screenshots/auth-warning-token-expired-badge.png',
      fullPage: true,
    });

    // Verify the Token Expired badge uses warning (yellow) styling
    const tokenBadge = page.locator('span:has-text("Token Expired")');
    await expect(tokenBadge).toBeVisible();
    // The badge should have yellow/warning colors
    await expect(tokenBadge).toHaveClass(/bg-yellow/);
  });

  test('should show warning message when sync fails due to auth error', async ({
    page,
  }) => {
    // First, let's mock the status to show authenticated but not expired
    await page.route('/api/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            authenticated: true,
            tokenExpired: false,
            shopId: '12345678',
            sync: null,
          },
        }),
      });
    });

    // Mock sync to return auth error
    await page.route('/api/sync/manual', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            message: 'Access token expired',
          },
        }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for the dashboard content to load
    await page.waitForSelector('h1:has-text("TabascoSunrise Dashboard")');

    // Click the Sync Now button
    const syncButton = page.locator('button:has-text("Sync Now")');
    await expect(syncButton).toBeVisible();
    await expect(syncButton).toBeEnabled();
    await syncButton.click();

    // Wait for the warning message to appear
    const warningMessage = page.locator(
      'text=Authentication expired. Please reconnect to Etsy.'
    );
    await expect(warningMessage).toBeVisible({ timeout: 10000 });

    // Take screenshot showing warning styling
    await page.screenshot({
      path: 'tests/screenshots/auth-warning-message.png',
      fullPage: true,
    });

    // Verify the warning message container uses yellow/warning styling
    const warningContainer = page.locator('div.bg-yellow-50, div.bg-yellow-100');
    await expect(warningContainer).toBeVisible();

    // Verify the Reconnect button is present with warning styling
    const reconnectButton = page.locator('a:has-text("Reconnect to Etsy")');
    await expect(reconnectButton).toBeVisible();
    await expect(reconnectButton).toHaveClass(/bg-yellow-600/);

    // Verify warning icon (triangle) is present
    const warningIcon = page.locator('svg.text-yellow-600, svg.text-yellow-400');
    await expect(warningIcon.first()).toBeVisible();
  });
});
