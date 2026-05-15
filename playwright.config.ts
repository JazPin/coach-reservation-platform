import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    headless: false,
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
