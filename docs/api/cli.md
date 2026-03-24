# CLI Reference

The Mariner CLI is available as `mariner` after installing `mariner-fe`. All commands are powered by Commander.js.

## Common Options

These options are shared across most commands:

| Option                  | Description                            | Default |
| ----------------------- | -------------------------------------- | ------- |
| `--all`                 | Select all discovered navigators       | `false` |
| `--navigator <name>`    | Select a specific navigator by name    | —       |
| `--fleet <name>`        | Select a specific fleet group          | —       |
| `-m, --mode <mode>`     | Vite mode (loads `.env.{mode}`)        | varies  |
| `-t, --threads <n>`     | Worker threads for parallel operations | auto    |
| `-b, --rootBase <base>` | Base path prefix for URLs              | `''`    |
| `-d, --debug`           | Enable debug logging                   | `false` |

### Navigator Selection

When no selection flags (`--all`, `--navigator`, `--fleet`) are provided, the CLI shows an **interactive prompt** with checkboxes, letting you choose which navigators to run or build. Invalid apps (those missing a `navigator.ts/js`) appear in the list but are disabled.

The selection priority is:

1. `--all` — selects everything (overrides other flags)
2. `--navigator <name>` — selects a single app by Mariner name
3. `--fleet <name>` — selects all apps in the named fleet
4. No flags — interactive prompt

### Worker Threads

Commands that use a worker pool (`build`, `generate-types`) default to:

```
threads = Math.min(Math.floor(os.cpus().length / 2), 4)
```

Half of your CPU cores, capped at 4. Override with `-t`:

```bash
mariner build --all --threads 8
```

### Debug Mode

The `-d` or `--debug` flag enables verbose logging:

```bash
mariner dev --all --debug
```

In dev mode, this logs request routing information (which URL hit which Vite server). Useful for diagnosing routing issues in multi-app setups.

---

## mariner dev

Start the development server.

```bash
mariner dev [options]
```

| Option                  | Description                            | Default       |
| ----------------------- | -------------------------------------- | ------------- |
| `-p, --port <port>`     | Server port                            | `3000`        |
| `-h, --hostname <host>` | Server hostname                        | `localhost`   |
| `--https`               | Enable HTTPS with auto-generated certs | `false`       |
| `-m, --mode <mode>`     | Vite mode (loads `.env.{mode}`)        | `development` |
| `--all`                 | Run all discovered navigators          | `false`       |
| `--navigator <name>`    | Run specific navigator(s)              | —             |
| `--fleet <name>`        | Run specific fleet group               | —             |
| `-t, --threads <n>`     | Number of worker threads               | auto          |
| `-b, --rootBase <base>` | Base path prefix for serving           | `''`          |
| `-d, --debug`           | Enable debug logging                   | `false`       |

### How It Works

1. Scans the workspace for `mariner.config.{ts,js}` files
2. Loads fleet config from `fleet.config.json` (if present)
3. Selects apps based on CLI flags or interactive prompt
4. Groups apps by fleet (isolated or shared mode)
5. Creates a raw `node:http` (or `node:https`) server
6. Mounts one Vite dev server per app (isolated) or per fleet (shared) in middleware mode
7. Routes incoming requests to the correct Vite server based on URL path

### HTTPS

The `--https` flag creates a self-signed certificate using `node-forge`:

```bash
mariner dev --https
```

- Certificate is cached at `node_modules/.mariner/_pem.key`
- 30-day validity, automatically renewed when expired
- Browser will show a security warning (accept or add to trust store)

### URL Pattern

Navigators are served at:

```
http(s)://hostname:port/{appname}/navigator.js
```

Examples:

```
http://localhost:3000/app1/navigator.js
http://localhost:3000/shared/navigator.js
https://localhost:3000/app1/navigator.js  (with --https)
```

With `--rootBase`:

```
http://localhost:3000/mybase/app1/navigator.js
```

### CORS

The dev server allows all origins with permissive CORS headers. `OPTIONS` requests return `204 No Content`.

---

## mariner build

Build microfrontends for production.

```bash
mariner build [options]
```

