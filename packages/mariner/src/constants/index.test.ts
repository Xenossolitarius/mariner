import { describe, it, expect } from 'vitest'
import { FILES, TEMPLATES, MARINER_ENV_PREFIX, NAVIGATOR_MODULE_PREFIX, MARINER_PROJ_DEFAULT_NAME } from './index'

describe('constants', () => {
  describe('FILES', () => {
    it('has correct config file name', () => {
      expect(FILES.config).toBe('mariner.config')
    })

    it('has correct navigator file name', () => {
      expect(FILES.navigator).toBe('navigator')
    })

    it('has correct fleet config file name', () => {
      expect(FILES.fleet).toBe('fleet.config.json')
    })

    it('has correct type directory name', () => {
      expect(FILES.typeDir).toBe('.mariner')
    })

    it('has correct type file name', () => {
      expect(FILES.typeFile).toBe('mariner.d.ts')
    })
  })

  describe('TEMPLATES', () => {
    it('has navigator_mount template with special characters', () => {
      expect(TEMPLATES.navigator_mount).toBe('<-m@unt->')
    })
  })

  describe('prefixes and defaults', () => {
    it('has correct env prefix', () => {
      expect(MARINER_ENV_PREFIX).toBe('MARINER_')
    })

    it('has correct navigator module prefix', () => {
      expect(NAVIGATOR_MODULE_PREFIX).toBe('navigator:')
    })

    it('has correct default project name', () => {
      expect(MARINER_PROJ_DEFAULT_NAME).toBe('mariner-fe')
    })
  })
})
