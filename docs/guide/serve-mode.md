# Serve Mode

Serve mode is Mariner's production server for microfrontends that need **per-request server-side data**. It pairs with SSR builds to deliver dynamic cargo data without rebuilding navigators.

## Workflow

### 1. Build with SSR

```bash
mariner build --ssr
```

This produces two files per app (in `dist/{appname}/`):

- **`navigator.js`** -- the bundled microfrontend, with `useCargo()` compiled to a `__MARINER_CARGO__` reference
- **`cargo.js`** -- the compiled cargo function, ready to execute on the server

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

When a request arrives for `/{appname}/navigator.js`, the serve server:

1. **Runs cargo** -- dynamically imports `cargo.js` and executes the exported function
2. **Serializes the result** -- converts the cargo data to JSON
3. **Prepends to response** -- injects the data as a module-scoped constant at the top of the navigator code
4. **Serves the combined response** -- sends the result with `Content-Type: application/javascript`

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

This ensures Node.js does not serve a cached version of the cargo module between requests. Each request gets fresh data.

## Cargo Failure Handling

If the cargo function throws an error, the serve server still responds with the navigator code -- just without the cargo data prepended. This ensures the microfrontend remains available even when the data layer has a transient failure.

::: warning
When cargo fails silently, `useCargo()` in the browser will receive the `__MARINER_CARGO__` reference as `undefined`. Design your app to handle missing cargo data gracefully.
:::

## Independent Deployment

Because the serve server loads `cargo.js` dynamically and reads `navigator.js` from disk, you can update a single microfrontend without rebuilding or restarting others:

1. Rebuild only the changed app: `mariner build --ssr --navigator app1`
2. Replace the files in `dist/app1/`
3. The next request picks up the new code automatically (cargo is re-imported with cache busting, navigator code is read at startup)

::: tip
For navigator code changes to take effect, the serve server must be restarted since navigator bundles are read into memory at startup. Cargo changes take effect immediately because cargo modules are dynamically imported per request.
:::

## Static Assets

The serve server also handles static asset requests. Any request matching `/{appname}/*` that is not `navigator.js` is served as a static file from the corresponding `dist/{appname}/` directory. CORS headers are set on all responses.

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
