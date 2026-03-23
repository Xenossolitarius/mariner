# Config API

Imported from `mariner-fe`.

## defineMarinerConfig

Wraps Vite's `defineConfig` with Mariner-specific defaults.

```ts
import { defineMarinerConfig } from 'mariner-fe'

export default defineMarinerConfig({
  mariner: 'my-app',
  plugins: [vue()],
})
```

### Signature

```ts
function defineMarinerConfig(options: MarinerUserConfig): ReturnType<typeof defineConfig>
```

### Mariner Defaults

These are applied automatically and cannot be overridden:

- `build.manifest: true`
- `build.modulePreload.polyfill: false`
- `build.rolldownOptions.input: 'navigator'`
- `build.rolldownOptions.preserveEntrySignatures: 'exports-only'`

User options are deep-merged using `defu` (user values take precedence for non-default fields).

## MarinerUserConfig

Extends Vite's `UserConfig` with Mariner-specific fields.

```ts
type MarinerUserConfig = {
  /** App name — used for routing (/{mariner}/navigator.js) */
  mariner: string
  /** Override the default mount target ID */
  mountId?: string
} & UserConfig
```

| Field     | Type     | Required | Description                                        |
| --------- | -------- | -------- | -------------------------------------------------- |
| `mariner` | `string` | Yes      | App name, used for URL routing. Will be slugified. |
| `mountId` | `string` | No       | Force a specific mount element ID.                 |

All standard Vite config fields (`plugins`, `build`, `css`, `resolve`, etc.) are also accepted.

## MarinerProject

Represents a discovered microfrontend project.

```ts
type MarinerProject = {
  root: string
  configFile: MarinerConfigFile | null
  mariner: string | null
  packageJson: any | null
  navigator?: string
  isJs: boolean
  isValid: boolean
}
```

| Field        | Type                        | Description                                           |
| ------------ | --------------------------- | ----------------------------------------------------- |
| `root`       | `string`                    | Absolute path to the project directory                |
| `configFile` | `MarinerConfigFile \| null` | Parsed mariner.config file                            |
| `mariner`    | `string \| null`            | Slugified app name                                    |
| `navigator`  | `string \| undefined`       | Navigator filename (`navigator.ts` or `navigator.js`) |
| `isJs`       | `boolean`                   | `true` if navigator is `.js` (not TypeScript)         |
| `isValid`    | `boolean`                   | `true` if a navigator file exists                     |

## getMarinerSetup

Discovers all microfrontend projects in the workspace.

```ts
import { getMarinerSetup } from 'mariner-fe'

const setup = await getMarinerSetup({ command: 'serve', mode: 'development' })
// setup.projects — array of MarinerProject
// setup.global.fleet — fleet config or null
```

### Signature

```ts
function getMarinerSetup(config: ConfigEnv): Promise<MarinerOptions>
```

### MarinerOptions

```ts
type MarinerOptions = {
  projects: MarinerProject[]
  global: {
    fleet: FleetConfig | null | false
  }
}
```
