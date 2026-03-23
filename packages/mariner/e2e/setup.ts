import { test as base } from '@playwright/test'

// Pinia 3 accesses localStorage on init which throws on about:blank.
// Navigate to the dev server first to give the page a proper origin.

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (baseURL) {
      await page.goto(baseURL)
    }
    await use(page)
  },
})

export { expect } from '@playwright/test'
