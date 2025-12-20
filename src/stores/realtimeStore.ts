import { create } from 'zustand'

interface RealtimeState {
  isConnected: boolean
  lastSync: Date | null

  setConnected: (connected: boolean) => void
  setLastSync: (date: Date | null) => void
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  isConnected: false,
  lastSync: null,

  setConnected: (isConnected) => set({ isConnected }),
  setLastSync: (lastSync) => set({ lastSync }),
}))
