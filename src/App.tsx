import { RouterProvider } from 'react-router-dom'
import { QueryProvider, AuthProvider, RealtimeProvider, ToastProvider } from '@/providers'
import { router } from '@/routes'

export default function App() {
  console.log('App rendering...')
  return (
    <div className="min-h-screen bg-stone-50">
      <QueryProvider>
        <AuthProvider>
          <RealtimeProvider>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </RealtimeProvider>
        </AuthProvider>
      </QueryProvider>
    </div>
  )
}
