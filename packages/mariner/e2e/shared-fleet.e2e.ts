import { test, expect } from './setup'
import path from 'node:path'
import { VUE_IMPORTMAP, reactPreamble, mountPage, probePage, SCREENSHOT_STYLES } from './helpers'

// E2E tests for the shared fleet mode — mirrors the dev-server and screenshot tests
// but runs against a server where app1, tailwind-vue, shared are in a shared Vite instance.
// app3, lazy, js-test, envs run isolated on the same server.
//
// The shared fleet dev server is started on port 3001 via playwright.config.ts webServer
// with: --all --fleet shared-vue

const DEV = 'http://localhost:3001'
const FLEET = `${DEV}/shared-vue`
const REACT_PREAMBLE = reactPreamble(DEV)
const screenshotsDir = path.join(import.meta.dirname, 'screenshots')

test.describe('shared fleet — navigator serving', () => {
  test('serves shared navigator.js as ESM', async ({ request }) => {
    const response = await request.get('/shared-vue/shared/navigator.js')
    expect(response.ok()).toBe(true)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('javascript')

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves app1 navigator.js', async ({ request }) => {
    const response = await request.get('/shared-vue/app1/navigator.js')
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves app3 navigator.js (React, isolated)', async ({ request }) => {
    const response = await request.get('/app3/navigator.js')
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('export')
  })

  test('serves lazy navigator.js (isolated)', async ({ request }) => {
    const response = await request.get('/lazy/navigator.js')
    expect(response.ok()).toBe(true)
  })

  test('serves js-test navigator.js (isolated)', async ({ request }) => {
    const response = await request.get('/js-test/navigator.js')
    expect(response.ok()).toBe(true)
  })

  test('serves envs navigator.js (isolated)', async ({ request }) => {
    const response = await request.get('/envs/navigator.js')
    expect(response.ok()).toBe(true)
  })

  test('all fleet apps are routable under fleet prefix', async ({ request }) => {
    const apps = ['app1', 'tailwind-vue', 'shared']

    for (const app of apps) {
      const response = await request.get(`/shared-vue/${app}/navigator.js`)
      expect(response.ok(), `/shared-vue/${app}/navigator.js should be accessible`).toBe(true)
    }
  })
})

test.describe('shared fleet — app routing', () => {
  test('returns 404 for non-existent app under fleet prefix', async ({ request }) => {
    const response = await request.get('/shared-vue/nonexistent/navigator.js')
    expect(response.status()).toBe(404)
  })

  test('returns 404 for non-existent isolated app', async ({ request }) => {
    const response = await request.get('/nonexistent/navigator.js')
    expect(response.status()).toBe(404)
  })
})

test.describe('shared fleet — asset serving', () => {
  test('serves static assets for app3 (vite.svg, isolated)', async ({ request }) => {
    const response = await request.get('/app3/vite.svg')
    expect(response.ok()).toBe(true)
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('svg')
  })

  test('serves transformed source files (isolated)', async ({ request }) => {
    const response = await request.get('/app3/src/App.tsx')
    expect(response.ok()).toBe(true)
    const body = await response.text()
    expect(body).toContain('function')
  })
})

test.describe('shared fleet — cross-app imports in browser', () => {
  test('shared navigator exports pinia store', async ({ page }) => {
    await page.setContent(
      probePage(
        VUE_IMPORTMAP,
        `${FLEET}/shared/navigator.js`,
        `['pinia:' + typeof mod.pinia, 'useCounter:' + typeof mod.useCounter].join('|')`,
      ),
    )

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toContain('pinia:object')
    expect(text).toContain('useCounter:function')
  })

  test('app1 navigator loads and exports navigator object', async ({ page }) => {
    await page.setContent(probePage(VUE_IMPORTMAP, `${FLEET}/app1/navigator.js`, `typeof mod.navigator?.mount`))

    await page.waitForSelector('#result:not(:empty)', { timeout: 15000 })
    const text = await page.textContent('#result')
    expect(text).toBe('function')
  })

  test('React app3 navigator loads and exports navigator object (isolated)', async ({ page }) => {
    await page.setContent(probePage(REACT_PREAMBLE, `${DEV}/app3/navigator.js`, `typeof mod.navigator?.mount`))

    await page.waitForSelector('#result:not(:empty)', { timeout: 15000 })
    const text = await page.textContent('#result')
    expect(text).toBe('function')
  })
})

