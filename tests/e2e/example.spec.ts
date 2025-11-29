import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load successfully', async ({ page }) => {
    // Navigate to home page
    await page.goto('/')

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')

    // Take screenshot
    await page.screenshot({
      path: 'tests/screenshots/landing-page-initial.png',
      fullPage: true,
    })

    // Verify page title
    await expect(page).toHaveTitle(/TabascoSunrise/)

    // Verify key elements exist
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should show Connect to Etsy button', async ({ page }) => {
    await page.goto('/')

    const connectButton = page.getByRole('link', { name: /connect to etsy/i })
    await expect(connectButton).toBeVisible()

    // Screenshot with button highlighted
    await page.screenshot({
      path: 'tests/screenshots/landing-page-connect-button.png',
    })
  })
})
