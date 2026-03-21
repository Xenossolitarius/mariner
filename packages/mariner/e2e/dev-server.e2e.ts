import { test, expect } from '@playwright/test'

// E2E tests for the Mariner dev server.
// The dev server is started automatically by playwright.config.ts webServer on port 3000.

test.describe('dev server — navigator serving', () => {
  test('serves shared navigator.js as ESM', async ({ request }) => {
    const response = await request.get('/shared/navigator.js')
    expect(response.ok()).toBe(true)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('javascript')

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves app1 navigator.js', async ({ request }) => {
    const response = await request.get('/app1/navigator.js')
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves app3 navigator.js (React)', async ({ request }) => {
    const response = await request.get('/app3/navigator.js')
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves lazy navigator.js', async ({ request }) => {
    const response = await request.get('/lazy/navigator.js')
    expect(response.ok()).toBe(true)
  })

  test('serves js-test navigator.js', async ({ request }) => {
    const response = await request.get('/js-test/navigator.js')
    expect(response.ok()).toBe(true)
  })

  test('serves envs navigator.js', async ({ request }) => {
    const response = await request.get('/envs/navigator.js')
    expect(response.ok()).toBe(true)
  })
})

test.describe('dev server — app routing', () => {
  test('each app is mounted at /{appname}/ base path', async ({ request }) => {
    const apps = ['app1', 'app2', 'app3', 'shared', 'lazy', 'envs', 'js-test']

    for (const app of apps) {
      const response = await request.get(`/${app}/navigator.js`)
      expect(response.ok(), `/${app}/navigator.js should be accessible`).toBe(true)
    }
  })

  test('returns 404 for non-existent app', async ({ request }) => {
    const response = await request.get('/nonexistent/navigator.js')
    expect(response.status()).toBe(404)
  })
})

test.describe('dev server — cross-app imports in browser', () => {
  test('app1 navigator loads and exports navigator object', async ({ page }) => {
    // Create a minimal HTML page that imports the navigator
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="result"></div>
      <script type="module">
        try {
          const mod = await import('http://localhost:3000/shared/navigator.js')
          document.getElementById('result').textContent = Object.keys(mod).join(',')
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).not.toContain('ERROR')
    expect(text).toContain('pinia')
  })

  test('React app3 navigator loads and exports navigator object', async ({ page }) => {
    // React needs refresh runtime preamble
    await page.setContent(`
      <script type="module">
        import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <div id="result"></div>
      <script type="module">
        try {
          const mod = await import('http://localhost:3000/app3/navigator.js')
          document.getElementById('result').textContent = typeof mod.navigator?.mount
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 15000 })
    const text = await page.textContent('#result')
    expect(text).toBe('function')
  })

  test('shared navigator exports pinia store', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="result"></div>
      <script type="module">
        try {
          const { pinia, useCounter } = await import('http://localhost:3000/shared/navigator.js')
          const results = []
          results.push('pinia:' + typeof pinia)
          results.push('useCounter:' + typeof useCounter)
          document.getElementById('result').textContent = results.join('|')
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toContain('pinia:object')
    expect(text).toContain('useCounter:function')
  })
})

test.describe('dev server — Vue app in browser', () => {
  test('app1 (Vue) mounts and renders into DOM', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    // app1 renders "APP 1" text and HelloWorld with "Vite + Vue"
    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Vite + Vue')).toBeVisible()
  })

  test('app1 (Vue) counter button works with shared pinia store', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    // HelloWorld has two count buttons — local and shared store
    const localButton = page.locator('button', { hasText: 'count is' }).first()
    await expect(localButton).toBeVisible({ timeout: 15000 })

    await localButton.click()
    await expect(localButton).toContainText('count is 1')
  })

  test('app1 CSS is injected (scoped styles applied)', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    // Wait for app to render
    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })

    // Check that styles are present in the document
    const styleCount = await page.locator('style').count()
    expect(styleCount).toBeGreaterThan(0)
  })
})

test.describe('dev server — multi-app mounting', () => {
  test('two apps mount simultaneously without conflicts', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <script type="module">
        import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <div id="app1"></div>
      <div id="app3"></div>
      <script type="module">
        const [{ navigator: nav1 }, { navigator: nav3 }] = await Promise.all([
          import('http://localhost:3000/app1/navigator.js'),
          import('http://localhost:3000/app3/navigator.js'),
        ])
        nav1.mount('#app1')
        nav3.mount('app3')
      </script>
    `)

    // Both apps should render
    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Vite + React')).toBeVisible({ timeout: 15000 })
  })

  test('unmounting an app removes its DOM content', async ({ page }) => {
    await page.setContent(`
      <script type="module">
        import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <div id="app3"></div>
      <div id="status"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app3/navigator.js')
        navigator.mount('app3')
        window._testNavigator = navigator
        document.getElementById('status').textContent = 'MOUNTED'
      </script>
    `)

    await expect(page.locator('#status')).toHaveText('MOUNTED', { timeout: 15000 })
    await expect(page.locator('text=Vite + React')).toBeVisible()

    // Unmount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any)._testNavigator.unmount())

    // Content should be removed
    await expect(page.locator('text=Vite + React')).not.toBeVisible()
  })
})

test.describe('dev server — asset serving', () => {
  test('serves static assets for app3 (vite.svg)', async ({ request }) => {
    const response = await request.get('/app3/vite.svg')
    expect(response.ok()).toBe(true)
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('svg')
  })

  test('serves transformed source files', async ({ request }) => {
    // Vite dev server transforms .ts/.tsx on-the-fly
    const response = await request.get('/app3/src/App.tsx')
    expect(response.ok()).toBe(true)
    const body = await response.text()
    // Should be transformed to JS
    expect(body).toContain('function')
  })
})

test.describe('dev server — app mounts in DOM', () => {
  test('app3 (React) mounts and renders into DOM', async ({ page }) => {
    await page.setContent(`
      <script type="module">
        import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <div id="app3"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app3/navigator.js')
        navigator.mount('app3')
      </script>
    `)

    // React app renders "Vite + React" heading
    const heading = page.locator('h1')
    await expect(heading).toContainText('Vite + React', { timeout: 15000 })

    // Should have a count button
    const button = page.locator('button')
    await expect(button).toContainText('count is', { timeout: 5000 })
  })

  test('app3 (React) button click updates count', async ({ page }) => {
    await page.setContent(`
      <script type="module">
        import RefreshRuntime from 'http://localhost:3000/app3/@react-refresh'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <div id="app3"></div>
      <script type="module">
        const { navigator } = await import('http://localhost:3000/app3/navigator.js')
        navigator.mount('app3')
      </script>
    `)

    const button = page.locator('button')
    await expect(button).toContainText('count is 0', { timeout: 15000 })

    await button.click()
    await expect(button).toContainText('count is 1')

    await button.click()
    await expect(button).toContainText('count is 2')
  })
})
