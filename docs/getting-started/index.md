# Introduction

Mariner is an open-source microfrontend framework built on [Vite 8](https://vite.dev/) (Rolldown). It is framework-agnostic, supporting Vue, React, and plain JavaScript microfrontends with backend template integration and app islands.

## Why Mariner?

Traditional microfrontend setups require complex build tooling, shared dependency management, and custom module federation configurations. Mariner simplifies this by leveraging Vite's native dev server and build pipeline:

- **Framework-agnostic** -- build microfrontends with Vue, React, or vanilla JS, and compose them freely.
- **Dependency isolation** -- each app gets its own Vite dev server in development, so different apps can use different versions of the same dependency without conflict.
- **Virtual module imports** -- apps import from other apps using the `navigator:<appname>` syntax, making cross-app communication explicit and type-safe.
- **Zero HTTP framework overhead** -- the dev server runs on raw `node:http` with no Express, Koa, or connect dependency.

## Prerequisites

- **Node.js >= 20.19** (see `.nvmrc` in any Mariner project)
- **pnpm** is the recommended package manager, especially for monorepo setups

## Installation

Install the `mariner-fe` package in your project:

```bash
npm install mariner-fe
```

Or with pnpm:

```bash
pnpm add mariner-fe
```

::: info Peer Dependency
Mariner requires Vite as a peer dependency. It supports Vite versions 5 through 8:

```bash
pnpm add vite
```

:::

## What You Get

The `mariner-fe` package provides:

- **A CLI** (`mariner dev`, `mariner build`, `mariner serve`) for developing, building, and serving microfrontends.
- **Config helpers** like `defineMarinerConfig()` for type-safe app configuration.
- **Navigator utilities** like `createVueNavigator()` and `createReactNavigator()` for bootstrapping framework-specific microfrontends.
- **Fleet mode** for orchestrating multiple apps together during development and builds.

## Next Steps

Head to the [Quick Start](./quick-start) to create your first microfrontend with Mariner.
