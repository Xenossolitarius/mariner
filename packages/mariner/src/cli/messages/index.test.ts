import { describe, it, expect } from 'vitest'
import {
  ENLISTING_NAVIGATORS,
  NO_NAVIGATORS_FOUND,
  NO_SELECTED_NAVIGATORS,
  NAVIGATORS_FOUND,
  SELECT_MARINERS,
  EXITING,
  INVALID_NAVIGATOR_REASON,
  MARINER_DESCRIPTION,
  STARTING_DEV_SERVER,
  STARTING_BUILD,
  GENERATING_TYPES,
  SELECTED_MODE_MESSAGE,
  FOUND_FLEET_CONFIG,
  MARINER_LOADED,
  DISPATCH_ENTIRE_FLEET,
  USING_ALL_IGNORING_SELECTION,
  IGNORING_FLEET_NO_CONFIG,
  SELECT_FLEET,
  RUN_SINGLE_NAVIGATOR,
  WORKING_IN,
} from './index'
import type { MarinerProject } from '../../setup'

describe('CLI messages', () => {
  describe('static messages', () => {
    it('has ENLISTING_NAVIGATORS', () => {
      expect(ENLISTING_NAVIGATORS).toBe('Enlisting navigators...')
    })

    it('has SELECT_MARINERS', () => {
      expect(SELECT_MARINERS).toBe('Select mariners')
    })

    it('has MARINER_DESCRIPTION', () => {
      expect(MARINER_DESCRIPTION).toContain('Mariner CLI')
    })

    it('has SELECT_FLEET', () => {
      expect(SELECT_FLEET).toBe('Select fleet')
    })

    // Chalk-colored strings should still contain the text content
    it('has NO_NAVIGATORS_FOUND with content', () => {
      expect(NO_NAVIGATORS_FOUND).toContain('No navigators found')
    })

    it('has EXITING with content', () => {
      expect(EXITING).toContain('exiting')
    })

    it('has STARTING_DEV_SERVER with content', () => {
      expect(STARTING_DEV_SERVER).toContain('dev server')
    })

    it('has STARTING_BUILD with content', () => {
      expect(STARTING_BUILD).toContain('Building')
    })

    it('has GENERATING_TYPES with content', () => {
      expect(GENERATING_TYPES).toContain('Generating types')
    })

    it('has FOUND_FLEET_CONFIG', () => {
      expect(FOUND_FLEET_CONFIG).toContain('fleet config')
    })

    it('has MARINER_LOADED', () => {
      expect(MARINER_LOADED).toContain('loaded')
    })

    it('has DISPATCH_ENTIRE_FLEET', () => {
      expect(DISPATCH_ENTIRE_FLEET).toContain('fleet')
    })

    it('has USING_ALL_IGNORING_SELECTION', () => {
      expect(USING_ALL_IGNORING_SELECTION).toContain('all')
    })

    it('has IGNORING_FLEET_NO_CONFIG', () => {
      expect(IGNORING_FLEET_NO_CONFIG).toContain('fleet')
    })

    it('has RUN_SINGLE_NAVIGATOR', () => {
      expect(RUN_SINGLE_NAVIGATOR).toContain('navigator')
    })

    it('has NO_SELECTED_NAVIGATORS', () => {
      expect(NO_SELECTED_NAVIGATORS).toContain('No selected')
    })
  })

  describe('NAVIGATORS_FOUND', () => {
    it('returns singular form for 1 navigator', () => {
      expect(NAVIGATORS_FOUND([1])).toContain('1 navigator')
    })

    it('returns plural form for multiple navigators', () => {
      expect(NAVIGATORS_FOUND([1, 2, 3])).toContain('3 navigators')
    })

    it('uses count from array length', () => {
      expect(NAVIGATORS_FOUND([])).toContain('0 navigators')
    })
  })

  describe('INVALID_NAVIGATOR_REASON', () => {
    it('returns missing navigator when navigator is absent', () => {
      const project = { navigator: undefined, packageJson: {} } as MarinerProject
      expect(INVALID_NAVIGATOR_REASON(project)).toBe('Missing navigator')
    })

    it('returns missing package.json when packageJson is null', () => {
      const project = { navigator: 'navigator.ts', packageJson: null } as MarinerProject
      expect(INVALID_NAVIGATOR_REASON(project)).toBe('Missing package.json')
    })

    it('returns Unknown when both are present', () => {
      const project = { navigator: 'navigator.ts', packageJson: {} } as MarinerProject
      expect(INVALID_NAVIGATOR_REASON(project)).toBe('Unknown')
    })
  })

  describe('SELECTED_MODE_MESSAGE', () => {
    it('returns a message with the mode when provided', () => {
      const result = SELECTED_MODE_MESSAGE('staging')
      expect(result).toContain('staging')
    })

    it('returns undefined when mode is not provided', () => {
      expect(SELECTED_MODE_MESSAGE(undefined)).toBeUndefined()
    })
  })

  describe('WORKING_IN', () => {
    it('returns a message with the path when provided', () => {
      const result = WORKING_IN('/my/project')
      expect(result).toContain('/my/project')
    })

    it('returns undefined when path is not provided', () => {
      expect(WORKING_IN(undefined)).toBeUndefined()
    })
  })
})
