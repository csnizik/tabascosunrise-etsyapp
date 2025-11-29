import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Global teardown runs once after all tests
 * Use this for cleanup
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Running global teardown...')

  // Clean up auth directory
  const authDir = path.join(process.cwd(), '.auth')
  if (fs.existsSync(authDir)) {
    fs.rmSync(authDir, { recursive: true, force: true })
  }

  console.log('✅ Global teardown complete')
}

export default globalTeardown
