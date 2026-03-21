import { test, expect } from '@playwright/test'

// Sync tests: verify dev server and built output produce consistent results.
// Both servers must be running (dev on :3000, built on :4173).

const DEV = 'http://localhost:3000'
const BUILD = 'http://localhost:4173'

const LEAF_APPS = ['shared', 'lazy', 'js-test', 'envs']

/** Extract sorted export names from a module loaded in the browser */
function exportCheckScript(url: string) {
  return `
    <div id="result"></div>
    <script type="importmap">
      { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
    </script>
    <script type="module">
      try {
        const mod = await import('${url}')
        document.getElementById('result').textContent = Object.keys(mod).sort().join(',')
      } catch(e) {
        document.getElementById('result').textContent = 'ERROR:' + e.message
      }
    </script>
  `
}

test.describe('dev vs build — export parity', () => {
  for (const app of LEAF_APPS) {
    test(`${app} exports match between dev and build`, async ({ page }) => {
      // Get dev exports
      await page.setContent(exportCheckScript(`${DEV}/${app}/navigator.js`))
      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      const devExports = await page.textContent('#result')
      expect(devExports).not.toContain('ERROR')

      // Get build exports
      await page.setContent(exportCheckScript(`${BUILD}/${app}/navigator.js`))
      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      const buildExports = await page.textContent('#result')
      expect(buildExports).not.toContain('ERROR')

      // They should export the same names
      expect(devExports).toBe(buildExports)
    })
  }
})

test.describe('dev vs build — navigator shape', () => {
  test('shared: dev and build export pinia + useCounter', async ({ page }) => {
    for (const base of [DEV, BUILD]) {
      await page.setContent(`
        <script type="importmap">
          { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
        </script>
        <div id="result"></div>
        <script type="module">
          try {
            const mod = await import('${base}/shared/navigator.js')
            const checks = [
              'pinia:' + (typeof mod.pinia === 'object'),
              'useCounter:' + (typeof mod.useCounter === 'function'),
            ]
            document.getElementById('result').textContent = checks.join('|')
          } catch(e) {
            document.getElementById('result').textContent = 'ERROR:' + e.message
          }
        </script>
      `)
      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      const text = await page.textContent('#result')
      expect(text, `shared shape mismatch on ${base}`).toBe('pinia:true|useCounter:true')
    }
  })

  test('lazy: dev and build export lazy function', async ({ page }) => {
    for (const base of [DEV, BUILD]) {
      await page.setContent(`
        <div id="result"></div>
        <script type="module">
          try {
            const mod = await import('${base}/lazy/navigator.js')
            document.getElementById('result').textContent = typeof mod.lazy
          } catch(e) {
            document.getElementById('result').textContent = 'ERROR:' + e.message
          }
        </script>
      `)
      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      const text = await page.textContent('#result')
      expect(text, `lazy shape mismatch on ${base}`).toBe('function')
    }
  })

  test('js-test: dev and build export shout function', async ({ page }) => {
    for (const base of [DEV, BUILD]) {
      await page.setContent(`
        <div id="result"></div>
        <script type="module">
          try {
            const mod = await import('${base}/js-test/navigator.js')
            document.getElementById('result').textContent = typeof mod.shout
          } catch(e) {
            document.getElementById('result').textContent = 'ERROR:' + e.message
          }
        </script>
      `)
      await page.waitForSelector('#result:not(:empty)', { timeout: 10000 })
      const text = await page.textContent('#result')
      expect(text, `js-test shape mismatch on ${base}`).toBe('function')
    }
  })
})

test.describe('dev vs build — cross-app import targets', () => {
  test('app1: shared dependency present in both dev and build', async ({ request }) => {
    const devResp = await request.fetch(`${DEV}/app1/navigator.js`)
    const buildResp = await request.fetch(`${BUILD}/app1/navigator.js`)

    const devCode = await devResp.text()
    const buildCode = await buildResp.text()

    // Both should reference /shared/navigator.js (static import in navigator.ts)
    expect(devCode).toContain('/shared/navigator.js')
    expect(buildCode).toContain('/shared/navigator.js')

    // lazy is a dynamic import inside a .vue component — only visible in the build bundle
    // (dev serves components separately), so only check build
    expect(buildCode).toContain('/lazy/navigator.js')
  })

  test('app2: same navigator dependencies in dev and build', async ({ request }) => {
    const devResp = await request.fetch(`${DEV}/app2/navigator.js`)
    const buildResp = await request.fetch(`${BUILD}/app2/navigator.js`)

    const devCode = await devResp.text()
    const buildCode = await buildResp.text()

    expect(devCode).toContain('/shared/navigator.js')
    expect(buildCode).toContain('/shared/navigator.js')

    expect(devCode).toContain('/js-test/navigator.js')
    expect(buildCode).toContain('/js-test/navigator.js')
  })

  test('leaf apps: no navigator imports in both dev and build', async ({ request }) => {
    for (const app of LEAF_APPS) {
      const devResp = await request.fetch(`${DEV}/${app}/navigator.js`)
      const buildResp = await request.fetch(`${BUILD}/${app}/navigator.js`)

      const devCode = await devResp.text()
      const buildCode = await buildResp.text()

      const devImports = devCode.match(/\/[\w-]+\/navigator\.js/g) || []
      const buildImports = buildCode.match(/\/[\w-]+\/navigator\.js/g) || []

      expect(devImports, `${app} dev should have no navigator imports`).toHaveLength(0)
      expect(buildImports, `${app} build should have no navigator imports`).toHaveLength(0)
    }
  })
})

test.describe('dev vs build — all navigators serve successfully', () => {
  const ALL_APPS = ['app1', 'app2', 'app3', 'shared', 'lazy', 'envs', 'js-test']

  test('every app returns 200 from both dev and build', async ({ request }) => {
    for (const app of ALL_APPS) {
      const devResp = await request.fetch(`${DEV}/${app}/navigator.js`)
      expect(devResp.ok(), `dev /${app}/navigator.js should be 200`).toBe(true)

      const buildResp = await request.fetch(`${BUILD}/${app}/navigator.js`)
      expect(buildResp.ok(), `build /${app}/navigator.js should be 200`).toBe(true)
    }
  })

  test('every navigator response contains export keyword in both modes', async ({ request }) => {
    for (const app of ALL_APPS) {
      const devCode = await (await request.fetch(`${DEV}/${app}/navigator.js`)).text()
      const buildCode = await (await request.fetch(`${BUILD}/${app}/navigator.js`)).text()

      expect(devCode, `dev ${app} should have exports`).toContain('export')
      expect(buildCode, `build ${app} should have exports`).toContain('export')
    }
  })
})
