# Dev Server Architecture

Mariner's dev server is built on raw `node:http` — no Express, Koa, or connect. Each microfrontend gets its own Vite dev server in middleware mode, providing full dependency isolation during development.

## Overview

When you run `mariner dev`, the framework:

1. **Discovers** all apps by scanning for `mariner.config.{ts,js}` files
2. **Selects** which apps to run (via CLI flags or interactive prompt)
3. **Groups** apps by fleet configuration (if any)
4. **Creates** a Vite dev server per app (isolated mode) or per fleet (shared mode)
5. **Mounts** each Vite server as middleware on the HTTP server
6. **Routes** requests to the correct app based on URL path

## Isolated Mode Architecture

In isolated mode, each app gets its own Vite dev server instance. This is the default behavior and provides maximum isolation.

```
Browser
  │
  ├─ GET /app1/navigator.js ──► Vite Server (app1) ──► app1/navigator.ts
  ├─ GET /app2/navigator.js ──► Vite Server (app2) ──► app2/navigator.ts
  └─ GET /shared/navigator.js ─► Vite Server (shared) ► shared/navigator.ts
```

Each Vite server:
- Has its own `node_modules` resolution
- Runs its own dependency optimization (`optimizeDeps`)
- Has its own HMR WebSocket connection
- Uses its own `mariner.config.ts` as the Vite config

### Benefits

- **True isolation**: App A using Vue 3.4 doesn't conflict with App B using Vue 3.5
- **Independent crashes**: One app's dev server crashing doesn't affect others
- **Full config independence**: Each app can use completely different Vite plugins

### Trade-offs

- **Higher memory usage**: One Vite instance per app
- **Slower startup**: Multiple servers must initialize and optimize dependencies
- **No shared pre-bundling**: Common packages are pre-bundled separately for each app

## Shared Mode Architecture

In shared mode (configured via `fleet.config.json`), all apps in a fleet share a single Vite dev server.

```
Browser
  │
  ├─ GET /fleet-name/app1/navigator.js ─┐
  ├─ GET /fleet-name/app2/navigator.js ──┼── Single Vite Server
  └─ GET /fleet-name/shared/navigator.js ┘
```

The shared server:
- Merges plugins from all apps (deduped by plugin name)
- Has a single `optimizeDeps` pass covering all apps
- Uses one HMR WebSocket connection for all apps
- Serves shared assets (like `@vite/client`) at the fleet base path

### Benefits

- **Faster startup**: One Vite server instead of many
- **Shared pre-bundling**: Common packages optimized once
- **Lower memory**: Single `node_modules` resolution
- **Shared PostCSS**: Tailwind and other CSS tools configured once

### Trade-offs

- **No dependency isolation**: All apps must use compatible dependency versions
- **Shared plugin config**: Conflicting plugins cause errors
- **Coupled failures**: A bad plugin in one app can break the shared server

## Request Routing

The HTTP server routes requests based on URL path segments.

### Isolated Mode Routing

```
Request: GET /app1/navigator.js
         ↓
Strip base (/app1) → /navigator.js
         ↓
Pass to app1's Vite middleware
         ↓
Vite transforms and returns navigator.ts
```

### Shared Mode Routing

```
Request: GET /fleet-name/app1/navigator.js
         ↓
Match fleet base path → shared-vue fleet
         ↓
Pass to fleet's Vite middleware
         ↓
Vite resolves app1/navigator.ts from multi-entry config
```

### Special Paths

| Path Pattern                      | Handler                           |
| --------------------------------- | --------------------------------- |
| `/{appname}/navigator.js`        | Navigator entry (transformed)     |
| `/{appname}/@vite/client`        | Vite client runtime (HMR)        |
| `/{appname}/node_modules/...`    | Pre-bundled dependencies          |
| `/{appname}/@react-refresh`      | React refresh runtime (if React)  |
| `/{appname}/src/...`             | Source files (HMR, source maps)   |

## HMR (Hot Module Replacement)

### Port Allocation

Each isolated app needs its own WebSocket port for HMR. Mariner calculates unique ports to avoid collisions:

```
hmrPort = basePort + (serverPort - 3000) * 100 + appIndex
```

For example, with the default server port 3000 and base HMR port:
- App 0: port calculated from base + index 0
- App 1: port calculated from base + index 1
- etc.

In shared mode, all apps use a single HMR port since they share one Vite instance.

### HMR Protocol

- **HTTP mode**: Uses `ws://` WebSocket protocol
- **HTTPS mode**: Uses `wss://` WebSocket protocol

The HMR client URL is configured automatically based on the server's hostname and the calculated port.

## HTTPS Support

Enable HTTPS with the `--https` flag:

```bash
mariner dev --https
```

Mariner auto-generates a self-signed certificate using `node-forge`:

- Certificate cached at `node_modules/.mariner/_pem.key`
- 30-day validity period
- Automatically renewed when expired
- Uses `node:https` instead of `node:http` for the server

::: warning
Self-signed certificates will trigger browser security warnings. You'll need to accept the certificate or add it to your system's trust store for local development.
:::

## CORS Headers

The dev server sets permissive CORS headers on all responses:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: *
Access-Control-Allow-Headers: *
```

`OPTIONS` preflight requests return `204 No Content`. This ensures microfrontends can be loaded from any host page during development, regardless of origin.

## Dependency Pre-bundling

Mariner configures Vite's `optimizeDeps.entries` to point at each app's navigator file. This tells Vite which entry points to scan for dependency discovery during pre-bundling.

Virtual module imports (`navigator:*`) are added to `optimizeDeps.exclude` to prevent Vite from trying to pre-bundle cross-app imports (they're resolved at runtime, not at the file system level).

## Debug Mode

Use the `-d` or `--debug` flag to enable debug logging:

```bash
mariner dev --debug
```

This logs request routing information to the console, showing which requests are handled by which Vite server. Useful for diagnosing routing issues in multi-app setups.

## Port and Host Configuration

| Flag                  | Default     | Description                        |
| --------------------- | ----------- | ---------------------------------- |
| `-p, --port <port>`   | `3000`      | HTTP server port                   |
| `-h, --hostname <host>` | `localhost` | Hostname to bind                 |
| `--https`             | `false`     | Enable HTTPS with self-signed cert |

Example:

```bash
mariner dev --port 8080 --hostname 0.0.0.0
```

This makes the dev server accessible on all network interfaces at port 8080, useful for testing on other devices on your local network.
