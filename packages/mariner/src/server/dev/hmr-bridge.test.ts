import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupCrossAppHmr } from './hmr-bridge'
import type { AppRoute } from './dev'
import type { MarinerProject } from '../../setup'
import { EventEmitter } from 'node:events'

function mockVite() {
  return {
    watcher: new EventEmitter(),
    ws: { send: vi.fn() },
    middlewares: vi.fn(),
    config: { base: '/test' },
  }
}

function mockRoute(base: string, vite: ReturnType<typeof mockVite>, navigator = 'navigator.ts'): AppRoute {
  return { base, navigator, vite: vite as unknown as AppRoute['vite'] }
}

function makeProject(mariner: string, navigator = 'navigator.ts'): MarinerProject {
  return {
    mariner,
    root: `/projects/${mariner}`,
    navigator,
    isJs: navigator.endsWith('.js'),
    isValid: true,
    packageJson: null,
    configFile: null,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('setupCrossAppHmr', () => {
  it('sends full-reload to other Vite servers when a navigator file changes', () => {
    const vite1 = mockVite()
    const vite2 = mockVite()
    const routes = [mockRoute('/app1', vite1), mockRoute('/shared', vite2)]
    const projects = [makeProject('app1'), makeProject('shared')]

    setupCrossAppHmr(routes, projects)

    // Simulate shared/navigator.ts changing
    vite2.watcher.emit('change', '/projects/shared/navigator.ts')

    expect(vite1.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(vite2.ws.send).not.toHaveBeenCalled()
  })

  it('notifies all other servers, not just one', () => {
    const vite1 = mockVite()
    const vite2 = mockVite()
    const vite3 = mockVite()
    const routes = [mockRoute('/app1', vite1), mockRoute('/app2', vite2), mockRoute('/shared', vite3)]
    const projects = [makeProject('app1'), makeProject('app2'), makeProject('shared')]

    setupCrossAppHmr(routes, projects)

    // Simulate shared/navigator.ts changing
    vite3.watcher.emit('change', '/projects/shared/navigator.ts')

    expect(vite1.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(vite2.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(vite3.ws.send).not.toHaveBeenCalled()
  })

  it('does not send reload for non-navigator file changes', () => {
    const vite1 = mockVite()
    const vite2 = mockVite()
    const routes = [mockRoute('/app1', vite1), mockRoute('/shared', vite2)]
    const projects = [makeProject('app1'), makeProject('shared')]

    setupCrossAppHmr(routes, projects)

    // Simulate a non-navigator file changing
    vite2.watcher.emit('change', '/projects/shared/src/store.ts')

    expect(vite1.ws.send).not.toHaveBeenCalled()
    expect(vite2.ws.send).not.toHaveBeenCalled()
  })

  it('handles shared fleet routes that share the same Vite instance', () => {
    const sharedVite = mockVite()
    const isolatedVite = mockVite()
    const routes = [
      mockRoute('/fleet/app1', sharedVite),
      mockRoute('/fleet/app2', sharedVite), // same instance
      mockRoute('/app3', isolatedVite),
    ]
    const projects = [makeProject('app1'), makeProject('app2'), makeProject('app3')]

    setupCrossAppHmr(routes, projects)

    // Simulate app1 navigator changing in the shared Vite instance
    sharedVite.watcher.emit('change', '/projects/app1/navigator.ts')

    // Only the OTHER Vite instance should be notified
    expect(isolatedVite.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    // The shared Vite handles its own HMR internally
    expect(sharedVite.ws.send).not.toHaveBeenCalled()
  })

  it('does nothing when only one Vite instance exists', () => {
    const vite = mockVite()
    const routes = [mockRoute('/app1', vite)]
    const projects = [makeProject('app1')]

    setupCrossAppHmr(routes, projects)

    vite.watcher.emit('change', '/projects/app1/navigator.ts')

    expect(vite.ws.send).not.toHaveBeenCalled()
  })

  it('handles JS navigator files', () => {
    const vite1 = mockVite()
    const vite2 = mockVite()
    const routes = [mockRoute('/app1', vite1), mockRoute('/js-test', vite2, 'navigator.js')]
    const projects = [makeProject('app1'), makeProject('js-test', 'navigator.js')]

    setupCrossAppHmr(routes, projects)

    vite2.watcher.emit('change', '/projects/js-test/navigator.js')

    expect(vite1.ws.send).toHaveBeenCalledWith({ type: 'full-reload' })
    expect(vite2.ws.send).not.toHaveBeenCalled()
  })

  it('handles bidirectional changes', () => {
    const vite1 = mockVite()
    const vite2 = mockVite()
    const routes = [mockRoute('/app1', vite1), mockRoute('/shared', vite2)]
    const projects = [makeProject('app1'), makeProject('shared')]

    setupCrossAppHmr(routes, projects)

    // shared changes → app1 reloads
    vite2.watcher.emit('change', '/projects/shared/navigator.ts')
    expect(vite1.ws.send).toHaveBeenCalledTimes(1)
    expect(vite2.ws.send).not.toHaveBeenCalled()

    vi.clearAllMocks()

    // app1 changes → shared reloads
    vite1.watcher.emit('change', '/projects/app1/navigator.ts')
    expect(vite2.ws.send).toHaveBeenCalledTimes(1)
    expect(vite1.ws.send).not.toHaveBeenCalled()
  })
})
