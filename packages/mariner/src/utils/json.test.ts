import { describe, it, expect, vi } from 'vitest'
import fs from 'node:fs/promises'
import { getJSON } from './json'

vi.mock('node:fs/promises')

describe('getJSON', () => {
  it('parses and returns valid JSON from a file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"name": "test", "version": 1}')

    const result = await getJSON<{ name: string; version: number }>('/path/to/file.json')

    expect(result).toEqual({ name: 'test', version: 1 })
    expect(fs.readFile).toHaveBeenCalledWith('/path/to/file.json', 'utf8')
  })

  it('returns null when the file does not exist', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))

    const result = await getJSON('/nonexistent.json')

    expect(result).toBeNull()
  })

  it('returns null when file contains invalid JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('not valid json{')

    const result = await getJSON('/bad.json')

    expect(result).toBeNull()
  })

  it('calls onError callback when reading fails', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'))
    const onError = vi.fn()

    await getJSON('/missing.json', onError)

    expect(onError).toHaveBeenCalledOnce()
  })

  it('calls onError callback when parsing fails', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{invalid}')
    const onError = vi.fn()

    await getJSON('/bad.json', onError)

    expect(onError).toHaveBeenCalledOnce()
  })

  it('does not throw when onError is not provided', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('fail'))

    await expect(getJSON('/fail.json')).resolves.toBeNull()
  })

  it('returns typed result', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('{"items": [1,2,3]}')

    const result = await getJSON<{ items: number[] }>('/data.json')

    expect(result?.items).toEqual([1, 2, 3])
  })
})
