import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Users, Calendar } from 'lucide-react'
import { useUserGroups } from '@/hooks'
import { useAuthStore } from '@/stores'
import { useToast } from '@/hooks'
import { supabaseUrl } from '@/lib/supabase'
import type { GroupMember } from '@/types'

export function MyGroupsPage() {
  const session = useAuthStore((s) => s.session)
  const { data: memberships, isLoading, error } = useUserGroups(session?.user?.id ?? '')
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
    showError('Groepen laden mislukt', message)
  }, [error, showError])

  useEffect(() => {
    if (!isLoading) {
      setShowSlowLoading(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowSlowLoading(true)
    }, 6000)

    return () => window.clearTimeout(timeoutId)
  }, [isLoading])

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-600">Er is een fout opgetreden bij het laden van uw groepen.</p>
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
            <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">
              Mijn Groepen
            </h1>
            <p className="text-stone-500 max-w-lg">
              Overzicht van de groepen waar u lid van bent.
            </p>
          </div>

          {memberships && memberships.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-stone-500">
              <Users size={16} className="text-primary-600" />
              <span>{memberships.length} {memberships.length === 1 ? 'groep' : 'groepen'}</span>
            </div>
          )}
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
      ) : !memberships || memberships.length === 0 ? (
        <div className="py-20 text-center">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-stone-300 to-transparent mx-auto mb-6" />
          <p className="text-stone-400 italic">U bent nog niet toegevoegd aan een groep</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map((membership, index) => (
            <GroupCard key={membership.group_id} membership={membership} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}

interface GroupCardProps {
  membership: GroupMember
  index: number
}

function GroupCard({ membership, index }: GroupCardProps) {
  const group = membership.groups

  if (!group) return null

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white border border-stone-200/80 shadow-sm shadow-stone-200/50 hover:border-primary-300 transition-all duration-300 hover:shadow-md hover:shadow-primary-100/60 rounded-lg overflow-hidden"
    >
      {/* Decorative top accent */}
      <div className="h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400" />

      <div className="p-6">
        <h2 className="text-xl font-serif text-stone-800 group-hover:text-primary-800 transition-colors mb-2">
          {group.name}
        </h2>

        {group.description && (
          <p className="text-sm text-stone-500 leading-relaxed mb-4">
            {group.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400 pt-4 border-t border-stone-100">
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-primary-500" />
            <span>{group.required_votes} {group.required_votes === 1 ? 'lid' : 'leden'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-primary-500" />
            <span>Lid sinds {formatJoinDate(membership.joined_at)}</span>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
