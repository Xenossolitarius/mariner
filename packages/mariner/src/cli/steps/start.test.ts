import { describe, it, expect, vi } from 'vitest'
import { start, startMessage } from './start'

describe('start', () => {
  it('startMessage contains the logo', () => {
    expect(startMessage).toContain('Safe voyage')
  })

  it('start() logs the start message', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})

    start()

    expect(spy).toHaveBeenCalledWith(startMessage)

    spy.mockRestore()
  })
})
