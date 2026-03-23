import { test, expect } from './setup'
import path from 'node:path'
import { VUE_IMPORTMAP, reactPreamble, SCREENSHOT_STYLES } from './helpers'

const DEV = 'http://localhost:3000'
const REACT_PREAMBLE = reactPreamble(DEV)
const screenshotsDir = path.join(import.meta.dirname, 'screenshots')

test.use({ viewport: { width: 1024, height: 1024 } })

test.describe('screenshots', () => {
  test('full page with all apps mounted', async ({ page }) => {
    await page.setContent(`
      ${VUE_IMPORTMAP}
      ${REACT_PREAMBLE}
      ${SCREENSHOT_STYLES}
      <div class="app-section">
        <div class="app-label">App 1 (Vue)</div>
        <div id="app1"></div>
      </div>
      <div class="app-section">
        <div class="app-label">App 2 (Vue)</div>
        <div id="app2"></div>
      </div>
      <div class="app-section">
        <div class="app-label">App 3 (React)</div>
        <div id="app3"></div>
      </div>
      <script type="module">
        const [{ navigator: nav1 }, { navigator: nav2 }, { navigator: nav3 }] = await Promise.all([
          import('${DEV}/app1/navigator.js'),
          import('${DEV}/app2/navigator.js'),
          import('${DEV}/app3/navigator.js'),
        ])
        nav1.mount('#app1')
        nav2.mount('#app2')
        nav3.mount('app3')
      </script>
    `)

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="cargo-greeting"]')).toContainText('Hello from server', { timeout: 15000 })
    await expect(page.locator('#app2')).not.toBeEmpty({ timeout: 30000 })
    await expect(page.locator('#app3 h1')).toContainText('Vite + React', { timeout: 30000 })

    await page.screenshot({
      path: path.join(screenshotsDir, 'main-page.jpeg'),
      type: 'jpeg',
      quality: 90,
      fullPage: true,
    })
  })
})
