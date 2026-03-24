# ⚓ Mariner

Mariner is a free and open-source framework offering an intuitive and extendable approach to the modern microfrontend architecture.

It provides a number of ways it can be used while maintaining performance, scale, extendibility by being highly agnostic and only enforcing best practices

- Backend template language integration
- Standalone app islands
- Microfrontend federations

### Table of Contents

- ⛵ [How it works](#how-it-works)
- 🚀 [Getting Started](#getting-started)
- 💻 [Framework Development](#framework-development)
- 🧩 [Combine microfrontends](#combine-microfrontends)
- 🚢 [Fleets](#fleets)
- 🌓 [Modes](#modes)
- 🏠 [Local development](#local-development)
- 🚧 [HMR](#hmr)
- 📦 [Cargo (Server-Side Data)](#cargo)
- 🔧 [Build](#build)
- 🚀 [Serve](#serve)
- 🧰 [Type Generation](#type-generation)
- ❤️ [Contribute](#contribute)
- ⚖️ [License](#license)

---

## <a name="how-it-works">⛵ How it works</a>

Mariner is a framework built on top of Vite but unlike module federation it doesn't mandate the developer to opt into a framework per say. Everything which works with Vite has a pretty good chance to work with Mariner microfrontend. Mariner is framework agnostic.
Microfrontend is whatever you decide microfrontend is.

What it does is force modern technological conventions:

### Monorepo

Mariner scans the folder structure and will pick up all the microfrontends inside regardless of the level. Monorepos are not mandatory but they make dependency management easier.

### ES modules

Through aliasing it is enabling the microfrontend coupling and communication assuring the deterministic execution of microfrontends. Everything working on your machine should work on the cloud too.

### Typescript

Although not mandatory it offers type generation that you can easily include into your framework for type safe microfrontends.

### Static builds

Mariner makes microfrontends work like SPA meaning it's full client side rendering.

## <a name="getting-started">🚀 Getting Started</a>

To start with Mariner just install the package with any of the package managers locally or globally.

```bash
npm install mariner-fe
```

Open up any vite project or scaffold a new one, Mariner is framework agnostic. As long as it can be built as ES module its supported.

Create two files in the root project directory:

- mariner.config.js|ts
- navigator.js|ts

For the config just import the vite.config inside your mariner.config
only mandatory field is `mariner` where you need to give a name to the microfrontend for the registration. If you want to use Vue for example just add vue plugin and you are good to go

```ts
/* mariner.config.ts */
import { defineMarinerConfig } from 'mariner-fe'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app1',
  plugins: [vue()],
})
```

The navigator will build as an ES module so you can auto mount a whole app, expose only a few components or make it read the data from the DOM. The choice is full on the developer

```ts
/* navigator.ts */
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'

const app = createApp(App)

export { app }
```

After that you can import it into your DOM any way you see fit (keep in mind of ES module)

```html
<script type="module">
  import { app } from 'http://localhost:3000/app1/navigator.js'
  app.mount('#app1')
</script>
```

or mount it from inside the navigator

```html
<script type="module" src="http://localhost:3000/app1/navigator.js"></script>
```

## <a name="framework-development">💻 Framework Development</a>

Mariner is framework agnostic although it does bundle a Vue and React helpers if you need a XSS safe way to expose your micro apps to the runtime environment. Always be aware when exposing an ES module especially if the DOM is not fully in your control (3rd party integration).

**Vue**

```ts
/* navigator.ts */
import { createVueNavigator } from 'mariner-fe/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'

const app = createApp(App)

export const navigator = createVueNavigator(app)
```

**React**

```ts
/* navigator.ts */
import { createReactNavigator } from 'mariner-fe/navigator'
import { NavigatorApp } from './src/main-navigator'
import ReactDOM from 'react-dom/client'

export const navigator = createReactNavigator(ReactDOM.createRoot, NavigatorApp())
```

## <a name="combine-microfrontends">🧩 Combine microfrontends</a>

Mariner exposes a mechanism of combining microfrontends through module aliasing in build time.
The mechanism is quite simple:
If the name of the microfrontend is for example `app1` then it is going to be prefixed with `navigator:` resulting in an `navigator:app1` import that gets transformed into `/app1/navigator.js` in dev and build. You can add rootBase if you need to shift the hosting to for example `/microfe`.
You can do pretty much everything you can do in your code editor. Beware of extensive granularity because it will make a difference in your network speed and unintentional bundle size.

```vue
<template>
  <button type="button" @click="counterStore.update">Shared store count is {{ counterStore.counter }}</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCounter } from 'navigator:shared'

const counterStore = useCounter()
</script>

<style scoped>
button {
  color: #888;
}
</style>
```

## <a name="fleets">🚢 Fleets</a>

Because the microfrontend workflow can extend to 1k+ developers it can encompass an infinite number of microfrontends. Because this architecture is hard to scale, more dev than build mariner offers an extensive CLI journey for selecting which microfrontends to run.

Also you can predefine a subset of microfrontends to run together via `fleet.config.json`

```json
{
  "team-A": ["app1", "app2"],
  "team-B": ["auth", "app3"]
}
```

Mariner will try to read it in the root of where it was called and has it's own selection journey if the file is detected.

## <a name="modes">🌓 Modes</a>

Mariner can build with modes. It leverages the vite modes enabling the `.env` files to pull specific configurations.

This can be a very powerful feature combined with aliases where you can expose entire configuration in a single microfrontend to the rest of your federation.

Add fleets to the mix and it makes for a really nice CI/CD workflow where you can reduce the amount of builds by just rebuilding the configuration microfrontend and moving it to the rest of the built fleet.

## <a name="local-development">🏠 Local development</a>

There are couple of workflows that are available when using Mariner locally. You can host everything locally in dev mode or you can combine
from other sources like your test/stage environment or prebuilt microfrontends (static hosting). In case you need combination of sources
the [`importmap`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script/type/importmap) is a great native DOM solution to this problem.

For example:

```html
<script type="importmap">
  {
    "imports": {
      "/app1/navigator.js": "http://localhost:3000/app1/navigator.js"
      "/app2/navigator.js": "/app2/navigator.js"
    }
  }
</script>
<script type="module" src="/app1/navigator.js"></script>
<script type="module" src="/app2/navigator.js"></script>
```

This way you can locally host only affected microfrontends and not put such a heavy load to your local machine.

Also you can use this mechanism to override certain microfrontends and redirect to a _different build_ for a specific market you are supporting.

## <a name="hmr">🔥 HMR </a>

Hot Module Replacement works out of the box for all Vite-supported frameworks (Vue, React, etc.). Each microfrontend gets its own HMR WebSocket connection in isolated mode, or shares one in shared fleet mode.

**Cross-app HMR**: When a navigator file changes in one app, all other apps automatically reload to pick up the updated exports. This means editing `shared/navigator.ts` will trigger a reload in every app that imports from `navigator:shared`.

**Cargo HMR**: Changes to `cargo.ts` files trigger an automatic full reload, re-executing the cargo function and injecting fresh data — no manual refresh needed.

## <a name="cargo">📦 Cargo (Server-Side Data)</a>

Sometimes your microfrontend needs data that only exists on the server — API responses, feature flags, database values, environment config. Cargo is a simple way to get that data into your app without client-side fetching.

### How it works

1. Create a `cargo.ts` file next to your navigator
2. Export a `cargo` function that returns whatever data you need
3. Call `useCargo()` anywhere in your app — the data is already there

### Step 1: Define your data

Create `cargo.ts` in your microfrontend root (next to `navigator.ts`). This file runs on the server — you have full access to Node.js, databases, APIs, environment variables, anything.

```ts
/* cargo.ts */
export const cargo = async () => {
  const users = await fetch('https://api.example.com/users').then((r) => r.json())
  return {
    users,
    buildTime: new Date().toISOString(),
    features: { darkMode: true },
  }
}
```

### Step 2: Use the data

Call `useCargo()` from anywhere in your app. It works in the navigator entry, Vue components, React components, or any nested module — there's no restriction on where you call it.

```ts
/* navigator.ts */
import { useCargo } from 'mariner-fe/navigator'

export const cargo = useCargo()
```

```vue
<!-- src/App.vue — works in components too -->
<script setup lang="ts">
import { useCargo } from 'mariner-fe/navigator'

const data = useCargo<{ users: User[]; features: { darkMode: boolean } }>()
</script>

<template>
  <div v-if="data?.features.darkMode">Dark mode enabled</div>
</template>
```

Every call to `useCargo()` in the same app returns the same data — it's a singleton per microfrontend.

### When does the data load?

Cargo adapts to how you're running Mariner:

| How you run it                          | What happens                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `mariner dev`                           | Cargo runs fresh on every page reload during development         |
| `mariner build`                         | Cargo runs once at build time — data is baked into the bundle    |
| `mariner build --ssr` + `mariner serve` | Cargo runs on every request — data is always fresh in production |

For most teams, the default dev and build modes are all you need. The SSR + serve mode is for when you need live data in production without rebuilding.

## <a name="build">🔧 Build </a>

Build and type generation are done by node workers meaning they run in parallel. Mariner generally tries to decouple
dependencies, runtime, build time as much as possible in dev and build. Although the dev server is inefficient to spawn as different processes the build and type generation benefit from parallelization. There is no golden number of threads so the CLI adds the `--threads` flag which enables you to fine tune performance for your fleet and CI/CD.

## <a name="serve">🚀 Serve</a>

If you need your microfrontends to serve fresh data on every request in production (not frozen at build time), Mariner ships a lightweight Node.js server.

```bash
mariner build --ssr    # Build navigators for server-side serving
mariner serve          # Start the production server
```

The serve server does two things on each request:

1. Runs your `cargo.ts` to get fresh data (API calls, database queries, feature flags)
2. Serves the navigator bundle with that data already baked in

This means your users get server-fresh data without any client-side loading spinners or waterfall requests. Each microfrontend gets its own data — there's no cross-contamination between apps.

This also enables **independent deployment**: update one microfrontend's bundle without rebuilding the others. The serve server picks up changes automatically.

## <a name="type-generation">🧰 Type generation </a>

Mariner takes **typescript** as a first class citizen and exposes a command `generate` which will ,as long as the navigator is in typescript, generate
a folder from the microfrontend selection named `.mariner` which will contain all the exposed types.

From there you can opt-in into using those types by importing them to your local `tsconfig` file

## <a name="contribute">❤️ Contribute</a>

We invite you to contribute and help improve Mariner 💚

## <a name="license">⚖️ License</a>

[MIT](./LICENSE)
