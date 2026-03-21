// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { createVueNavigator, createReactNavigator } from './adapters'

describe('createVueNavigator', () => {
  it('returns an object with mount and unmount', () => {
    const mockApp = { mount: vi.fn(), unmount: vi.fn() }
    const navigator = createVueNavigator(mockApp as never)

    expect(navigator).toHaveProperty('mount')
    expect(navigator).toHaveProperty('unmount')
  })

  it('delegates mount to vue app.mount', () => {
    const mockApp = { mount: vi.fn(), unmount: vi.fn() }
    const navigator = createVueNavigator(mockApp as never)

    navigator.mount('#app')

    expect(mockApp.mount).toHaveBeenCalledWith('#app')
  })

  it('delegates unmount to vue app.unmount', () => {
    const mockApp = { mount: vi.fn(), unmount: vi.fn() }
    const navigator = createVueNavigator(mockApp as never)

    navigator.unmount()

    expect(mockApp.unmount).toHaveBeenCalled()
  })
})

describe('createReactNavigator', () => {
  it('returns an object with mount and unmount', () => {
    const rootFactory = vi.fn()
    const navigator = createReactNavigator(rootFactory as never, 'app' as never)

    expect(navigator).toHaveProperty('mount')
    expect(navigator).toHaveProperty('unmount')
  })

  it('creates a root and renders on mount', () => {
    const mockRoot = { render: vi.fn(), unmount: vi.fn() }
    const rootFactory = vi.fn().mockReturnValue(mockRoot)
    const mockElement = document.createElement('div')
    vi.spyOn(document, 'getElementById').mockReturnValue(mockElement)

    const navigator = createReactNavigator(rootFactory as never, 'app' as never)
    navigator.mount('root')

    expect(document.getElementById).toHaveBeenCalledWith('root')
    expect(rootFactory).toHaveBeenCalledWith(mockElement)
    expect(mockRoot.render).toHaveBeenCalledWith('app')
  })

  it('unmounts the root when unmount is called after mount', () => {
    const mockRoot = { render: vi.fn(), unmount: vi.fn() }
    const rootFactory = vi.fn().mockReturnValue(mockRoot)
    vi.spyOn(document, 'getElementById').mockReturnValue(document.createElement('div'))

    const navigator = createReactNavigator(rootFactory as never, 'app' as never)
    navigator.mount('root')
    navigator.unmount()

    expect(mockRoot.unmount).toHaveBeenCalled()
  })

  it('does not throw when unmount is called before mount', () => {
    const rootFactory = vi.fn()
    const navigator = createReactNavigator(rootFactory as never, 'app' as never)

    expect(() => navigator.unmount()).not.toThrow()
  })
})
