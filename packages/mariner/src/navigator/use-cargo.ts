// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCargo<T = any>(): T {
  throw new Error('useCargo() was not transformed by the Mariner cargo plugin. Is the plugin enabled?')
}
