import { test, expect } from './setup'
import { VUE_IMPORTMAP, reactPreamble, mountPage, probePage } from './helpers'

// E2E tests for the Mariner dev server.
// The dev server is started automatically by playwright.config.ts webServer on port 3000.

const DEV = 'http://localhost:3000'
const REACT_PREAMBLE = reactPreamble(DEV)

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
    await page.setContent(probePage(VUE_IMPORTMAP, `${DEV}/shared/navigator.js`, `Object.keys(mod).join(',')`))

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).not.toContain('ERROR')
    expect(text).toContain('pinia')
  })

  test('React app3 navigator loads and exports navigator object', async ({ page }) => {
    await page.setContent(probePage(REACT_PREAMBLE, `${DEV}/app3/navigator.js`, `typeof mod.navigator?.mount`))

    await page.waitForSelector('#result:not(:empty)', { timeout: 15000 })
    const text = await page.textContent('#result')
    expect(text).toBe('function')
  })

  test('shared navigator exports pinia store', async ({ page }) => {
    await page.setContent(
      probePage(
        VUE_IMPORTMAP,
        `${DEV}/shared/navigator.js`,
        `['pinia:' + typeof mod.pinia, 'useCounter:' + typeof mod.useCounter].join('|')`,
      ),
    )

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toContain('pinia:object')
    expect(text).toContain('useCounter:function')
  })
})

test.describe('dev server — Vue app in browser', () => {
  test('app1 (Vue) mounts and renders into DOM', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${DEV}/app1/navigator.js` }]))

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('text=Vite + Vue')).toBeVisible()
  })

  test('app1 (Vue) counter button works with shared pinia store', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${DEV}/app1/navigator.js` }]))

    const localButton = page.locator('button', { hasText: 'count is' }).first()
    await expect(localButton).toBeVisible({ timeout: 15000 })

    await localButton.click()
    await expect(localButton).toContainText('count is 1')
  })

  test('app1 CSS is injected (scoped styles applied)', async ({ page }) => {
    await page.setContent(mountPage([{ id: 'app1', url: `${DEV}/app1/navigator.js` }]))

    await expect(page.getByText('APP 1', { exact: true })).toBeVisible({ timeout: 15000 })

    const styleCount = await page.locator('style').count()
    expect(styleCount).toBeGreaterThan(0)
  })
})

test.describe('dev server — multi-app mounting', () => {
  test('two apps mount simultaneously without conflicts', async ({ page }) => {
    await page.setContent(
      mountPage(
        [
          { id: 'app1', url: `${DEV}/app1/navigator.js` },
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

test.describe('dev server — asset serving', () => {
  test('serves static assets for app3 (vite.svg)', async ({ request }) => {
    const response = await request.get('/app3/vite.svg')
    expect(response.ok()).toBe(true)
    const contentType = response.headers()['content-type']
    expect(contentType).toContain('svg')
  })

  test('serves transformed source files', async ({ request }) => {
    const response = await request.get('/app3/src/App.tsx')
    expect(response.ok()).toBe(true)
    const body = await response.text()
    expect(body).toContain('function')
  })
})

test.describe('dev server — app mounts in DOM', () => {
  test('app3 (React) mounts and renders into DOM', async ({ page }) => {
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
