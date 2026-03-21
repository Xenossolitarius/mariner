import { describe, it, expect, vi } from 'vitest'
import { exit } from './exit'

describe('exit', () => {
  it('logs exiting message and calls process.exit', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    exit()

    expect(logSpy).toHaveBeenCalled()
    expect(logSpy.mock.calls[0][0]).toContain('exiting')
    expect(exitSpy).toHaveBeenCalled()

    logSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
