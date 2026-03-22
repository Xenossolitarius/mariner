import { test, expect } from './setup'
import path from 'node:path'

const DEV = 'http://localhost:3000'
const screenshotsDir = path.join(import.meta.dirname, 'screenshots')

const VUE_PREAMBLE = `
  <script type="importmap">
    { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
  </script>
`

const REACT_PREAMBLE = `
  <script type="module">
    import RefreshRuntime from '${DEV}/app3/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
`

test.use({ viewport: { width: 1024, height: 1024 } })

test.describe('screenshots', () => {
  test('full page with all apps mounted', async ({ page }) => {
    await page.setContent(`
      ${VUE_PREAMBLE}
      ${REACT_PREAMBLE}
      <style>
        body { margin: 0; font-family: system-ui, sans-serif; background: #242424; color: #fff; }
        .app-section { padding: 2rem; border-bottom: 1px solid #333; }
        .app-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
      </style>
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
