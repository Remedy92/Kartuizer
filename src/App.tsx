import { RouterProvider } from 'react-router-dom'
import { QueryProvider, AuthProvider, RealtimeProvider, ToastProvider } from '@/providers'
import { router } from '@/routes'

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <RealtimeProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </RealtimeProvider>
      </AuthProvider>
    </QueryProvider>
  )
}
