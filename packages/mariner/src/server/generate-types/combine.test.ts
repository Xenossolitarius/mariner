import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateMarinerTypeFile } from './combine'

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(),
    rm: vi.fn(),
  },
}))

import fs from 'node:fs/promises'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateMarinerTypeFile', () => {
  it('logs error when no types are generated', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([])
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    expect(logSpy).toHaveBeenCalledWith('Error: No types generated')
    expect(fs.writeFile).not.toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it('combines type files from folders with index.d.ts', async () => {
    // readdir returns directory entries
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'app1', isDirectory: () => true },
      { name: 'app2', isDirectory: () => true },
      { name: 'somefile.ts', isDirectory: () => false },
    ] as never)

    // access succeeds for both folders (they have index.d.ts)
    vi.mocked(fs.access).mockResolvedValue(undefined)

    // readFile returns type content
    vi.mocked(fs.readFile)
      .mockResolvedValueOnce('declare const foo: string;\nexport { foo };')
      .mockResolvedValueOnce('declare type Bar = number;\nexport { Bar };')

    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    // Should write combined file
    expect(fs.writeFile).toHaveBeenCalledOnce()
    const [outputPath, content] = vi.mocked(fs.writeFile).mock.calls[0]

    expect(outputPath).toContain('mariner.d.ts')

    // Content should have module declarations
    const contentStr = content as string
    expect(contentStr).toContain("declare module 'navigator:app1'")
    expect(contentStr).toContain("declare module 'navigator:app2'")

    // Should remove 'declare ' keyword from content
    expect(contentStr).not.toMatch(/declare const/)
    expect(contentStr).not.toMatch(/declare type/)

    // Content should be indented
    expect(contentStr).toContain('  const foo: string;')

    logSpy.mockRestore()
  })

  it('cleans up intermediate folders after combining', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([{ name: 'app1', isDirectory: () => true }] as never)
    vi.mocked(fs.access).mockResolvedValue(undefined)
    vi.mocked(fs.readFile).mockResolvedValue('export const x: string;')
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    expect(fs.rm).toHaveBeenCalledWith(expect.stringContaining('app1'), { recursive: true })
  })

  it('skips folders without index.d.ts', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'has-types', isDirectory: () => true },
      { name: 'no-types', isDirectory: () => true },
    ] as never)

    // First folder has index.d.ts, second doesn't
    vi.mocked(fs.access).mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('ENOENT'))

    vi.mocked(fs.readFile).mockResolvedValue('export const x: string;')
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    // Only one folder should be processed
    expect(fs.readFile).toHaveBeenCalledOnce()
  })

  it('skips non-directory entries', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([
      { name: 'file.ts', isDirectory: () => false },
      { name: 'app1', isDirectory: () => true },
    ] as never)

    vi.mocked(fs.access).mockResolvedValue(undefined)
    vi.mocked(fs.readFile).mockResolvedValue('export const x: string;')
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    // access should only be called for the directory, not the file
    expect(fs.access).toHaveBeenCalledOnce()
  })

  it('logs success message when done', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([{ name: 'app1', isDirectory: () => true }] as never)
    vi.mocked(fs.access).mockResolvedValue(undefined)
    vi.mocked(fs.readFile).mockResolvedValue('export const x: string;')
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rm).mockResolvedValue(undefined)

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await generateMarinerTypeFile()

    expect(logSpy).toHaveBeenCalledWith('Mariner type file generated successfully.')

    logSpy.mockRestore()
  })
})
