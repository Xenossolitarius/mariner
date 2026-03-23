---
layout: home

hero:
  name: Mariner
  text: Microfrontend Framework
  tagline: Built on Vite 8. Framework-agnostic. Zero HTTP framework deps.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/
    - theme: alt
      text: API Reference
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/Xenossolitarius/mariner

features:
  - title: Framework Agnostic
    details: Works with Vue, React, or plain JavaScript. If it works with Vite, it works with Mariner.
  - title: Dependency Isolation
    details: Each microfrontend gets its own Vite dev server. Different apps can use different versions of the same dependency.
  - title: Cargo - Server-Side Data
    details: Inject server-side data into your microfrontends with useCargo(). Fetch from APIs, databases, or environment variables.
  - title: Zero HTTP Framework Deps
    details: Raw node:http server with no Express, Koa, or connect. Minimal footprint, maximum control.
  - title: Fleet Mode
    details: Group microfrontends into fleets with shared or isolated Vite servers. Scale from 2 apps to 1000+.
  - title: Type-Safe Cross-App Imports
    details: Import from other microfrontends with navigator:appname syntax. Full TypeScript support with generated type definitions.
---
