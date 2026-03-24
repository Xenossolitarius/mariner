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

- **`apps`** — array of app names (matching each app's Mariner name from `mariner.config.ts`)
- **`mode`** — either `"isolated"` or `"shared"`

### Legacy Format

A shorthand array format is auto-normalized to isolated mode:

```json
{
  "fleet-name": ["app1", "app2"]
}
```

This is equivalent to `{ "apps": ["app1", "app2"], "mode": "isolated" }`.

### Schema Validation

Fleet config is validated with an AJV JSON schema at load time. Invalid configs produce a warning but are non-fatal — the invalid fleet is simply ignored.

Requirements:

- Each fleet value must be an object with `apps` (string array) and `mode` (`"isolated"` or `"shared"`)
- Or a plain string array (legacy format, auto-normalized)

## Modes

### Isolated Mode

Each app gets its own Vite dev server. This provides **full dependency isolation** — different apps can use different versions of the same package without conflicts.

| Benefit              | Detail                                                 |
| -------------------- | ------------------------------------------------------ |
| Dependency isolation | App A can use Vue 3.4 while App B uses Vue 3.5         |
| No side effects      | One app crashing its dev server does not affect others |
| Independent config   | Each app uses its own `mariner.config.ts` fully        |
| Independent HMR      | Each app has its own HMR WebSocket connection          |

**Dev server behavior:**

- One Vite dev server per app, mounted at `/{appname}/`
- Each server has unique HMR port to avoid collisions
- Each server runs its own dependency pre-bundling

**Build behavior:**

- Apps built in parallel via worker pool
- Each app produces an independent `dist/{appname}/navigator.js`
- Cross-app imports are external URLs (`/{appname}/navigator.js`)
- No shared chunks — each app is fully self-contained

### Shared Mode

All apps in the fleet share a single Vite dev server. This trades isolation for speed and deduplication.

| Benefit             | Detail                                                     |
| ------------------- | ---------------------------------------------------------- |
| Faster startup      | One Vite server instead of many                            |
| Shared dependencies | Common packages are pre-bundled once                       |
| PostCSS sharing     | Tailwind and other PostCSS plugins are configured once     |
| Lower memory        | Single `node_modules` resolution and dep optimization pass |
| Build deduplication | Shared code extracted into common chunks                   |

**Dev server behavior:**

- Single Vite dev server for all fleet apps
- Apps served under `/{fleet-name}/{appname}/navigator.js`
- Plugins from all apps are merged (deduped by plugin name)
- Single HMR WebSocket connection
- Shared `@vite/client` and pre-bundled dependencies

**Build behavior:**

- Single Vite build with multiple entry points
- Rolldown extracts shared code into `chunks/` directory
- Intra-fleet `navigator:*` imports are resolved to file paths (bundled together)
- Cross-fleet imports remain external
- Significantly smaller total output when apps share large dependencies

**Shared build output example:**

```
dist/
  app1/
    navigator.js         # references shared chunks
  shared/
    navigator.js
  tailwind-vue/
    navigator.js
  chunks/
    vue-DkE3x9f2.js      # shared Vue code
    pinia-Bx7mK1a3.js    # shared Pinia code
```

::: info
An app can appear in multiple fleets. This is useful when the same app needs to be tested both in isolation and as part of a shared group.
:::

## Virtual Module Resolution in Fleets

How `navigator:*` imports behave depends on the fleet mode and whether the target app is in the same fleet:

| Source Fleet | Target App | Mode     | Resolution                               |
| ------------ | ---------- | -------- | ---------------------------------------- |
| shared-vue   | shared     | shared   | Resolved to file path (bundled together) |
| shared-vue   | app3       | isolated | External URL (`/app3/navigator.js`)      |
| test         | app1       | isolated | External URL (`/app1/navigator.js`)      |
| standalone   | lazy       | isolated | External URL (`/lazy/navigator.js`)      |

In shared mode, same-fleet imports become direct file imports — the browser doesn't need a separate network request. This is the key advantage of shared builds.

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

The `--all` flag starts every app. Apps assigned to fleets are grouped by their fleet configuration. Apps not assigned to any fleet get their own isolated group.

### Run a single navigator

```bash
mariner dev --navigator app1
```

This bypasses fleet grouping and starts a single app in isolation.

::: tip
When no flags are provided, the CLI presents an interactive prompt letting you choose which fleets or navigators to start.
:::

## Build with Fleets

Fleet selection works the same way for builds:

```bash
mariner build --fleet test
mariner build --fleet shared-vue
mariner build --all
```

The build system respects the fleet's mode:

- **Isolated fleets**: Apps built in parallel via worker pool, independent output
- **Shared fleets**: Single multi-entry Vite build, shared chunks extracted

## When to Use Which Mode

### Use Shared Mode When:

- Apps share a CSS framework (Tailwind, UnoCSS)
- Apps share a state manager (Pinia, Zustand)
- Apps share a component library
- You want faster dev server startup
- You want smaller production bundles via deduplication
- Apps are owned by the same team

### Use Isolated Mode When:

- Apps have conflicting dependency versions
- Apps need different Vite plugin configurations
- Apps are owned by different teams that deploy independently
- You need maximum reliability (one app can't break others)
- Apps use different frameworks (Vue + React)

::: warning
Shared mode requires that all apps in the fleet are compatible with a single Vite configuration. If one app needs a Vite plugin that conflicts with another, use isolated mode instead.
:::

## Unassigned Apps

When using `--all`, apps that don't appear in any fleet are automatically placed in their own isolated groups. This ensures all apps are included even if `fleet.config.json` doesn't cover every app in the workspace.
