# API Reference

Mariner exposes three package entry points:

| Entry     | Import                                       | Contents                               |
| --------- | -------------------------------------------- | -------------------------------------- |
| Main      | `import { ... } from 'mariner-fe'`           | Config helpers, setup functions, types |
| Navigator | `import { ... } from 'mariner-fe/navigator'` | Framework adapters, `useCargo`         |
| Plugins   | `import { ... } from 'mariner-fe/plugins'`   | Vite plugins for build/dev             |

## Pages

- [Config](/api/config) — `defineMarinerConfig`, `MarinerUserConfig`, project types
- [Navigator](/api/navigator) — `createVueNavigator`, `createReactNavigator`, `useCargo`
- [Plugins](/api/plugins) — Vite plugins for virtual module resolution, cargo, and asset transforms
- [Constants](/api/constants) — Framework constants (`FILES`, `NAVIGATOR_MODULE_PREFIX`, etc.)
- [CLI](/api/cli) — `mariner dev`, `mariner build`, `mariner serve`, `mariner generate-types`
