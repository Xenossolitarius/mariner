# Serve Mode

Serve mode is Mariner's production server for microfrontends that need **per-request server-side data**. It pairs with SSR builds to deliver dynamic cargo data without rebuilding navigators.

## Workflow

### 1. Build with SSR

```bash
mariner build --ssr
```

This produces two files per app (in `dist/{appname}/`):

- **`navigator.js`** — the bundled microfrontend, with `useCargo()` compiled to a `__MARINER_CARGO__` reference
- **`cargo.js`** — the compiled cargo function, ready to execute on the server

Apps without a `cargo.ts` file only produce `navigator.js`.

### 2. Start the Serve Server

```bash
mariner serve
```

Options:

| Flag                        | Default     | Description                        |
| --------------------------- | ----------- | ---------------------------------- |
| `-p, --port <port>`         | `3000`      | Port number                        |
| `-h, --hostname <hostname>` | `localhost` | Hostname to bind                   |
| `-b, --rootBase <base>`     | `""`        | Base path for serving              |
| `--dist <dir>`              | `dist`      | Path to the build output directory |

Example with options:

```bash
mariner serve --port 8080 --dist ./build-output
```

## How It Works

When the serve server starts:

1. **Scans** the `dist/` directory for subdirectories containing `navigator.js`
2. **Loads** each navigator bundle into memory (read once at startup)
3. **Checks** for corresponding `cargo.js` files in each app's directory

When a request arrives for `/{appname}/navigator.js`, the serve server:

1. **Runs cargo** — dynamically imports `cargo.js` and executes the exported function
2. **Serializes the result** — converts the cargo data to JSON
3. **Prepends to response** — injects the data as a module-scoped constant at the top of the navigator code
4. **Serves the combined response** — sends the result with `Content-Type: application/javascript`

```
Request: GET /app1/navigator.js

Response:
  const __MARINER_CARGO__={"greeting":"Hello","timestamp":1711234567890};
  // ... rest of navigator.js bundle
```

::: info
The `__MARINER_CARGO__` constant is declared at module scope, not on `globalThis`. When multiple navigators are loaded on the same page, each gets its own scoped data with no cross-contamination.
:::

## Cache Busting

The serve server uses a timestamp query parameter when importing cargo modules:

```ts
await import(`${cargoPath}?t=${Date.now()}`)
```

This ensures Node.js does not serve a cached version of the cargo module between requests. Each request gets fresh data from a fresh cargo execution.

## Cargo Failure Handling

If the cargo function throws an error, the serve server still responds with the navigator code — just without the cargo data prepended. This ensures the microfrontend remains available even when the data layer has a transient failure.

::: warning
When cargo fails silently, `useCargo()` in the browser will receive the `__MARINER_CARGO__` reference as `undefined`. Design your app to handle missing cargo data gracefully:

```ts
const cargo = useCargo<MyData>()
const greeting = cargo?.greeting ?? 'Default greeting'
```

:::

## Apps Without Cargo

If an app was built with `--ssr` but doesn't have a `cargo.ts` file, the serve server serves `navigator.js` as-is, without any cargo injection. The app works normally — `useCargo()` simply returns `null`.

## Independent Deployment

Because the serve server loads `cargo.js` dynamically and reads `navigator.js` from disk at startup, you can update individual microfrontends independently:

### Updating Cargo Only

Cargo changes take effect immediately — no server restart needed:

1. Rebuild only the changed app: `mariner build --ssr --navigator app1`
2. Replace `dist/app1/cargo.js`
3. The next request automatically picks up the new cargo module (cache busting)

### Updating Navigator Code

Navigator changes require a server restart since bundles are read into memory at startup:

1. Rebuild: `mariner build --ssr --navigator app1`
2. Replace `dist/app1/navigator.js`
3. Restart the serve server

::: tip
For zero-downtime deployments, consider running multiple serve instances behind a load balancer and rolling restarts.
:::

### Updating a Single App

```bash
# Rebuild only app1
mariner build --ssr --navigator app1

# Replace files in dist/app1/
# Other apps (app2, shared, etc.) are untouched

# Restart serve server
mariner serve --port 4200
```

## Static Assets

The serve server also handles static asset requests:

- Any request matching `/{appname}/*` that is not `navigator.js` is served as a static file from `dist/{appname}/`
- Asset files include images, fonts, and other hashed files produced by the build
- CORS headers are set on all responses (`Access-Control-Allow-Origin: *`)
- Non-matching paths return `404`

### Example Asset Requests

```
GET /app1/navigator.js         → cargo injection + navigator bundle
GET /app1/logo-x8Kj2mN1.png   → static file from dist/app1/
GET /app1/.vite/manifest.json  → manifest file
GET /nonexistent/anything      → 404
```

## Root Base Path

Use `--rootBase` when deploying under a subpath:

```bash
mariner serve --rootBase /microfrontends
```

This changes the expected URL pattern:

```
GET /microfrontends/app1/navigator.js   → serves app1
GET /microfrontends/shared/navigator.js → serves shared
```

## Architecture Overview

```
Browser                    Serve Server                   Disk
  |                            |                            |
  |  GET /app1/navigator.js   |                            |
  |--------------------------->|                            |
  |                            |  import cargo.js?t=...    |
  |                            |--------------------------->|
  |                            |  cargo data               |
  |                            |<---------------------------|
  |                            |                            |
  |                            |  prepend __MARINER_CARGO__ |
  |                            |  to navigator.js code      |
  |                            |                            |
  |  const __MARINER_CARGO__   |                            |
  |  = {...};                  |                            |
  |  // navigator.js bundle    |                            |
  |<---------------------------|                            |
```

## Production Deployment Checklist

1. Build with SSR: `mariner build --all --ssr`
2. Verify `dist/` contains `navigator.js` (and `cargo.js` where applicable) for each app
3. Deploy the `dist/` directory to your server
4. Start the serve server: `mariner serve --port 4200 --dist ./dist`
5. Configure your reverse proxy (nginx, Caddy, etc.) to forward requests to the serve server
6. Set up health checks and monitoring for the serve process
7. Test cargo data is being injected correctly in the browser
