import { describe, it, expect } from 'vitest'
import { ServerCommands } from './serverCommands'

describe('ServerCommands', () => {
  it('has SERVE value', () => {
    expect(ServerCommands.SERVE).toBe('serve')
  })

  it('has BUILD value', () => {
    expect(ServerCommands.BUILD).toBe('build')
  })

  it('only has two values', () => {
    const values = Object.values(ServerCommands)
    expect(values).toHaveLength(2)
    expect(values).toEqual(['serve', 'build'])
  })
})
