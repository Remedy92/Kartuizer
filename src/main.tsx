import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')

function logToScreen(msg: string, color = 'black') {
  if (rootElement) {
    const div = document.createElement('div')
    div.style.padding = '10px'
    div.style.margin = '5px 0'
    div.style.border = `1px solid ${color}`
    div.style.color = color
    div.textContent = msg
    rootElement.appendChild(div)
  }
}

window.onerror = (msg, url, lineNo, columnNo, error) => {
  logToScreen(`Error: ${msg} at ${lineNo}:${columnNo}`, 'red')
  return false
}

logToScreen('JS Execution Started')

if (rootElement) {
  try {
    rootElement.innerHTML = `
      <div style="padding: 20px; background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; font-family: sans-serif;">
        <h1 style="margin: 0 0 10px 0;">JS Execution Test</h1>
        <p style="margin: 0;">If you see this RED box, JavaScript is executing and modifying the DOM.</p>
        <div id="react-root"></div>
      </div>
    `
    const reactRoot = document.getElementById('react-root')
    if (reactRoot) {
      createRoot(reactRoot).render(
        <div style={{ marginTop: '20px', padding: '15px', background: '#dcfce7', color: '#166534', border: '2px solid #22c55e' }}>
          <h2 style={{ margin: '0 0 5px 0' }}>React Render Test</h2>
          <p style={{ margin: 0 }}>If you see this GREEN box, React is also rendering correctly.</p>
        </div>
      )
      logToScreen('React Render Attempted', 'green')
    }
  } catch (err) {
    logToScreen(`React Init Error: ${err}`, 'red')
  }
} else {
  console.error('No root element found')
}
