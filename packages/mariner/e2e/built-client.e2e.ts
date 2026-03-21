import { test, expect } from './setup'
import fs from 'node:fs'
import path from 'node:path'

// E2E tests for the production-built microfrontends.
// Requires: 1) mariner-fe built (pnpm --filter mariner-fe build)
//           2) playground apps built (pnpm test:integration to populate dist/)
// The static server is started automatically by playwright.config.ts webServer on port 5179.

const monorepoRoot = path.resolve(import.meta.dirname, '../../..')
const distDir = path.join(monorepoRoot, 'dist')
const fixturesDir = path.join(import.meta.dirname, 'fixtures')

test.beforeAll(() => {
  // Copy test HTML fixture to dist so the static server can serve it
  fs.copyFileSync(path.join(fixturesDir, 'built-client.html'), path.join(distDir, 'index.html'))
})

test.afterAll(() => {
  fs.unlinkSync(path.join(distDir, 'index.html'))
})

test.describe('built output — static file serving', () => {
  test('each app navigator.js is served', async ({ request }) => {
    for (const app of ['shared', 'lazy', 'js-test', 'envs']) {
      const response = await request.get(`/${app}/navigator.js`)
      expect(response.ok(), `/${app}/navigator.js should be served`).toBe(true)
    }
  })

  test('manifest.json is served for each app', async ({ request }) => {
    for (const app of ['shared', 'app1', 'app3']) {
      const response = await request.get(`/${app}/.vite/manifest.json`)
      expect(response.ok(), `/${app}/.vite/manifest.json should be served`).toBe(true)

      const manifest = await response.json()
      expect(Object.keys(manifest).length).toBeGreaterThan(0)
    }
  })

  test('hashed assets are served', async ({ request }) => {
    // Read manifest to get actual asset filenames
    const manifestResp = await request.get('/app3/.vite/manifest.json')
    const manifest = await manifestResp.json()
    const entry = Object.values(manifest)[0] as { file: string }

    const response = await request.get(`/app3/${entry.file}`)
    expect(response.ok()).toBe(true)
  })
})

test.describe('built output — module loading in browser', () => {
  test('shared navigator exports are loadable', async ({ page }) => {
    await page.goto('/')

    const result = page.locator('#shared-result')
    await expect(result).not.toHaveText('', { timeout: 10000 })

    const text = await result.textContent()
    expect(text).toContain('SHARED:')
    expect(text).not.toContain('ERROR')
    // shared exports pinia, useCounter, and re-exports from pinia
    expect(text).toContain('pinia')
    expect(text).toContain('useCounter')
  })

  test('lazy navigator is loadable', async ({ page }) => {
    await page.goto('/')

    const result = page.locator('#lazy-result')
    await expect(result).not.toHaveText('', { timeout: 10000 })

    const text = await result.textContent()
    expect(text).toBe('LAZY:function')
  })

  test('js-test navigator is loadable', async ({ page }) => {
    await page.goto('/')

    const result = page.locator('#js-test-result')
    await expect(result).not.toHaveText('', { timeout: 10000 })

    const text = await result.textContent()
    expect(text).toBe('JSTEST:function')
  })
})

test.describe('built output — cross-app imports', () => {
  test('app1 built output references shared navigator path', async ({ request }) => {
    const response = await request.get('/app1/navigator.js')
    const code = await response.text()

    // Should import from /shared/navigator.js, not inline pinia
    expect(code).toContain('/shared/navigator.js')
    expect(code).not.toContain('createPinia')
  })

  test('app2 built output references shared and js-test', async ({ request }) => {
    const response = await request.get('/app2/navigator.js')
    const code = await response.text()

    expect(code).toContain('/shared/navigator.js')
    expect(code).toContain('/js-test/navigator.js')
  })

  test('leaf nodes have no cross-app imports', async ({ request }) => {
    for (const app of ['shared', 'lazy', 'js-test']) {
      const response = await request.get(`/${app}/navigator.js`)
      const code = await response.text()

      // Leaf nodes should not import other navigators
      const navigatorImports = code.match(/\/\w+\/navigator\.js/g) || []
      expect(navigatorImports, `${app} should have no navigator imports`).toHaveLength(0)
    }
  })
})

test.describe('built output — asset serving', () => {
  test('hashed SVG assets are served with correct content-type', async ({ request }) => {
    // app3 has react.svg and vite.svg hashed assets
    const files = fs.readdirSync(path.join(distDir, 'app3'))
    const svgFile = files.find((f) => f.endsWith('.svg') && f.includes('.'))

    if (svgFile) {
      const response = await request.get(`/app3/${svgFile}`)
      expect(response.ok()).toBe(true)
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('svg')
    }
  })

  test('hashed PNG assets are served', async ({ request }) => {
    const files = fs.readdirSync(path.join(distDir, 'app2'))
    const pngFile = files.find((f) => f.endsWith('.png'))

    if (pngFile) {
      const response = await request.get(`/app2/${pngFile}`)
      expect(response.ok()).toBe(true)
    }
  })
})

test.describe('built output — navigator mount/unmount lifecycle', () => {
  test('shared pinia store is functional from built output', async ({ page }) => {
    await page.setContent(`
      <script type="importmap">
        { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
      </script>
      <div id="result"></div>
      <script type="module">
        try {
          const { pinia, useCounter } = await import('http://localhost:4173/shared/navigator.js')
          // Verify pinia is a real pinia instance
          const isPinia = pinia && typeof pinia.install === 'function'
          // Verify useCounter is a store definition
          const isStore = typeof useCounter === 'function'
          document.getElementById('result').textContent = 'pinia:' + isPinia + '|store:' + isStore
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    const text = await page.textContent('#result')
    expect(text).toBe('pinia:true|store:true')
  })

  test('lazy function is callable from built output', async ({ page }) => {
    await page.setContent(`
      <div id="result"></div>
      <script type="module">
        try {
          const { lazy } = await import('http://localhost:4173/lazy/navigator.js')
          lazy()
          document.getElementById('result').textContent = 'CALLED'
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `)

    await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
    expect(await page.textContent('#result')).toBe('CALLED')
  })
})

test.describe('built output — CSS injection', () => {
  test('app1 has CSS injected in JS', async ({ request }) => {
    const response = await request.get('/app1/navigator.js')
    const code = await response.text()

    expect(code).toContain('document.head')
    expect(code).toContain('appendChild')
  })

  test('shared has CSS injected in JS', async ({ request }) => {
    const response = await request.get('/shared/navigator.js')
    const code = await response.text()

    expect(code).toContain('document.head')
  })
})
