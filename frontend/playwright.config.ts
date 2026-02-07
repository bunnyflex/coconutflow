import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: {
    command: 'echo "Using existing dev server"',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
