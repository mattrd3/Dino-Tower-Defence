const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
  },
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 4173',
    port: 4173,
    reuseExistingServer: true,
  },
});
