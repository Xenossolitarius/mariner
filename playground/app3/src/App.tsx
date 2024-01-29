import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import rootEmmiter from 'virtual:root'

function App() {

  const [count, setCount] = useState(0)

  useEffect(() => {
    console.log('what')
    const update = () => {
      
      setCount((val) => val + 1) }
    rootEmmiter.emitter.on('count', update)

    return () => rootEmmiter.emitter.off('count', update)

  }, [])



const increase = () => {
  setCount(count + 1)
  rootEmmiter.emitter.emit('count')
}
  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={increase}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
