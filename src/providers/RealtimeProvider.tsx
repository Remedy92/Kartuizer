import { useEffect, type ReactNode } from 'react'
import { useRealtimeStore } from '@/stores'

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const setConnected = useRealtimeStore((s) => s.setConnected)
  const setLastSync = useRealtimeStore((s) => s.setLastSync)

  useEffect(() => {
    setConnected(false)
    setLastSync(new Date())
  }, [setConnected, setLastSync])

  return <>{children}</>
}
