import { defineConfig } from '@playwright/test'
import { join } from 'node:path'

const consumer = join(process.cwd(), '.consumer-tests', 'vite')
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://127.0.0.1:4180', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: `"${process.execPath}" "${join(consumer, 'node_modules', 'vite', 'bin', 'vite.js')}" --host 127.0.0.1 --port 4180 --strictPort`,
    cwd: consumer,
    url: 'http://127.0.0.1:4180',
    reuseExistingServer: false,
  },
})