test.describe('shared fleet — Vue app in browser', () => {
  test('app1 (Vue) mounts and renders into DOM', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${FLEET}/app1/navigator.js` }]))

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Vite + Vue')).toBeVisible()
  })

  test('app1 (Vue) counter button works with shared pinia store', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${FLEET}/app1/navigator.js` }]))

    const localButton = page.locator('button', { hasText: 'count is' }).first()
    await expect(localButton).toBeVisible({ timeout: 15000 })

    await localButton.click()
    await expect(localButton).toContainText('count is 1')
  })

  test('app1 CSS is injected (scoped styles applied)', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${FLEET}/app1/navigator.js` }]))

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })

    const styleCount = await page.locator('style').count()
    expect(styleCount).toBeGreaterThan(0)
  })
})

test.describe('shared fleet — multi-app mounting', () => {
  test('two apps mount simultaneously without conflicts', async ({ page }) => {
    await page.setContent(
      mountPage(
        [
          { id: 'app1', url: `${FLEET}/app1/navigator.js` },
          { id: 'app3', url: `${DEV}/app3/navigator.js`, type: 'react' },
        ],
        { reactDevUrl: DEV },
      ),
    )

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Vite + React')).toBeVisible({ timeout: 15000 })
  })

  test('unmounting an app removes its DOM content', async ({ page }) => {
    await page.setContent(`
      ${REACT_PREAMBLE}
      <div id="app3"></div>
      <div id="status"></div>
      <script type="module">
        const { navigator } = await import('${DEV}/app3/navigator.js')
        navigator.mount('app3')
        window._testNavigator = navigator
        document.getElementById('status').textContent = 'MOUNTED'
      </script>
    `)

    await expect(page.locator('#status')).toHaveText('MOUNTED', { timeout: 15000 })
    await expect(page.locator('text=Vite + React')).toBeVisible()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.evaluate(() => (window as any)._testNavigator.unmount())

    await expect(page.locator('text=Vite + React')).not.toBeVisible()
  })
})

test.describe('shared fleet — app mounts in DOM', () => {
  test('app3 (React, isolated) mounts and renders into DOM', async ({ page }) => {
    await page.setContent(
      mountPage([{ id: 'app3', url: `${DEV}/app3/navigator.js`, type: 'react' }], { reactDevUrl: DEV }),
    )

    const heading = page.locator('h1')
    await expect(heading).toContainText('Vite + React', { timeout: 15000 })

    const button = page.locator('button')
    await expect(button).toContainText('count is', { timeout: 5000 })
  })

  test('app3 (React) button click updates count', async ({ page }) => {
    await page.setContent(
      mountPage([{ id: 'app3', url: `${DEV}/app3/navigator.js`, type: 'react' }], { reactDevUrl: DEV }),
    )

    const button = page.locator('button')
    await expect(button).toContainText('count is 0', { timeout: 15000 })

    await button.click()
    await expect(button).toContainText('count is 1')

    await button.click()
    await expect(button).toContainText('count is 2')
  })
})

test.describe('shared fleet — screenshots', () => {
  test.use({ viewport: { width: 1024, height: 1024 } })
  test.setTimeout(60000)

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
        <div class="app-label">Tailwind Vue</div>
        <div id="tw-app"></div>
      </div>
      <div class="app-section">
        <div class="app-label">App 3 (React)</div>
        <div id="app3"></div>
      </div>
      <script type="module">
        const [{ navigator: nav1 }, { navigator: navTw }, { navigator: nav3 }] = await Promise.all([
          import('${FLEET}/app1/navigator.js'),
          import('${FLEET}/tailwind-vue/navigator.js'),
          import('${DEV}/app3/navigator.js'),
        ])
        nav1.mount('#app1')
        navTw.mount('#tw-app')
        nav3.mount('app3')
      </script>
    `)

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 30000 })
    await expect(page.locator('[data-testid="tw-heading"]')).toContainText('Tailwind Vue', { timeout: 30000 })
    await expect(page.locator('#app3 h1')).toContainText('Vite + React', { timeout: 30000 })

    await page.waitForTimeout(1000)
    await page.evaluate(() => document.fonts.ready.catch(() => {}))
    const buffer = await page.screenshot({ type: 'jpeg', quality: 90, fullPage: true })
    const fs = await import('node:fs')
    fs.writeFileSync(path.join(screenshotsDir, 'shared-fleet-page.jpeg'), buffer)
  })
})
