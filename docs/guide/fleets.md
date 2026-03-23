# Fleets

A **fleet** groups microfrontends together so they can be developed and built as a unit. Fleet configuration lives in `fleet.config.json` at the project root.

## Configuration

```json
{
  "test": {
    "apps": ["app1", "app2"],
    "mode": "isolated"
  },
  "shared-vue": {
    "apps": ["app1", "tailwind-vue", "shared"],
    "mode": "shared"
  },
  "standalone": {
    "apps": ["app3", "lazy", "js-test", "envs"],
    "mode": "isolated"
  }
}
```

Each key is the fleet name. The value specifies:

- **`apps`** -- array of app names (matching each app's Mariner name from `mariner.config.ts`)
- **`mode`** -- either `"isolated"` or `"shared"`

## Modes

### Isolated Mode

Each app gets its own Vite dev server. This provides **full dependency isolation** -- different apps can use different versions of the same package without conflicts.

| Benefit              | Detail                                                 |
| -------------------- | ------------------------------------------------------ |
| Dependency isolation | App A can use Vue 3.4 while App B uses Vue 3.5         |
| No side effects      | One app crashing its dev server does not affect others |
| Independent config   | Each app uses its own `vite.config.ts` fully           |

### Shared Mode

All apps in the fleet share a single Vite dev server. This trades isolation for speed.

| Benefit             | Detail                                                     |
| ------------------- | ---------------------------------------------------------- |
| Faster startup      | One Vite server instead of many                            |
| Shared dependencies | Common packages are pre-bundled once                       |
| PostCSS sharing     | Tailwind and other PostCSS plugins are configured once     |
| Lower memory        | Single `node_modules` resolution and dep optimization pass |

::: info
An app can appear in multiple fleets. This is useful when the same app needs to be tested both in isolation and as part of a shared group.
:::

## CLI Flags

### Run a specific fleet

```bash
mariner dev --fleet shared-vue
```

This starts only the apps listed in the `shared-vue` fleet.

### Run all fleets

```bash
mariner dev --all
```

The `--all` flag starts every fleet defined in `fleet.config.json`.

### Run a single navigator

```bash
mariner dev --navigator app1
```

This bypasses fleet grouping and starts a single app.

::: tip
When no flags are provided, the CLI presents an interactive prompt letting you choose which fleets or navigators to start.
:::

## Build with Fleets

Fleet selection works the same way for builds:

```bash
mariner build --fleet test
mariner build --all
```

The build system uses a worker pool to build apps in parallel within each fleet.

## When to Use Which Mode

- Use **shared** mode when apps share a CSS framework (e.g., Tailwind), a component library, or a state manager, and you want fast dev startup.
- Use **isolated** mode when apps have conflicting dependencies, need different Vite plugin configurations, or are owned by different teams that deploy independently.

::: warning
Shared mode requires that all apps in the fleet are compatible with a single Vite configuration. If one app needs a Vite plugin that conflicts with another, use isolated mode instead.
:::
