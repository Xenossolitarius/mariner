# Type Generation

Mariner can generate TypeScript declarations for cross-app imports, providing full type safety when using `navigator:` virtual modules.

## Running Type Generation

```bash
mariner generate-types
```

This scans all apps in the fleet and generates type definitions based on each app's `navigator.ts` exports.

## Output

The command produces a `.mariner/mariner.d.ts` file in the project root. This file contains `declare module` blocks for each app:

```ts
// .mariner/mariner.d.ts (auto-generated)
declare module 'navigator:shared' {
  export const pinia: import('pinia').Pinia
  export const navigator: import('mariner-fe/navigator').Navigator
}

declare module 'navigator:app1' {
  export const navigator: import('mariner-fe/navigator').Navigator
}
```

::: warning
Do not edit `.mariner/mariner.d.ts` manually. It is regenerated each time you run `mariner generate-types` and your changes will be overwritten.
:::

## TypeScript Configuration

Add the generated declarations to your `tsconfig.json` so the TypeScript compiler can resolve `navigator:` imports:

```json
{
  "include": ["src/**/*.ts", "src/**/*.vue", "../.mariner/mariner.d.ts"]
}
```

The path `../.mariner/mariner.d.ts` assumes your `tsconfig.json` is inside an app directory one level below the project root. Adjust the relative path as needed.

## How It Works

- **Worker-based**: Type generation processes apps in parallel using workers for faster execution.
- **TypeScript only**: Only apps with a `navigator.ts` (not `navigator.js`) get type definitions generated. JavaScript apps are skipped.
- **Export analysis**: The generator inspects the exports of each navigator file to produce accurate type declarations.

::: info
If you add a new app to the fleet or change a navigator's exports, re-run `mariner generate-types` to update the declarations.
:::

::: tip
Include `mariner generate-types` in your CI pipeline or as a pre-commit hook to keep type definitions in sync with your code.
:::
