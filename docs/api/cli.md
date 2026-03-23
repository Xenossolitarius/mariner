# CLI Reference

The Mariner CLI is available as `mariner` after installing `mariner-fe`.

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

When run without `--all` or `--navigator`, an interactive CLI prompts you to select which navigators to run.

## mariner build

Build all microfrontends for production.

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

Output goes to `dist/{appname}/navigator.js`.

When `--ssr` is set:

- `useCargo()` calls are replaced with `__MARINER_CARGO__` variable references (not baked data)
- Cargo files are built separately to `dist/{appname}/cargo.js` for the serve server

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

::: tip
Run `mariner build --ssr` before `mariner serve`. The serve server expects SSR-built navigators with separate cargo files.
:::

On each request to `/{appname}/navigator.js`:

1. Runs the app's `cargo.js` to get fresh data
2. Prepends `const __MARINER_CARGO__={...};` to the navigator response
3. Serves the combined response with CORS headers

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

Output: `.mariner/mariner.d.ts` with `declare module 'navigator:appname'` blocks for each TypeScript navigator. JavaScript navigators are skipped.
