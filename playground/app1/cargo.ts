export const cargo = async () => {
  return {
    greeting: 'Hello from server',
    timestamp: Date.now(),
    features: { darkMode: true, beta: false },
  }
}
