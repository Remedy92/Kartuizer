import { RouterProvider } from 'react-router-dom'
import { QueryProvider, AuthProvider, RealtimeProvider, ToastProvider } from '@/providers'
import { router } from '@/routes'

export default function App() {
  return (
    <div style={{ padding: '40px', background: 'white', color: 'black', minHeight: '100vh' }}>
      <h1>App component is rendering</h1>
      <p>If you see this, the React App component is working.</p>
    </div>
  )
}
