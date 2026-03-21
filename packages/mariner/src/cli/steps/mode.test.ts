import { describe, it, expect, vi } from 'vitest'
import { mode } from './mode'

describe('mode', () => {
  it('logs selected mode message when mode is provided', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    mode('staging')

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('staging')

    spy.mockRestore()
  })

  it('does not log when mode is undefined', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    mode(undefined)

    expect(spy).not.toHaveBeenCalled()

    spy.mockRestore()
  })
})
