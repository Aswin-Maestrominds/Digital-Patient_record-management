import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: 'mobile.spec.ts',
  timeout: 45000,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:3107',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node ../backend/tests/browser-server.cjs',
      url: 'http://127.0.0.1:5107/health',
      timeout: 120000,
      reuseExistingServer: false,
    },
    {
      command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 3107',
      url: 'http://127.0.0.1:3107',
      timeout: 30000,
      env: { API_PROXY_TARGET: 'http://127.0.0.1:5107' },
      reuseExistingServer: false,
    },
  ],
});
