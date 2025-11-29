import { chromium, FullConfig } from '@playwright/test'
import path from 'path'
import fs from 'fs'

/**
 * Global setup runs once before all tests
 * Use this to prepare authentication, seed data, etc.
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 Running global setup...')

  // Create directories for artifacts
  const authDir = path.join(process.cwd(), '.auth')
  const screenshotsDir = path.join(process.cwd(), 'tests/screenshots')
  const resultsDir = path.join(process.cwd(), 'test-results')

  ;[authDir, screenshotsDir, resultsDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  // Optional: Set up authenticated state
  // Uncomment when OAuth is fully working
  /*
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Perform authentication
  await page.goto('http://localhost:3000/api/auth/etsy/authorize');
  // ... complete OAuth flow ...

  // Save authenticated state
  await context.storageState({ path: path.join(authDir, 'user.json') });
  await browser.close();
  */

  console.log('✅ Global setup complete')
}

export default globalSetup
