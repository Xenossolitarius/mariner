import { test, expect } from './setup'

// E2E tests for the cargo system.
//
// Dev mode (port 3000): cargo plugin runs per-request via Vite transform,
// replaces useCargo() with baked JSON in the navigator response.
//
// Serve mode (port 4200): serve server runs cargo per-request,
// injects __MARINER_CARGO__ const into the navigator response.

import { VUE_IMPORTMAP } from './helpers'

const DEV = 'http://localhost:3000'
const SERVE = 'http://localhost:4200'

test.describe('cargo — dev mode (virtual module)', () => {
  test('app1 navigator.js imports from virtual cargo module', async ({ request }) => {
    const response = await request.get(`${DEV}/app1/navigator.js`)
    expect(response.ok()).toBe(true)

    const body = await response.text()
    // useCargo() is replaced with an import from the virtual cargo module
    expect(body).toContain('virtual:mariner-cargo')
    expect(body).toContain('__mariner_cargo__')
    expect(body).not.toContain('useCargo()')
  })

  test('virtual cargo module response contains cargo data', async ({ request }) => {
    // First get navigator.js to find the virtual module URL
    const navResponse = await request.get(`${DEV}/app1/navigator.js`)
    const navBody = await navResponse.text()

    const match = navBody.match(/from\s+"([^"]*virtual:mariner-cargo[^"]*)"/)
    expect(match).not.toBeNull()

    const virtualUrl = `${DEV}${match![1]}`
    const cargoResponse = await request.get(virtualUrl)
    expect(cargoResponse.ok()).toBe(true)

    const cargoBody = await cargoResponse.text()
    expect(cargoBody).toContain('"greeting"')
    expect(cargoBody).toContain('Hello from server')
    expect(cargoBody).toContain('"darkMode"')
  })

  test('navigators without cargo are unaffected', async ({ request }) => {
    const response = await request.get(`${DEV}/shared/navigator.js`)
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).not.toContain('virtual:mariner-cargo')
    expect(body).not.toContain('__mariner_cargo__')
    expect(body).not.toContain('"greeting"')
  })

  test('app1 renders cargo data in the DOM', async ({ page }) => {
    await page.setContent(`
      ${VUE_IMPORTMAP}
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('${DEV}/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    await expect(page.locator('[data-testid="cargo-greeting"]')).toContainText('Hello from server', { timeout: 15000 })
    await expect(page.locator('[data-testid="cargo-features"]')).toContainText('darkMode: true')
  })
})

test.describe('cargo — serve mode (per-request injection)', () => {
  test('app1 navigator.js response contains cargo injection', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).toContain('__MARINER_CARGO__')
  })

  test('injected cargo data contains expected fields', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    const body = await response.text()

    expect(body).toContain('"greeting":"Hello from server"')
    expect(body).toContain('"darkMode":true')
  })

  test('cargo data is injected as module-scoped const, not on globalThis', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    const body = await response.text()

    expect(body).toContain('const __MARINER_CARGO__=')
    expect(body).not.toContain('globalThis.__MARINER_CARGO__=')
  })

  test('cargo injection is valid JSON', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    const body = await response.text()

    const match = body.match(/const __MARINER_CARGO__=(.+);/)
    expect(match).not.toBeNull()
    expect(() => JSON.parse(match![1])).not.toThrow()
  })

  test('cargo timestamp is fresh per request', async ({ request }) => {
    const res1 = await request.get(`${SERVE}/app1/navigator.js`)
    const body1 = await res1.text()
    const match1 = body1.match(/"timestamp":(\d+)/)

    // Small delay to ensure different timestamp
    await new Promise((r) => setTimeout(r, 50))

    const res2 = await request.get(`${SERVE}/app1/navigator.js`)
    const body2 = await res2.text()
    const match2 = body2.match(/"timestamp":(\d+)/)

    expect(match1).not.toBeNull()
    expect(match2).not.toBeNull()
    // Timestamps should differ — cargo runs fresh per request
    expect(match1![1]).not.toBe(match2![1])
  })

  test('navigators without cargo served without injection', async ({ request }) => {
    const response = await request.get(`${SERVE}/shared/navigator.js`)
    expect(response.ok()).toBe(true)

    const body = await response.text()
    expect(body).not.toContain('__MARINER_CARGO__')
  })

  test('navigator.js code follows the cargo injection', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    const body = await response.text()

    // Injection is first, then the navigator code
    const cargoIndex = body.indexOf('__MARINER_CARGO__')
    const exportIndex = body.indexOf('export')
    expect(cargoIndex).toBeLessThan(exportIndex)
  })

  test('static assets are served', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/vite.svg`)
    expect(response.ok()).toBe(true)
  })

  test('returns 404 for unknown apps', async ({ request }) => {
    const response = await request.get(`${SERVE}/nonexistent/navigator.js`)
    expect(response.status()).toBe(404)
  })

  test('CORS headers are set', async ({ request }) => {
    const response = await request.get(`${SERVE}/app1/navigator.js`)
    expect(response.headers()['access-control-allow-origin']).toBe('*')
  })

  test('app1 renders cargo data in the DOM (serve mode)', async ({ page }) => {
    await page.setContent(`
      ${VUE_IMPORTMAP}
      <div id="app1"></div>
      <script type="module">
        const { navigator } = await import('${SERVE}/app1/navigator.js')
        navigator.mount('#app1')
      </script>
    `)

    await expect(page.locator('[data-testid="cargo-greeting"]')).toContainText('Hello from server', { timeout: 15000 })
    await expect(page.locator('[data-testid="cargo-features"]')).toContainText('darkMode: true')
  })
})
