import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for TabascoSunrise Etsy App
 *
 * This config enables Copilot Coding Agent to:
 * - Run e2e tests automatically
 * - Capture screenshots for PR validation
 * - Test across multiple browsers
 * - Generate comprehensive reports
 */
export default defineConfig({
  // Test directory structure
  testDir: './tests/e2e',

  // Snapshots/screenshots location
  snapshotDir: './tests/screenshots',

  // Global timeout for each test
  timeout: 30 * 1000, // 30 seconds per test

  // Expect timeout for assertions
  expect: {
    timeout: 5000, // 5 seconds for expect() assertions
  },

  // Fail fast in CI - stop after first failure
  fullyParallel: !process.env.CI,

  // Forbid test.only in CI
  forbidOnly: !!process.env.CI,

  // Retry failed tests in CI
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers in CI for stability
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    // Console output for CI/terminal
    ['list'],

    // HTML report for detailed review
    [
      'html',
      {
        outputFolder: 'playwright-report',
        open: 'never', // Don't auto-open in CI
      },
    ],

    // JSON report for programmatic analysis
    [
      'json',
      {
        outputFile: 'test-results/results.json',
      },
    ],

    // JUnit for CI/CD integration
    [
      'junit',
      {
        outputFile: 'test-results/junit.xml',
      },
    ],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for navigation
    baseURL: process.env.BASE_URL || 'http://localhost:3000',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Artifacts on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Timeouts
    actionTimeout: 10 * 1000, // 10 seconds for actions (click, fill, etc)
    navigationTimeout: 15 * 1000, // 15 seconds for page loads

    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,

    // Locale and timezone
    locale: 'en-US',
    timezoneId: 'America/Chicago', // Louisiana timezone

    // Device emulation
    isMobile: false,
    hasTouch: false,
  },

  // Projects for different browsers/scenarios
  projects: [
    // Setup project - runs first to prepare auth state
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },

    // Desktop Chrome (primary)
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Always capture screenshots for this browser
        screenshot: 'on',
      },
      dependencies: ['setup'], // Wait for setup to complete
    },

    // Desktop Firefox (for cross-browser validation)
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        screenshot: 'only-on-failure',
      },
    },

    // Desktop Safari (WebKit)
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        screenshot: 'only-on-failure',
      },
    },

    // Mobile Chrome (responsive testing)
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        screenshot: 'on',
      },
    },

    // Mobile Safari (iOS testing)
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        screenshot: 'on',
      },
    },

    // Authenticated state tests (uncomment when OAuth is working)
    // {
    //   name: 'authenticated',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     // Storage state will be set up by global setup
    //     storageState: '.auth/user.json',
    //   },
    //   dependencies: ['setup'], // Run after setup project
    // },
  ],

  // Web server configuration for local dev
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120 * 1000, // 2 minutes for server startup
    reuseExistingServer: !process.env.CI, // Reuse in dev, fresh in CI
    stdout: 'ignore', // Don't pollute test output
    stderr: 'pipe', // Show errors
    env: {
      NODE_ENV: 'test',
    },
  },

  // Output directories
  outputDir: 'test-results/',

  // Global setup/teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
})
