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
- 🔧 [Build](#build)
- 🧰 [Type Generation](#type-generation)
- ❤️ [Contribute](#contribute)
- ⚖️ [License](#license)

---

## <a name="how-it-works">⛵ How it works</a>

Mariner is a framework built on top of Vite but unlike module federation it doesn't mandate the developer to opt into a framework per say. Everything which works with Vite has a pretty good chance to
work with Mariner microfrontend. Mariner is framework agnostic. 
Microfrontend is whatever you decide microfrontend is.
What it does is force modern technological directions: 

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
npm install mariner-io
```

Open up any vite project or scaffold a new one, Mariner is framework agnostic. As long as it can be built as es module its supported.

Create two files in the root project directory:

- mariner.config.js|ts
- navigator.js|ts

For the config just import the vite.config inside your mariner.config
only mandatory field is `mariner` where you need to give a name to the microfrontend for the registration. If you want to use Vue for example just add vue plugin and you are good to go

```ts
/* mariner.config.ts */
import { defineMarinerConfig } from 'mariner-io'
import vue from '@vitejs/plugin-vue'

export default defineMarinerConfig({
  mariner: 'app1',
  plugins: [vue()],
  build: {
    rollupOptions: {
      external: ['vue'],
    },
  },
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
  import {navigator} from 'http://localhost:3000/app1/navigator.js'
  navigator.mount('#app1')
</script>
```

or mount it from inside the navigator

```html
<script type="module" src="http://localhost:3000/app1/navigator.js"></script>
```

## <a name="framework-development">💻 Framework Development</a>

Mariner is framework agnostic although it does bundle a Vue and React helpers if you need a XSS safe way to expose your micro apps to the runtime environment. Always be aware when exposing an ESModule especially if the DOM is not fully in your control (3rd party integration).

**Vue**

```ts
/* navigator.ts */
import { createVueNavigator } from 'mariner-io/navigator'
import { createApp } from 'vue'
import './src/style.css'
import App from './src/App.vue'

const app = createApp(App)

export const navigator = createVueNavigator(app)

```

**React**

```ts
/* navigator.ts */
import { createReactNavigator } from 'mariner-io/navigator';
import { NavigatorApp } from './src/main-navigator'
import ReactDOM from 'react-dom/client'

export const navigator = createReactNavigator(ReactDOM.createRoot, NavigatorApp())

```

## <a name="combine-microfrontends">🧩 Combine microfrontends</a>

Mariner exposes a mechanism of combining microfrontends through module aliasing in build time
The mechanism is quite simple:
If the name of the microfrontend is for example `app1` then it is going to be prefixed with `navigator:` resulting in an `navigator:app1` import that gets transformed into `/app1/navigator.js` in dev and build. You can add rootBase if you need to shift the hosting to for example  `/microfe`.
You can do pretty much everything you can do in your code editor. Beware of extensive granularity because it will make a difference in your network speed and unintentional bundle size.

## <a name="fleets">🚢 Fleets</a>

Because the microfrontend workflow can extend to 1k+ developers it can encompass an infinite number of microfrontends. Bcs this architecture is hard to scale, more than dev then build mariner offers an extensive CLI journey for selecting which microfrontends to run. 

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

Also you can use this mechanism to override certain microfrontends and redirect to a *different build* for a specific market you are supporting.

## <a name="hmr">🚧 HMR </a>

Hmr is available for most Vite supported frameworks although it requires a bit of manual setup (refer to playground) and launches one WS connection per micro app. It's WIP.

## <a name="build">🔧 Build </a>

Build and type generation are done by node workers meaning they run in parallel. Mariner generally tries to decouple 
dependencies, runtime, build time as much as possible in dev and build. Although the dev server is inefficient to spawn as different processes the build and type generation benefit from parallelization. There are no golden number of threads so the CLI adds the `--threads` flag which enables you to fine tune for your fleet and CI/CD.

## <a name="type-generation">🧰 Type generation </a>

Mariner takes **typescript** as a first class citizen and exposes a command `generate` which will as long as the navigator is in typescript generate 
a folder from the microfrontend selection named `.mariner` which will contain all the exposed types.

From there you can opt-in into using those types by importing them to your local `tsconfig` file

## <a name="contribute">❤️ Contribute</a>

We invite you to contribute and help improve Mariner 💚

## <a name="license">⚖️ License</a>

[MIT](./LICENSE)