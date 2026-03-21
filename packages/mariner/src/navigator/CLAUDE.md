# Navigator

Framework adapters and configuration for microfrontend entry points.

## Concept

A "navigator" is the public interface of a microfrontend — the object it exports for other apps to consume. Each framework has an adapter that wraps the app into a standard `{ mount, unmount }` shape.

## Adapters

- `createVueNavigator(app)` — Wraps a Vue 3 app instance. Delegates `mount`/`unmount` to Vue's app methods.
- `createReactNavigator(createRoot, component)` — Wraps a React component with ReactDOM.createRoot. Manages root lifecycle internally.

## Navigator Config

- `defineNavigator(options)` — Simple passthrough helper for type-safe navigator definition

## Virtual Module Pattern

Apps import navigators from other apps via `navigator:<appname>`:

```ts
import { pinia } from 'navigator:shared'
```

These are resolved by the `resolve-virtual-navigators` Vite plugin at dev/build time.

- Dev: marked as external, served at `/{appname}/navigator.js`
- Build: rewritten to `/appname/navigator.js`, marked as external in bundle
