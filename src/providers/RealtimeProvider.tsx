import { useEffect, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore, useUIStore, useRealtimeStore } from '@/stores'
import { queryClient } from '@/lib/queryClient'
import { questionKeys } from '@/hooks/queries/useQuestions'

interface RealtimeProviderProps {
  children: ReactNode
}

export function RealtimeProvider({ children }: RealtimeProviderProps) {
  const session = useAuthStore((s) => s.session)
  const addToast = useUIStore((s) => s.addToast)
  const setConnected = useRealtimeStore((s) => s.setConnected)
  const setLastSync = useRealtimeStore((s) => s.setLastSync)

  useEffect(() => {
    if (!session) {
      setConnected(false)
      return
    }

    // Subscribe to votes changes
    const votesChannel = supabase
      .channel('votes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes' },
        (payload) => {
          // Invalidate relevant question queries
          const questionId =
            (payload.new as { question_id?: string })?.question_id ||
            (payload.old as { question_id?: string })?.question_id

          if (questionId) {
            queryClient.invalidateQueries({ queryKey: questionKeys.detail(questionId) })
            queryClient.invalidateQueries({ queryKey: questionKeys.lists() })
          }
          setLastSync(new Date())
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    // Subscribe to questions changes
    const questionsChannel = supabase
      .channel('questions-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'questions' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: questionKeys.all })
          const newQuestion = payload.new as { title?: string }
          addToast({
            type: 'info',
            title: 'Nieuwe vraag',
            message: newQuestion.title,
          })
          setLastSync(new Date())
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'questions' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: questionKeys.all })
          const oldQuestion = payload.old as { status?: string }
          const newQuestion = payload.new as { status?: string; title?: string }

          if (oldQuestion.status === 'open' && newQuestion.status === 'completed') {
            addToast({
              type: 'success',
              title: 'Stemming afgerond',
              message: newQuestion.title,
            })
          }
          setLastSync(new Date())
        }
      )
      .subscribe()

    // Subscribe to notifications for current user
    const notificationsChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${session.user.id}`,
        },
        (payload) => {
          const notification = payload.new as { title?: string; message?: string }
          addToast({
            type: 'info',
            title: notification.title ?? 'Notificatie',
            message: notification.message,
          })
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(votesChannel)
      supabase.removeChannel(questionsChannel)
      supabase.removeChannel(notificationsChannel)
      setConnected(false)
    }
  }, [session, addToast, setConnected, setLastSync])

  return <>{children}</>
}
