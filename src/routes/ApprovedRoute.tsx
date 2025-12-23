import { Navigate, Outlet } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores'

/**
 * Route guard that redirects pending users to the pending approval page.
 * Should be used inside ProtectedRoute to ensure user is authenticated.
 */
export function ApprovedRoute() {
  const isPending = useAuthStore((s) => s.isPending)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (isPending) {
    return <Navigate to="/pending-approval" replace />
  }

  return <Outlet />
}
