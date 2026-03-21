# Navigator

Framework adapters and configuration for microfrontend entry points.

## Concept

A "navigator" is the public interface of a microfrontend — the object it exports for other apps to consume. Each framework has an adapter that wraps the app into a standard navigator shape.

## Adapters

- `createVueNavigator(app)` — Wraps a Vue 3 app instance
- `createReactNavigator(createRoot, component)` — Wraps a React component with ReactDOM.createRoot

## Navigator Config

Defines how navigators are resolved, loaded, and typed. Configuration flows from `mariner.config` into navigator resolution at dev/build time.

## Virtual Module Pattern

Apps import navigators from other apps via `navigator:<appname>`:
```ts
import { pinia } from 'navigator:shared'
```
These are resolved by the `resolve-virtual-navigators` Vite plugin at dev/build time.
