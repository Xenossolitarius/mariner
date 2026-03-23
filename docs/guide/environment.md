# Environment Variables

Mariner follows Vite's conventions for environment variables, with an additional framework-level prefix.

## Variable Prefixes

### `VITE_` -- Client-Exposed Variables

Variables prefixed with `VITE_` are exposed to your client-side code via `import.meta.env`. This is standard Vite behavior.

```
VITE_API_URL=https://api.example.com
```

```ts
// Available in your app code
console.log(import.meta.env.VITE_API_URL)
```

### `MARINER_` -- Framework-Level Variables

Variables prefixed with `MARINER_` are used by the Mariner framework itself. These control framework behavior and are not automatically exposed to client code.

::: warning
Do not use `MARINER_`-prefixed variables for application logic. They are reserved for the framework.
:::

## `.env` File Loading

Mariner loads environment files in the following order, where later files override earlier ones:

| File                | Purpose                              | Committed to git? |
| ------------------- | ------------------------------------ | ----------------- |
| `.env`              | Base defaults, loaded in all modes   | Yes               |
| `.env.local`        | Local overrides, loaded in all modes | No                |
| `.env.{mode}`       | Mode-specific variables              | Yes               |
| `.env.{mode}.local` | Mode-specific local overrides        | No                |

::: info
Files ending in `.local` are intended for machine-specific overrides and should be added to `.gitignore`.
:::

## Modes

The mode determines which `.env.{mode}` file is loaded. Common modes:

- `development` -- used during `mariner dev`
- `production` -- used during `mariner build`
- `test` -- used when running tests

### Setting a Custom Mode

Use the `--mode` flag to set the mode explicitly:

```bash
mariner dev --mode staging
```

This will load `.env.staging` and `.env.staging.local` in addition to the base `.env` files.

### Mode-Specific Overrides

Variables in mode-specific files override those in the base `.env`:

```bash
# .env
VITE_API_URL=https://api.example.com

# .env.test
VITE_API_URL=http://localhost:3001
```

When running in test mode, `VITE_API_URL` resolves to `http://localhost:3001`.

::: tip
Use `.env.test` to configure test-specific endpoints or feature flags without affecting development or production.
:::
