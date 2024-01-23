import type { App } from 'vue'
import type ReactDOM from 'react-dom/client'
import type React from 'react'

export type Navigator = {
  mount: (id: string) => void
  unmount: () => void
}

export const createVueNavigator = (app: App<Element>): Navigator => ({ mount: app.mount, unmount: app.unmount })

export const createReactNavigator = (rootFactory: typeof ReactDOM.createRoot, app: React.ReactNode): Navigator => {
  let root: ReactDOM.Root | null = null

  return {
    mount: (id: string) => {
      root = rootFactory(document.getElementById(id)!)
      root.render(app)
    },
    unmount: () => root?.unmount(),
  }
}
