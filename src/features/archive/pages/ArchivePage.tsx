import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/hooks'
import { useCompletedQuestions } from '@/hooks'
import { QuestionCard } from '@/components/shared'
import { supabaseUrl } from '@/lib/supabase'

export function ArchivePage() {
  const { data: questions, isLoading, error } = useCompletedQuestions()
  const { error: showError } = useToast()
  const lastErrorRef = useRef<string | null>(null)
  const [showSlowLoading, setShowSlowLoading] = useState(false)

  useEffect(() => {
    if (!error) {
      lastErrorRef.current = null
      return
    }

    const message = error instanceof Error ? error.message : 'Er is een fout opgetreden'
    if (lastErrorRef.current === message) return
    lastErrorRef.current = message
    showError('Archief laden mislukt', message)
  }, [error, showError])

  useEffect(() => {
    if (!isLoading) return

    const timeoutId = window.setTimeout(() => {
      setShowSlowLoading(true)
    }, 6000)

    return () => {
      window.clearTimeout(timeoutId)
      setShowSlowLoading(false)
    }
  }, [isLoading])

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">Er is een fout opgetreden bij het laden van het archief.</p>
        <p className="text-sm text-rose-500 mt-2">
          {error instanceof Error ? error.message : 'Controleer je rechten en de Supabase-verbinding.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">Archief</h1>
            <p className="text-stone-500 max-w-lg">Overzicht van afgeronde stemmingen.</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent mt-8" />
      </header>

      {isLoading ? (
        <div className="py-24 flex flex-col items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
          {showSlowLoading && (
            <div className="text-center text-sm text-stone-500 max-w-md">
              <p>Dit duurt langer dan verwacht.</p>
              <p className="mt-2">
                Controleer of Supabase bereikbaar is en of je `.env` klopt.
              </p>
              {supabaseUrl && (
                <p className="mt-2 text-xs text-stone-400">
                  Supabase URL: {supabaseUrl}
                </p>
              )}
            </div>
          )}
        </div>
      ) : !questions || questions.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-stone-300 to-transparent mx-auto mb-6" />
          <p className="text-stone-400 italic">Geen afgesloten stemmingen</p>
        </div>
      ) : (
        <div className="space-y-6">
          {questions.map((question, index) => (
            <QuestionCard key={question.id} question={question} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
