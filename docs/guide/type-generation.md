# Type Generation

Mariner can generate TypeScript declarations for cross-app imports, providing full type safety when using `navigator:` virtual modules.

## Running Type Generation

```bash
mariner generate-types
```

This scans all apps and generates type definitions based on each app's `navigator.ts` exports.

### Options

```bash
mariner generate-types [options]
```

| Option               | Description                        | Default       |
| -------------------- | ---------------------------------- | ------------- |
| `-m, --mode <mode>`  | Vite mode                          | `development` |
| `--all`              | Generate for all navigators        | `false`       |
| `--navigator <name>` | Generate for specific navigator(s) | —             |
| `--fleet <name>`     | Generate for specific fleet group  | —             |
| `-t, --threads <n>`  | Number of worker threads           | auto          |

## Output

The command produces a `.mariner/mariner.d.ts` file at the workspace root. This file contains `declare module` blocks for each app:

```ts
// .mariner/mariner.d.ts (auto-generated)
declare module 'navigator:shared' {
  export const pinia: import('pinia').Pinia
  export const useCounter: import('pinia').StoreDefinition<...>
  export const navigator: import('mariner-fe/navigator').Navigator
}

declare module 'navigator:app1' {
  export const cargo: { greeting: string; timestamp: number }
  export const navigator: import('mariner-fe/navigator').Navigator
}
```

::: warning
Do not edit `.mariner/mariner.d.ts` manually. It is regenerated each time you run `mariner generate-types` and your changes will be overwritten.
:::

## How It Works

### Step-by-Step Process

1. **Discovery**: All apps are discovered via `mariner.config.{ts,js}` scanning
2. **Filtering**: JavaScript navigators (`navigator.js`) are skipped — only TypeScript navigators are processed
3. **Worker pool**: Each TypeScript app is sent to a worker thread for parallel processing
4. **Type extraction**: Each worker uses `vite-plugin-dts` to build the navigator entry and extract type declarations
5. **Per-app output**: Individual `index.d.ts` files are written to `.mariner/{appname}/`
6. **Combination**: All per-app declarations are read and wrapped in `declare module 'navigator:{appname}'` blocks
7. **Final output**: Combined declarations are written to `.mariner/mariner.d.ts`
8. **Cleanup**: Per-app directories (`.mariner/{appname}/`) are removed

### Type Transform

The generator takes the exports from each navigator file and wraps them in ambient module declarations:

```ts
// Input: shared/navigator.ts
export const pinia = createPinia()
export const useCounter = defineStore('counter', { ... })

// Output in .mariner/mariner.d.ts
declare module 'navigator:shared' {
  export const pinia: import("pinia").Pinia
  export const useCounter: import("pinia").StoreDefinition<"counter", { counter: number }, {}, { update(): void }>
}
```

### Worker Pool

Type generation uses the same worker pool as the build system:

- **Default threads**: `Math.min(Math.floor(os.cpus().length / 2), 4)`
- **Override**: Use `-t, --threads <n>` to customize
- Each worker runs `vite-plugin-dts` independently for one app
- Apps are processed in parallel for speed

## TypeScript Configuration

Add the generated declarations to your `tsconfig.json` so the TypeScript compiler can resolve `navigator:` imports:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "../.mariner/mariner.d.ts"]
}
```

The path `../.mariner/mariner.d.ts` assumes your `tsconfig.json` is inside an app directory one level below the workspace root. Adjust the relative path to match your monorepo structure.

### Example tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true
  },
  "include": [
    "navigator.ts",
    "src/**/*.ts",
    "src/**/*.vue",
    "../.mariner/mariner.d.ts"
  ]
}
```

## JavaScript Navigators

Apps with `navigator.js` (not TypeScript) are skipped during type generation. They:

- Don't produce a `declare module` block
- Can still be imported by other apps, but without type safety
- The import `navigator:js-app` will work at runtime but won't have autocomplete or type checking

If you need type safety for a JavaScript navigator, convert it to TypeScript or create a manual type declaration.

## When to Re-run

Re-run `mariner generate-types` when:

- Adding a new app to the workspace
- Changing a navigator's exports (adding, removing, or renaming exports)
- Changing the types of existing exports
- Switching a navigator from `.js` to `.ts`

You do **not** need to re-run when:

- Changing internal app code (components, utilities)
- Modifying `mariner.config.ts` settings
- Updating dependencies

## CI Integration

Include type generation in your CI pipeline to keep declarations in sync:

```yaml
# GitHub Actions example
- name: Generate types
  run: pnpm mariner generate-types --all

- name: Type check
  run: pnpm tsc --noEmit
```

Or use it as a pre-commit hook:

```bash
# .husky/pre-commit
pnpm mariner generate-types --all
git add .mariner/
```

::: tip
Include `mariner generate-types` in your CI pipeline or as a pre-commit hook to keep type definitions in sync with your code. Stale type definitions can mask breaking changes in navigator exports.
:::

## Troubleshooting

### No types generated for an app

- Check that the app has `navigator.ts` (not `.js`)
- Check that the app has a valid `mariner.config.ts`
- Check that the app name matches what you're importing

### Types are outdated

- Re-run `mariner generate-types --all`
- Check that `.mariner/mariner.d.ts` is included in your `tsconfig.json`

### Import errors in editor

- Verify the relative path to `.mariner/mariner.d.ts` is correct in `tsconfig.json`
- Restart your TypeScript language server after generating types
- Check that the app name in the import matches the slugified name
