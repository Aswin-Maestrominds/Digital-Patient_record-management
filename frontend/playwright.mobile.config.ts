import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testMatch: 'mobile.spec.ts',
  testIgnore: [],
  projects: [
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit', channel: undefined } },
    { name: 'android-chrome', use: { ...devices['Pixel 7'], browserName: 'chromium', channel: 'chrome' } },
    { name: 'small-phone', use: { ...devices['iPhone SE'], viewport: { width: 320, height: 568 }, browserName: 'webkit', channel: undefined } },
  ],
});
