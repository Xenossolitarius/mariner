/**
 * Shared HTML templates and helpers for E2E tests.
 *
 * Eliminates duplication of Vue importmaps, React refresh preambles,
 * and app mount boilerplate across test files.
 */

export const VUE_IMPORTMAP = `
  <script type="importmap">
    { "imports": { "vue": "https://unpkg.com/vue@3/dist/vue.esm-browser.js" } }
  </script>
`

export const reactPreamble = (devUrl: string) => `
  <script type="module">
    import RefreshRuntime from '${devUrl}/app3/@react-refresh'
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => (type) => type
    window.__vite_plugin_react_preamble_installed__ = true
  </script>
`

type MountEntry = {
  id: string
  url: string
  /** Use 'react' for React apps that mount by element id (no #), default is 'vue' (mounts with #id) */
  type?: 'vue' | 'react'
}

/**
 * Generates HTML that mounts one or more navigators.
 * Includes Vue importmap and React preamble automatically based on mount types.
 */
export const mountPage = (mounts: MountEntry[], options?: { reactDevUrl?: string }) => {
  const hasVue = mounts.some((m) => m.type !== 'react')
  const hasReact = mounts.some((m) => m.type === 'react')

  const divs = mounts.map((m) => `<div id="${m.id}"></div>`).join('\n      ')

  const imports = mounts.map((m) => `import('${m.url}')`).join(',\n          ')

  const destructure = mounts.map((_, i) => `{ navigator: nav${i} }`).join(', ')

  const mountCalls = mounts
    .map((m, i) => {
      const selector = m.type === 'react' ? `'${m.id}'` : `'#${m.id}'`
      return `nav${i}.mount(${selector})`
    })
    .join('\n        ')

  return `
      ${hasVue ? VUE_IMPORTMAP : ''}
      ${hasReact && options?.reactDevUrl ? reactPreamble(options.reactDevUrl) : ''}
      ${divs}
      <script type="module">
        const [${destructure}] = await Promise.all([
          ${imports},
        ])
        ${mountCalls}
      </script>
    `
}

/**
 * Generates HTML that imports a module and writes the result to #result.
 * Used for testing module exports without mounting.
 */
export const probePage = (preamble: string, url: string, evalFn: string) => `
      ${preamble}
      <div id="result"></div>
      <script type="module">
        try {
          const mod = await import('${url}')
          document.getElementById('result').textContent = ${evalFn}
        } catch(e) {
          document.getElementById('result').textContent = 'ERROR:' + e.message
        }
      </script>
    `

/**
 * Screenshot page layout styles.
 */
export const SCREENSHOT_STYLES = `
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; background: #242424; color: #fff; }
    .app-section { padding: 2rem; border-bottom: 1px solid #333; }
    .app-label { font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1rem; }
  </style>
`
