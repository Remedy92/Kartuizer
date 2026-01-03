import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')

if (rootElement) {
  try {
    const root = createRoot(rootElement)
    root.render(<App />)
  } catch (error) {
    console.error('Failed to render app:', error)
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h1>App failed to start</h1>
        <pre>${error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    `
  }
}
