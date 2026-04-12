import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores'

/**
 * Route guard that redirects pending users to the pending approval page.
 * Should be used inside ProtectedRoute to ensure user is authenticated.
 */
export function ApprovedRoute() {
  const isPending = useAuthStore((s) => s.isPending)
  const isLoading = useAuthStore((s) => s.isLoading)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isPending && location.pathname !== '/pending-approval') {
      navigate('/pending-approval', { replace: true })
    }
  }, [isLoading, isPending, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (isPending && location.pathname !== '/pending-approval') {
    return null
  }

  return <Outlet />
}
