import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Check, X, Minus, Plus, ChevronDown, LogOut, Loader2, Circle, Mail, KeyRound } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Session } from '@supabase/supabase-js'

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

type Vote = {
  id: string
  question_id: string
  user_id: string
  vote: 'yes' | 'no' | 'abstain'
  created_at: string
}

type Question = {
  id: string
  title: string
  description: string
  status: 'open' | 'completed'
  created_at: string
  group_id: string
  groups: { name: string; required_votes: number }
  votes?: Vote[]
}

// Elegant wordmark component
function Wordmark({ size = 'default', onClick }: { size?: 'default' | 'large'; onClick?: () => void }) {
  return (
    <div
      className={cn(
        "select-none",
        onClick && "cursor-pointer group"
      )}
      onClick={onClick}
    >
      <div className={cn(
        "font-serif tracking-[0.3em] text-stone-800 transition-colors",
        size === 'large' ? "text-2xl md:text-3xl" : "text-lg",
        onClick && "group-hover:text-primary-700"
      )}>
        KARTHUIZER
      </div>
      <div className={cn(
        "tracking-[0.2em] text-stone-400 uppercase",
        size === 'large' ? "text-[11px] mt-1" : "text-[9px] mt-0.5"
      )}>
        Residentie
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'archive' | 'admin'>('landing')
  const [loading, setLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState({ title: '', description: '', groupId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [votingQuestionId, setVotingQuestionId] = useState<string | null>(null)
  const [groups, setGroups] = useState<{ id: string, name: string }[]>([])
  const [authMethod, setAuthMethod] = useState<'magic' | 'password'>('magic')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const hasSupabaseConfig = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN') setView('dashboard')
      if (event === 'SIGNED_OUT') {
        setView((currentView) => (currentView === 'login' ? 'login' : 'landing'))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (view !== 'landing' && view !== 'login' && session) {
      fetchQuestions()
      if (view === 'admin') fetchGroups()
    }
  }, [view, session])

  const fetchGroups = async () => {
    const { data, error } = await supabase.from('groups').select('id, name')
    if (error) {
      console.error('Error fetching groups:', error)
    } else {
      setGroups(data || [])
    }
  }

  const fetchQuestions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*, groups(name, required_votes), votes(id, question_id, user_id, vote, created_at)')
      .eq('status', view === 'dashboard' ? 'open' : 'completed')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data || [])
    }
    setLoading(false)
  }

  const getUserVote = (question: Question): Vote | undefined => {
    if (!session?.user?.id || !question.votes) return undefined
    return question.votes.find(v => v.user_id === session.user.id)
  }

  const getVoteSummary = (question: Question): { yes: number; no: number; abstain: number } => {
    if (!question.votes) return { yes: 0, no: 0, abstain: 0 }
    return question.votes.reduce((acc, v) => {
      acc[v.vote] = (acc[v.vote] || 0) + 1
      return acc
    }, { yes: 0, no: 0, abstain: 0 } as { yes: number; no: number; abstain: number })
  }

  const handleVote = async (questionId: string, vote: string) => {
    if (votingQuestionId || !session?.user?.id) return
    setVotingQuestionId(questionId)

    const { error } = await supabase
      .from('votes')
      .insert([{ question_id: questionId, vote, user_id: session.user.id }])

    if (error) {
      if (error.code === '23505') {
        alert('Je hebt al gestemd op deze vraag.')
      } else {
        alert(error.message)
      }
      setVotingQuestionId(null)
    } else {
      await fetchQuestions()
      setVotingQuestionId(null)
    }
  }

  const createQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const { error } = await supabase
      .from('questions')
      .insert([{
        title: newQuestion.title,
        description: newQuestion.description,
        group_id: newQuestion.groupId,
        status: 'open'
      }])

    if (error) {
      alert(error.message)
    } else {
      setNewQuestion({ title: '', description: '', groupId: '' })
      setView('dashboard')
    }
    setSubmitting(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authBusy) return
    setAuthError(null)
    setAuthNotice(null)
    setAuthBusy(true)

    const { error } = await supabase.auth.signInWithOtp({
      email: authEmail,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setAuthBusy(false)
  }

  const handlePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authBusy) return
    setAuthError(null)
    setAuthNotice(null)
    setAuthBusy(true)

    // Try sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (signInError) {
      // If user doesn't exist, try sign up
      if (signInError.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
        })
        if (signUpError) {
          setAuthError(signUpError.message)
        } else {
          setAuthNotice('Controleer je e-mail om je account te bevestigen.')
        }
      } else {
        setAuthError(signInError.message)
      }
    }
    setAuthBusy(false)
  }

  // --- Landing Page ---
  if (view === 'landing') {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
        {/* Subtle grain overlay */}
        <div className="fixed inset-0 opacity-[0.015] pointer-events-none"
          style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
        />

        <header className="relative py-8 px-8 flex justify-between items-center max-w-6xl mx-auto w-full">
          <Wordmark size="large" />
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-stone-300 to-transparent hidden md:block" />
        </header>

        <main className="relative flex-1 flex flex-col justify-center items-center text-center px-6 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            {/* Decorative line */}
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-primary-400 to-transparent mx-auto mb-12" />

            <h1 className="text-4xl md:text-6xl font-serif text-stone-800 mb-8 leading-[1.15] tracking-tight">
              Besluitvorming
              <br />
              <span className="text-primary-600 italic">met klasse</span>
            </h1>

            <p className="text-lg md:text-xl text-stone-500 mb-16 max-w-lg mx-auto leading-relaxed font-light">
              Het digitale stemplatform voor de Raad van Bestuur en Blokvoorzitters. Veilig, transparant en efficiënt.
            </p>

            <motion.button
              onClick={() => setView(session ? 'dashboard' : 'login')}
              className="group relative bg-primary-800 text-white px-10 py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary-900 transition-all duration-300"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">
                {session ? 'Naar Dashboard' : 'Toegang'}
              </span>
              <div className="absolute inset-0 border border-primary-800 translate-x-1 translate-y-1 -z-10 group-hover:translate-x-1.5 group-hover:translate-y-1.5 transition-transform" />
            </motion.button>
          </motion.div>
        </main>

        <footer className="relative py-8 text-center">
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-stone-300 to-transparent mx-auto mb-6" />
          <p className="text-xs text-stone-400 tracking-wider uppercase">
            &copy; {new Date().getFullYear()} Residentie Karthuizer
          </p>
        </footer>
      </div>
    )
  }

  // --- Login Page ---
  const showLoginGate = view === 'login' || !session

  if (showLoginGate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-primary-50/30 flex flex-col justify-center items-center p-6">
        {/* Decorative elements */}
        <div className="fixed top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
        <div className="fixed bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-12">
            <Wordmark size="large" />
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-stone-200/60 shadow-xl shadow-stone-200/50 p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif text-stone-800 mb-2">Inloggen</h2>
              <p className="text-stone-500 text-sm">Toegang tot het stemplatform</p>
            </div>

            {!hasSupabaseConfig ? (
              <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Configureer eerst de Supabase omgevingsvariabelen.
              </div>
            ) : magicLinkSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-medium text-stone-800 mb-2">Controleer je inbox</h3>
                <p className="text-stone-500 text-sm mb-6">
                  We hebben een inloglink gestuurd naar<br />
                  <span className="font-medium text-stone-700">{authEmail}</span>
                </p>
                <button
                  onClick={() => {
                    setMagicLinkSent(false)
                    setAuthEmail('')
                  }}
                  className="text-sm text-primary-700 hover:text-primary-800 font-medium"
                >
                  Ander e-mailadres gebruiken
                </button>
              </motion.div>
            ) : (
              <>
                {/* Auth Method Tabs */}
                <div className="flex mb-8 border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('magic'); setAuthError(null); setAuthNotice(null) }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                      authMethod === 'magic'
                        ? "border-primary-700 text-primary-800"
                        : "border-transparent text-stone-500 hover:text-stone-700"
                    )}
                  >
                    <Mail size={16} />
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod('password'); setAuthError(null); setAuthNotice(null) }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium border-b-2 transition-all -mb-px",
                      authMethod === 'password'
                        ? "border-primary-700 text-primary-800"
                        : "border-transparent text-stone-500 hover:text-stone-700"
                    )}
                  >
                    <KeyRound size={16} />
                    Wachtwoord
                  </button>
                </div>

                <form onSubmit={authMethod === 'magic' ? handleMagicLink : handlePasswordAuth} className="space-y-6">
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                      E-mailadres
                    </label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                      placeholder="naam@voorbeeld.be"
                    />
                  </div>

                  {authMethod === 'password' && (
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-2 tracking-wider uppercase">
                        Wachtwoord
                      </label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  )}

                  {authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-l-2 border-rose-500 bg-rose-50 p-3 text-sm text-rose-700"
                    >
                      {authError}
                    </motion.div>
                  )}

                  {authNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-l-2 border-emerald-500 bg-emerald-50 p-3 text-sm text-emerald-700"
                    >
                      {authNotice}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={authBusy}
                    className="w-full bg-primary-800 text-white py-4 text-sm tracking-widest uppercase font-medium hover:bg-primary-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {authBusy ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : authMethod === 'magic' ? (
                      'Verstuur link'
                    ) : (
                      'Inloggen'
                    )}
                  </button>

                  {authMethod === 'magic' && (
                    <p className="text-xs text-stone-400 text-center">
                      Nieuw? Je account wordt automatisch aangemaakt.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>

          <button
            onClick={() => setView('landing')}
            className="w-full mt-8 text-sm text-stone-400 hover:text-stone-600 transition-colors"
          >
            &larr; Terug
          </button>
        </motion.div>
      </div>
    )
  }

  // --- Authenticated Dashboard Layout ---
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-12">
              <Wordmark onClick={() => setView('landing')} />

              <div className="hidden md:flex items-center gap-1">
                <NavTab
                  active={view === 'dashboard'}
                  onClick={() => setView('dashboard')}
                >
                  Overzicht
                </NavTab>
                <NavTab
                  active={view === 'archive'}
                  onClick={() => setView('archive')}
                >
                  Archief
                </NavTab>
                <NavTab
                  active={view === 'admin'}
                  onClick={() => setView('admin')}
                >
                  <Plus size={14} className="mr-1.5" />
                  Nieuw
                </NavTab>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-stone-700 truncate max-w-[180px]">
                  {session?.user?.email}
                </p>
                <p className="text-xs text-stone-400">Bestuurslid</p>
              </div>

              <button
                onClick={() => supabase.auth.signOut()}
                className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all rounded-full"
                title="Uitloggen"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-white border-b border-stone-100 px-4 py-2 flex gap-2 overflow-x-auto">
        <NavTab active={view === 'dashboard'} onClick={() => setView('dashboard')} mobile>
          Overzicht
        </NavTab>
        <NavTab active={view === 'archive'} onClick={() => setView('archive')} mobile>
          Archief
        </NavTab>
        <NavTab active={view === 'admin'} onClick={() => setView('admin')} mobile>
          Nieuw
        </NavTab>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto py-12 px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Dashboard & Archive Views */}
            {(view === 'dashboard' || view === 'archive') && (
              <div>
                <header className="mb-12">
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">
                        {view === 'dashboard' ? 'Openstaande Vragen' : 'Archief'}
                      </h1>
                      <p className="text-stone-500 max-w-lg">
                        {view === 'dashboard'
                          ? 'Breng uw stem uit op actuele agendapunten.'
                          : 'Overzicht van afgeronde stemmingen.'}
                      </p>
                    </div>

                    {view === 'dashboard' && questions.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-stone-500">
                        <Circle size={8} className="fill-emerald-500 text-emerald-500" />
                        <span>{questions.length} actief</span>
                      </div>
                    )}
                  </div>
                  <div className="h-px bg-gradient-to-r from-stone-200 via-stone-200 to-transparent mt-8" />
                </header>

                {loading ? (
                  <div className="py-24 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
                  </div>
                ) : questions.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="w-px h-12 bg-gradient-to-b from-transparent via-stone-300 to-transparent mx-auto mb-6" />
                    <p className="text-stone-400 italic">Geen items beschikbaar</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {questions.map((q, index) => (
                      <motion.div
                        key={q.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="group bg-white border border-stone-200 hover:border-stone-300 transition-all duration-300 hover:shadow-lg hover:shadow-stone-100"
                      >
                        <div className="p-8 flex flex-col lg:flex-row gap-8">
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                              <span className="text-xs tracking-wider uppercase text-primary-700 font-medium bg-primary-50 px-3 py-1">
                                {q.groups?.name}
                              </span>
                              <span className="text-xs text-stone-400">
                                {new Date(q.created_at).toLocaleDateString('nl-BE', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>

                            <h2 className="text-xl md:text-2xl font-serif text-stone-800 mb-3 group-hover:text-primary-800 transition-colors">
                              {q.title}
                            </h2>

                            {q.description && (
                              <p className="text-stone-500 leading-relaxed">
                                {q.description}
                              </p>
                            )}
                          </div>

                          {/* Voting Section */}
                          <div className="lg:w-56 flex-shrink-0 lg:border-l lg:border-stone-100 lg:pl-8">
                            {q.status === 'open' ? (
                              <VotingPanel
                                question={q}
                                userVote={getUserVote(q)}
                                isVoting={votingQuestionId === q.id}
                                onVote={(vote) => handleVote(q.id, vote)}
                              />
                            ) : (
                              <ResultsPanel summary={getVoteSummary(q)} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Admin View */}
            {view === 'admin' && (
              <div className="max-w-2xl mx-auto">
                <header className="text-center mb-12">
                  <div className="w-px h-12 bg-gradient-to-b from-transparent via-stone-300 to-transparent mx-auto mb-8" />
                  <h1 className="text-3xl md:text-4xl font-serif text-stone-800 mb-3">
                    Nieuw Agendapunt
                  </h1>
                  <p className="text-stone-500">
                    Stel een nieuwe vraag op voor de stemming
                  </p>
                </header>

                <div className="bg-white border border-stone-200 p-8 md:p-12">
                  <form onSubmit={createQuestion} className="space-y-8">
                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-3 tracking-wider uppercase">
                        Doelgroep
                      </label>
                      <div className="relative">
                        <select
                          required
                          value={newQuestion.groupId}
                          onChange={e => setNewQuestion({ ...newQuestion, groupId: e.target.value })}
                          className="w-full appearance-none bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 pr-10 text-stone-800 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                        >
                          <option value="">Selecteer orgaan...</option>
                          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-3 tracking-wider uppercase">
                        Onderwerp
                      </label>
                      <input
                        required
                        type="text"
                        value={newQuestion.title}
                        onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                        placeholder="Bijv. Goedkeuring notulen vergadering"
                        className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 text-lg placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-stone-500 mb-3 tracking-wider uppercase">
                        Toelichting
                      </label>
                      <textarea
                        value={newQuestion.description}
                        onChange={e => setNewQuestion({ ...newQuestion, description: e.target.value })}
                        placeholder="Beschrijf de context en het doel van deze stemming..."
                        rows={5}
                        className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 px-4 py-3 text-stone-800 placeholder:text-stone-400 focus:border-primary-600 focus:ring-0 focus:bg-white transition-all resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-8 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setView('dashboard')}
                        className="text-stone-500 hover:text-stone-700 text-sm transition-colors"
                      >
                        Annuleren
                      </button>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary-800 text-white px-8 py-3 text-sm tracking-wider uppercase font-medium hover:bg-primary-900 transition-colors disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Publiceren'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

function NavTab({ active, onClick, children, mobile }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  mobile?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center transition-all duration-200",
        mobile
          ? cn(
              "px-4 py-2 text-sm rounded-full whitespace-nowrap",
              active
                ? "bg-primary-800 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            )
          : cn(
              "px-4 py-2 text-sm font-medium relative",
              active
                ? "text-primary-800"
                : "text-stone-500 hover:text-stone-800",
              active && "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-800"
            )
      )}
    >
      {children}
    </button>
  )
}

function VotingPanel({ question, userVote, isVoting, onVote }: {
  question: Question
  userVote: Vote | undefined
  isVoting: boolean
  onVote: (vote: string) => void
}) {
  if (userVote) {
    const voteLabels = { yes: 'Akkoord', no: 'Niet akkoord', abstain: 'Onthouding' }
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-medium text-stone-700 mb-1">Stem uitgebracht</p>
        <p className="text-xs text-stone-500">{voteLabels[userVote.vote]}</p>
        <p className="text-xs text-stone-400 mt-3">
          {question.votes?.length || 0} / {question.groups?.required_votes} stemmen
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-stone-400 uppercase tracking-wider mb-4 text-center lg:text-left">
        Uw stem
      </p>
      <VoteButton variant="yes" onClick={() => onVote('yes')} disabled={isVoting} loading={isVoting} />
      <VoteButton variant="no" onClick={() => onVote('no')} disabled={isVoting} loading={isVoting} />
      <VoteButton variant="abstain" onClick={() => onVote('abstain')} disabled={isVoting} loading={isVoting} />
    </div>
  )
}

function ResultsPanel({ summary }: {
  summary: { yes: number; no: number; abstain: number }
}) {
  const total = summary.yes + summary.no + summary.abstain
  const result = summary.yes > summary.no ? 'Goedgekeurd' : summary.no > summary.yes ? 'Afgewezen' : 'Geen meerderheid'
  const resultColor = summary.yes > summary.no ? 'text-emerald-600' : summary.no > summary.yes ? 'text-rose-600' : 'text-stone-500'

  return (
    <div className="py-2">
      <p className={cn("text-sm font-medium mb-4 text-center lg:text-left", resultColor)}>
        {result}
      </p>

      <div className="space-y-3">
        <ResultRow label="Akkoord" value={summary.yes} total={total} color="bg-emerald-500" />
        <ResultRow label="Niet akkoord" value={summary.no} total={total} color="bg-rose-500" />
        <ResultRow label="Onthouding" value={summary.abstain} total={total} color="bg-stone-400" />
      </div>
    </div>
  )
}

function ResultRow({ label, value, total, color }: {
  label: string
  value: number
  total: number
  color: string
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0

  return (
    <div>
      <div className="flex justify-between text-xs text-stone-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-stone-700">{value}</span>
      </div>
      <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  )
}

function VoteButton({ onClick, variant, disabled, loading }: {
  onClick: () => void
  variant: 'yes' | 'no' | 'abstain'
  disabled: boolean
  loading: boolean
}) {
  const config = {
    yes: {
      label: 'Akkoord',
      icon: Check,
      hover: 'hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700'
    },
    no: {
      label: 'Niet akkoord',
      icon: X,
      hover: 'hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700'
    },
    abstain: {
      label: 'Onthouding',
      icon: Minus,
      hover: 'hover:border-stone-400 hover:bg-stone-100'
    }
  }

  const { label, icon: Icon, hover } = config[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 border border-stone-200 text-stone-600 text-sm transition-all duration-200",
        disabled ? "opacity-50 cursor-not-allowed" : hover
      )}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <Icon size={16} className="opacity-50" />
      )}
      <span>{label}</span>
    </button>
  )
}

export default App