| Option                  | Description                                     | Default      |
| ----------------------- | ----------------------------------------------- | ------------ |
| `-m, --mode <mode>`     | Vite mode                                       | `production` |
| `--ssr`                 | Build for SSR mode (cargo as runtime reference) | `false`      |
| `--all`                 | Build all navigators                            | `false`      |
| `--navigator <name>`    | Build specific navigator(s)                     | —            |
| `--fleet <name>`        | Build specific fleet group                      | —            |
| `-t, --threads <n>`     | Number of worker threads                        | auto         |
| `-b, --rootBase <base>` | Base path prefix for output                     | `''`         |
| `-d, --debug`           | Enable debug logging                            | `false`      |

### Output

```
dist/{appname}/navigator.js        # Main navigator bundle
dist/{appname}/.vite/manifest.json  # Vite asset manifest
dist/{appname}/cargo.js             # Only with --ssr (if cargo.ts exists)
```

### SSR Flag

When `--ssr` is set:

- `useCargo()` calls are replaced with `__MARINER_CARGO__` variable references (not baked data)
- Cargo files are built separately to `dist/{appname}/cargo.js` for the serve server
- The navigator bundle expects `__MARINER_CARGO__` to be defined as a module-scoped constant before it executes

### Build Modes

**Isolated fleet / no fleet:**

- Each app built independently in a worker thread
- Apps built in parallel for speed
- Cross-app imports (`navigator:*`) rewritten to external URLs

**Shared fleet:**

- Single Vite build with multiple entry points
- Shared dependencies extracted into `chunks/` directory
- Intra-fleet imports bundled together
- Cross-fleet imports remain external

### CSS Handling

All CSS is injected into the DOM at runtime via `vite-plugin-css-injected-by-js`. No separate CSS files are produced. This ensures a single-file deployment model.

### Asset Hashing

Static assets are renamed with SHA1 content hashes (8-character base64url): `[name]-[hash].[ext]`. References in code are rewritten automatically.

---

## mariner serve

Start a production server for built navigators with per-request cargo injection.

```bash
mariner serve [options]
```

| Option                  | Description                  | Default     |
| ----------------------- | ---------------------------- | ----------- |
| `-p, --port <port>`     | Server port                  | `3000`      |
| `-h, --hostname <host>` | Server hostname              | `localhost` |
| `-b, --rootBase <base>` | Base path for serving        | `''`        |
| `--dist <dir>`          | Dist directory to serve from | `dist`      |

### Prerequisites

Run `mariner build --ssr` before `mariner serve`. The serve server expects SSR-built navigators with separate cargo files.

### How It Works

1. Scans `dist/` for `navigator.js` files
2. Loads each navigator bundle into memory
3. Checks for corresponding `cargo.js` files

On each request to `/{appname}/navigator.js`:

1. Imports and runs the app's `cargo.js` with cache-busting timestamp
2. If cargo succeeds: prepends `const __MARINER_CARGO__={...};` to the navigator code
3. If cargo fails: serves navigator without cargo data (non-fatal)
4. Returns the response with `Content-Type: application/javascript` and CORS headers

### Static Assets

Requests to `/{appname}/{file}` that aren't `navigator.js` are served as static files from the corresponding `dist/{appname}/` directory.

### Independent Deployment

You can rebuild a single app without affecting others:

```bash
mariner build --ssr --navigator app1
# Replace files in dist/app1/
# Restart serve server for navigator changes
# Cargo changes take effect immediately (dynamically imported per request)
```

::: tip
Navigator code is read into memory at startup — restart the serve server for navigator changes. Cargo changes take effect immediately because cargo modules are dynamically imported per request with cache busting.
:::

---

## mariner generate-types

Generate TypeScript type definitions for all navigators.

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

### Output

`.mariner/mariner.d.ts` — contains `declare module 'navigator:appname'` blocks for each TypeScript navigator.

### Behavior

- JavaScript navigators (`navigator.js`) are **skipped** — no type declarations generated
- Uses `vite-plugin-dts` under the hood to extract types
- Processing is parallelized via the worker pool
- Per-app type files are generated first, then combined into the final declaration file

See [Type Generation](../guide/type-generation) for the full guide.
