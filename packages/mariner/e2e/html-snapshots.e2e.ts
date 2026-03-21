import { test, expect } from '@playwright/test'

// Snapshot tests for the rendered HTML of each app.
// Captures the DOM after mounting and compares against stored snapshots.
// Run with --update-snapshots to regenerate: npx playwright test html-snapshots --update-snapshots

const DEV = 'http://localhost:3000'

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

/** Normalize dynamic content in rendered HTML for stable snapshots */
function normalizeHtml(html: string): string {
  return (
    html
      // Vue scoped data attributes: data-v-7a7a37b1 → data-v-xxxx
      .replace(/data-v-[a-f0-9]+/g, 'data-v-xxxx')
      // Asset hashes in URLs: /app1/vue.oVO2mBjE.svg → /app1/vue.[hash].svg
      .replace(/\/([\w-]+)\.([\w_-]{6,})\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)/g, '/$1.[hash].$3')
      // Vite dep query strings: ?v=07bf322f → ?v=[hash]
      .replace(/\?v=[a-f0-9]+/g, '?v=[hash]')
      // Vite HMR timestamps: ?t=1234567890 → ?t=[ts]
      .replace(/\?t=\d+/g, '?t=[ts]')
      // Vite @fs paths vary by machine
      .replace(/@fs\/[^"']+\/dist\//g, '@fs/[path]/dist/')
      .replace(/@fs\/[^"']+\/node_modules\//g, '@fs/[path]/node_modules/')
      // Source map comments
      .replace(/\/\/# sourceMappingURL=data:[^\n]+/g, '//# sourceMappingURL=[stripped]')
      // Inline base64 data URLs for small assets
      .replace(/data:image\/[^"']+/g, 'data:image/[stripped]')
      // Trim whitespace for consistency
      .replace(/^\s+/gm, '')
      .replace(/\s+$/gm, '')
      .trim()
  )
}

test.describe('HTML snapshots — dev server', () => {
  test('app3 (React) rendered HTML', async ({ page }) => {
    await page.setContent(`
      ${REACT_PREAMBLE}
      <div id="app3"></div>
      <script type="module">
        const { navigator } = await import('${DEV}/app3/navigator.js')
        navigator.mount('app3')
      </script>
    `)

    await expect(page.locator('h1')).toContainText('Vite + React', { timeout: 15000 })

    const html = await page.locator('#app3').innerHTML()
    expect(normalizeHtml(html)).toMatchSnapshot('app3-react-dev.html')
  })

  test('app1 (Vue) rendered HTML', async ({ page }) => {
    await page.setContent(`
      ${VUE_PREAMBLE}
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('${DEV}/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    // Wait for full render including HelloWorld
    await expect(page.locator('text=Vite + Vue')).toBeVisible()

    const html = await page.locator('#app1').innerHTML()
    expect(normalizeHtml(html)).toMatchSnapshot('app1-vue-dev.html')
  })

  test('shared navigator exports (no DOM — verify module shape)', async ({ page }) => {
    await page.setContent(`
      ${VUE_PREAMBLE}
      <div id="result"></div>
      <script type="module">
        const mod = await import('${DEV}/shared/navigator.js')
        const exports = {}
        for (const [key, val] of Object.entries(mod)) {
          exports[key] = typeof val
        }
        document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toMatchSnapshot('shared-exports-dev.json')
  })

  test('multi-app rendered HTML (app1 + app3)', async ({ page }) => {
    await page.setContent(`
      ${VUE_PREAMBLE}
      ${REACT_PREAMBLE}
      <div id="app1"></div>
      <hr id="separator" />
      <div id="app3"></div>
      <script type="module">
        const [{ navigator: nav1 }, { navigator: nav3 }] = await Promise.all([
          import('${DEV}/app1/navigator.js'),
          import('${DEV}/app3/navigator.js'),
        ])
        nav1.mount('#app1')
        nav3.mount('app3')
      </script>
    `)

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('#app3 h1')).toContainText('Vite + React', { timeout: 15000 })

    const app1Html = await page.locator('#app1').innerHTML()
    const app3Html = await page.locator('#app3').innerHTML()

    expect(normalizeHtml(app1Html)).toMatchSnapshot('multi-app1-dev.html')
    expect(normalizeHtml(app3Html)).toMatchSnapshot('multi-app3-dev.html')
  })
})

test.describe('HTML snapshots — built output', () => {
  const BUILD = 'http://localhost:4173'

  test('shared module exports shape (built)', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="result"></div>
      <script type="module">
        const mod = await import('${BUILD}/shared/navigator.js')
        const exports = {}
        for (const [key, val] of Object.entries(mod)) {
          exports[key] = typeof val
        }
        document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toMatchSnapshot('shared-exports-built.json')
  })

  test('lazy module exports shape (built)', async ({ page }) => {
    await page.setContent(`
      <div id="result"></div>
      <script type="module">
        const mod = await import('${BUILD}/lazy/navigator.js')
        const exports = {}
        for (const [key, val] of Object.entries(mod)) {
          exports[key] = typeof val
        }
        document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toMatchSnapshot('lazy-exports-built.json')
  })

  test('js-test module exports shape (built)', async ({ page }) => {
    await page.setContent(`
      <div id="result"></div>
      <script type="module">
        const mod = await import('${BUILD}/js-test/navigator.js')
        const exports = {}
        for (const [key, val] of Object.entries(mod)) {
          exports[key] = typeof val
        }
        document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toMatchSnapshot('js-test-exports-built.json')
  })

  test('envs module exports shape (built)', async ({ page }) => {
    await page.setContent(`
      <div id="result"></div>
      <script type="module">
        const mod = await import('${BUILD}/envs/navigator.js')
        const exports = {}
        for (const [key, val] of Object.entries(mod)) {
          exports[key] = typeof val
        }
        document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toMatchSnapshot('envs-exports-built.json')
  })
})

test.describe('HTML snapshots — dev vs build parity', () => {
  test('shared exports shape matches between dev and build', async ({ page }) => {
    const results: string[] = []

    for (const base of [DEV, 'http://localhost:4173']) {
      await page.setContent(`
        <script type="importmap">
          { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
        </script>
        <div id="result"></div>
        <script type="module">
          const mod = await import('${base}/shared/navigator.js')
          const exports = {}
          for (const [key, val] of Object.entries(mod)) {
            exports[key] = typeof val
          }
          document.getElementById('result').textContent = JSON.stringify(exports, null, 2)
        </script>
      `)

      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      results.push((await page.textContent('#result'))!)
    }

    // Dev and build should produce identical export shapes
    expect(results[0]).toBe(results[1])
  })
})
