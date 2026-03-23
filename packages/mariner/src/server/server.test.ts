import { describe, it, expect, vi } from 'vitest'
import { createServer } from './server'
import type { ServerOptions } from './server'

vi.mock('.', () => ({
  createDevServer: vi.fn().mockReturnValue('dev-server'),
}))

vi.mock('./build', () => ({
  createBuildServer: vi.fn().mockReturnValue('build-server'),
}))

import { createDevServer } from '.'
import { createBuildServer } from './build'

function makeOptions(command: 'serve' | 'build'): ServerOptions {
  return {
    setup: {} as ServerOptions['setup'],
    projects: [],
    commands: { command, mode: 'development' } as ServerOptions['commands'],
  } as ServerOptions
}

describe('createServer', () => {
  it('creates a dev server when command is serve', () => {
    const options = makeOptions('serve')

    createServer(options)

    expect(createDevServer).toHaveBeenCalledWith(options)
  })

  it('creates a build server when command is build', () => {
    const options = makeOptions('build')

    createServer(options)

    expect(createBuildServer).toHaveBeenCalledWith(options)
  })

  it('returns the dev server result', () => {
    const result = createServer(makeOptions('serve'))
    expect(result).toBe('dev-server')
  })

  it('returns the build server result', () => {
    const result = createServer(makeOptions('build'))
    expect(result).toBe('build-server')
  })
})
