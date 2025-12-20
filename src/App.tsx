import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Check, X, Minus, Plus, LayoutDashboard, History, ArrowRight, Building2, LogOut, Loader2, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Session } from '@supabase/supabase-js'

// Utility for cleaner class names
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

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'archive' | 'admin'>('landing')
  const [loading, setLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState({ title: '', description: '', groupId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [votingQuestionId, setVotingQuestionId] = useState<string | null>(null)
  const [groups, setGroups] = useState<{ id: string, name: string }[]>([])
  const [authMode, setAuthMode] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
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
    if (votingQuestionId) return // Prevent double-clicks
    setVotingQuestionId(questionId)
    
    const { error } = await supabase
      .from('votes')
      .insert([{ question_id: questionId, vote, user_id: session?.user?.id }])

    if (error) {
      if (error.code === '23505') {
        alert('Je hebt al gestemd op deze vraag.')
      } else {
        alert(error.message)
      }
    } else {
      await fetchQuestions()
    }
    setVotingQuestionId(null)
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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (authBusy) return
    setAuthError(null)
    setAuthNotice(null)
    setAuthBusy(true)

    const result = authMode === 'sign_in'
      ? await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword })
      : await supabase.auth.signUp({ email: authEmail, password: authPassword })

    if (result.error) {
      setAuthError(result.error.message)
    } else if (authMode === 'sign_up') {
      setAuthNotice('Controleer je e-mail om je account te bevestigen.')
    }

    setAuthBusy(false)
  }

  // --- Views ---

  if (view === 'landing') {
    return (
      <div className="flex flex-col min-h-screen bg-[#fafaf9]">
        {/* Navigation */}
        <header className="py-6 px-8 flex justify-between items-center max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3 text-stone-800">
            <div className="w-10 h-10 bg-primary-800 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Building2 size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">KARTHUIZER</h1>
              <p className="text-[10px] text-stone-500 font-bold tracking-widest uppercase mt-0.5">Residentie Beheer</p>
            </div>
          </div>
          <div className="text-sm font-semibold text-stone-500">&nbsp;</div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col justify-center items-center text-center px-4 -mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h2 className="text-5xl md:text-7xl font-bold text-stone-900 mb-8 tracking-tight font-serif leading-[1.1]">
              Besluitvorming <br /> met <span className="text-primary-600 italic">klasse.</span>
            </h2>
            <p className="text-xl text-stone-500 mb-12 max-w-2xl mx-auto leading-relaxed">
              Het officiële digitale stemplatform voor de Raad van Bestuur en Blokvoorzitters van Residentie Karthuizer. Veilig, transparant en efficiënt.
            </p>
            <button
              onClick={() => setView(session ? 'dashboard' : 'login')}
              className="group bg-primary-800 text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-primary-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center gap-3 mx-auto"
            >
              {session ? 'Naar het Dashboard' : 'Inloggen'} <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </main>

        <footer className="py-8 text-center text-stone-400 text-sm border-t border-stone-200">
          &copy; {new Date().getFullYear()} Residentie Karthuizer. Alle rechten voorbehouden.
        </footer>
      </div>
    )
  }

  // --- Authenticated Layout ---

  const showLoginGate = view === 'login' || !session

  if (showLoginGate) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-xl border border-stone-200">
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-primary-800 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
              <Building2 size={28} />
            </div>
            <h2 className="text-3xl font-bold text-stone-900 font-serif">Welkom terug</h2>
            <p className="text-stone-500 mt-2">Log in voor toegang tot KARTHUIZER</p>
          </div>
          {!hasSupabaseConfig ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Supabase is niet geconfigureerd. Voeg `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` toe aan je `.env`.
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">E-mailadres</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="input-field"
                  placeholder="naam@bedrijf.be"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Wachtwoord</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="input-field"
                  placeholder="••••••••"
                />
              </div>
              {authError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  {authError}
                </div>
              )}
              {authNotice && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  {authNotice}
                </div>
              )}
              <button
                type="submit"
                disabled={authBusy}
                className="btn btn-primary w-full text-base"
              >
                {authBusy ? 'Bezig met inloggen...' : authMode === 'sign_in' ? 'Inloggen' : 'Registreren'}
              </button>
              <button
                type="button"
                onClick={() => setAuthMode(authMode === 'sign_in' ? 'sign_up' : 'sign_in')}
                className="w-full text-sm text-stone-500 hover:text-stone-700 transition-colors font-medium"
              >
                {authMode === 'sign_in' ? 'Nog geen account? Registreer hier' : 'Heb je al een account? Log in'}
              </button>
            </form>
          )}
          <button
            onClick={() => setView('landing')}
            className="w-full mt-8 text-sm text-stone-400 hover:text-stone-600 transition-colors font-medium"
          >
            Terug naar de startpagina
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex flex-col">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center gap-8">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => setView('landing')}
              >
                <div className="w-9 h-9 bg-primary-800 rounded flex items-center justify-center text-white shadow-sm group-hover:bg-primary-900 transition-colors">
                  <Building2 size={18} strokeWidth={2.5} />
                </div>
                <span className="font-bold text-stone-800 text-lg tracking-tight uppercase">Karthuizer</span>
              </div>

              <div className="hidden md:flex space-x-1 pl-4 border-l border-stone-200 h-8 items-center">
                <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18} />}>
                  Overzicht
                </NavButton>
                <NavButton active={view === 'archive'} onClick={() => setView('archive')} icon={<History size={18} />}>
                  Archief
                </NavButton>
                <NavButton active={view === 'admin'} onClick={() => setView('admin')} icon={<Plus size={18} />}>
                  Beheer
                </NavButton>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-stone-800 truncate max-w-[150px]">{session?.user?.email}</p>
                <p className="text-xs text-stone-500">Bestuurslid</p>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-200 transition-all shadow-sm"
                title="Uitloggen"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* --- Dashboard & Archive View --- */}
            {(view === 'dashboard' || view === 'archive') && (
              <div>
                <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-stone-200 pb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-stone-900 mb-3 font-serif">
                      {view === 'dashboard' ? 'Openstaande Vragen' : 'Archief Stemmingen'}
                    </h2>
                    <p className="text-stone-500 max-w-xl text-lg">
                      {view === 'dashboard'
                        ? 'Bekijk en stem op de actuele agendapunten die uw aandacht vereisen.'
                        : 'Historisch overzicht van alle genomen besluiten en stemmingen.'}
                    </p>
                  </div>
                  {view === 'dashboard' && (
                    <div className="bg-white text-primary-800 px-5 py-2.5 rounded-lg border border-stone-200 shadow-sm text-sm font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      {questions.length} actieve {questions.length === 1 ? 'kwestie' : 'kwesties'}
                    </div>
                  )}
                </header>

                {loading ? (
                  <div className="py-32 text-center text-stone-400 italic">Gegevens ophalen...</div>
                ) : questions.length === 0 ? (
                  <div className="py-24 text-center bg-white rounded-xl border border-dashed border-stone-300">
                    <p className="text-stone-500 text-lg">Er zijn momenteel geen items in dit overzicht.</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {questions.map((q) => (
                      <div key={q.id} className="pro-card p-6 md:p-8 flex flex-col md:flex-row gap-8 md:items-start group hover:border-primary-300 transition-colors bg-white shadow-sm hover:shadow-md">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-stone-100 text-stone-600 border border-stone-200">
                              {q.groups?.name}
                            </span>
                            <span className="text-stone-400 text-sm font-medium">
                              {new Date(q.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <h3 className="text-2xl font-bold text-stone-900 leading-tight group-hover:text-primary-800 transition-colors">
                            {q.title}
                          </h3>
                          <p className="text-stone-600 leading-relaxed text-lg max-w-4xl">
                            {q.description}
                          </p>
                        </div>

                        <div className="flex-shrink-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-stone-100 md:pl-8 flex md:flex-col gap-3 justify-center min-w-[180px]">
                          {q.status === 'open' ? (
                            (() => {
                              const userVote = getUserVote(q)
                              const isVoting = votingQuestionId === q.id
                              
                              if (userVote) {
                                return (
                                  <div className="flex flex-col items-center justify-center h-full px-6 py-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <CheckCircle2 className="text-emerald-600 mb-2" size={24} />
                                    <span className="text-emerald-700 font-semibold text-sm">Gestemd</span>
                                    <span className="text-emerald-600 text-xs mt-1 capitalize">
                                      {userVote.vote === 'yes' ? 'Akkoord' : userVote.vote === 'no' ? 'Niet Akkoord' : 'Onthouding'}
                                    </span>
                                    <span className="text-stone-400 text-xs mt-2">
                                      {q.votes?.length || 0} / {q.groups?.required_votes} stemmen
                                    </span>
                                  </div>
                                )
                              }
                              
                              return (
                                <>
                                  <h4 className="hidden md:block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 text-center">Jouw Stem</h4>
                                  <div className="flex md:flex-col gap-3 w-full">
                                    <VoteButton onClick={() => handleVote(q.id, 'yes')} variant="yes" disabled={isVoting} loading={isVoting} />
                                    <VoteButton onClick={() => handleVote(q.id, 'no')} variant="no" disabled={isVoting} loading={isVoting} />
                                    <VoteButton onClick={() => handleVote(q.id, 'abstain')} variant="abstain" disabled={isVoting} loading={isVoting} />
                                  </div>
                                </>
                              )
                            })()
                          ) : (
                            (() => {
                              const summary = getVoteSummary(q)
                              const result = summary.yes > summary.no ? 'Goedgekeurd' : summary.no > summary.yes ? 'Afgewezen' : 'Geen meerderheid'
                              const resultColor = summary.yes > summary.no ? 'text-emerald-600' : summary.no > summary.yes ? 'text-rose-600' : 'text-stone-500'
                              
                              return (
                                <div className="flex flex-col items-center justify-center h-full px-4 py-4 bg-stone-50 rounded-lg border border-stone-200">
                                  <span className={cn("font-bold text-sm mb-3", resultColor)}>{result}</span>
                                  <div className="space-y-1.5 text-xs w-full">
                                    <div className="flex justify-between items-center">
                                      <span className="text-stone-500">Akkoord</span>
                                      <span className="font-semibold text-emerald-600">{summary.yes}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-stone-500">Niet Akkoord</span>
                                      <span className="font-semibold text-rose-600">{summary.no}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-stone-500">Onthouding</span>
                                      <span className="font-semibold text-stone-600">{summary.abstain}</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })()
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* --- Admin View --- */}
            {view === 'admin' && (
              <div className="max-w-3xl mx-auto">
                <header className="mb-10 text-center">
                  <h2 className="text-4xl font-bold text-stone-900 mb-4 font-serif">Nieuw Agendapunt</h2>
                  <p className="text-stone-500 text-lg">Stel een nieuwe vraag op voor de stemming.</p>
                </header>

                <div className="pro-card p-10 bg-white shadow-lg border-stone-200">
                  <form onSubmit={createQuestion} className="space-y-8">
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="col-span-2 md:col-span-1">
                        <label className="block text-sm font-bold text-stone-800 mb-3 uppercase tracking-wide">Doelgroep</label>
                        <div className="relative">
                          <select
                            required
                            value={newQuestion.groupId}
                            onChange={e => setNewQuestion({ ...newQuestion, groupId: e.target.value })}
                            className="input-field appearance-none bg-stone-50"
                          >
                            <option value="">Selecteer orgaan...</option>
                            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                            <ArrowRight size={16} className="rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-stone-400 mt-2">Kies wie er mag stemmen.</p>
                      </div>

                      <div className="col-span-2 md:col-span-1">
                        {/* Spacer or extra field could go here */}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-800 mb-3 uppercase tracking-wide">Onderwerp</label>
                      <input
                        required
                        type="text"
                        value={newQuestion.title}
                        onChange={e => setNewQuestion({ ...newQuestion, title: e.target.value })}
                        placeholder="Bijv. Goedkeuring notulen..."
                        className="input-field text-lg font-medium placeholder:font-normal"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-stone-800 mb-3 uppercase tracking-wide">Toelichting</label>
                      <textarea
                        value={newQuestion.description}
                        onChange={e => setNewQuestion({ ...newQuestion, description: e.target.value })}
                        placeholder="Beschrijf de context, de details en het doel van deze stemming..."
                        className="input-field min-h-[200px] resize-y leading-relaxed text-stone-600"
                      />
                    </div>

                    <div className="pt-8 flex items-center justify-between border-t border-stone-100 mt-8">
                      <button
                        type="button"
                        onClick={() => setView('dashboard')}
                        className="text-stone-500 hover:text-stone-800 font-medium px-4 py-2 transition-colors"
                      >
                        Annuleren
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary min-w-[200px] text-lg py-3 shadow-md hover:shadow-lg"
                      >
                        {submitting ? 'Moment geduld...' : 'Agendapunt Publiceren'}
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

function NavButton({ active, onClick, icon, children }: { active: boolean, onClick: () => void, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all duration-200 tracking-wide",
        active
          ? "bg-primary-50 text-primary-800 ring-1 ring-primary-100"
          : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

function VoteButton({ onClick, variant, disabled = false, loading = false }: { 
  onClick: () => void
  variant: 'yes' | 'no' | 'abstain'
  disabled?: boolean
  loading?: boolean 
}) {
  const styles = {
    yes: "border-stone-200 text-stone-600 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-sm",
    no: "border-stone-200 text-stone-600 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-700 hover:shadow-sm",
    abstain: "border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-400 hover:text-stone-800 hover:shadow-sm"
  }

  const disabledStyles = "opacity-50 cursor-not-allowed hover:bg-white hover:border-stone-200 hover:text-stone-600 hover:shadow-none"

  const icons = {
    yes: <Check size={18} strokeWidth={2.5} />,
    no: <X size={18} strokeWidth={2.5} />,
    abstain: <Minus size={18} strokeWidth={2.5} />
  }

  const labels = {
    yes: "Akkoord",
    no: "Niet Akkoord",
    abstain: "Onthouding"
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
      disabled={disabled}
      className={cn(
        "flex flex-1 md:flex-initial flex-row items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg border transition-all duration-200 justify-start md:justify-center group",
        disabled ? disabledStyles : styles[variant]
      )}
      title={labels[variant]}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <span className="opacity-50 group-hover:opacity-100 transition-opacity">{icons[variant]}</span>
      )}
      <span className="text-sm font-bold">{labels[variant]}</span>
    </button>
  )
}

export default App
