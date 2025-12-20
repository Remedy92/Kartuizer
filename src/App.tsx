import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { Check, X, Minus, Plus, LayoutDashboard, History, ArrowRight, Building2, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

// Utility for cleaner class names
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs))
}

type Question = {
  id: string
  title: string
  description: string
  status: 'open' | 'completed'
  created_at: string
  group_id: string
  groups: { name: string; required_votes: number }
}

function App() {
  const [session, setSession] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [view, setView] = useState<'landing' | 'login' | 'dashboard' | 'archive' | 'admin'>('landing')
  const [loading, setLoading] = useState(true)
  const [newQuestion, setNewQuestion] = useState({ title: '', description: '', groupId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [groups, setGroups] = useState<{ id: string, name: string }[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'SIGNED_IN') setView('dashboard')
      if (event === 'SIGNED_OUT') setView('landing')
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
    const { data } = await supabase.from('groups').select('id, name')
    setGroups(data || [])
  }

  const fetchQuestions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('questions')
      .select('*, groups(name, required_votes)')
      .eq('status', view === 'dashboard' ? 'open' : 'completed')
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setQuestions(data || [])
    setLoading(false)
  }

  const handleVote = async (questionId: string, vote: string) => {
    const { error } = await supabase
      .from('votes')
      .insert([{ question_id: questionId, vote, user_id: (await supabase.auth.getUser()).data.user?.id }])

    if (error) {
      alert(error.message)
    } else {
      fetchQuestions()
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
          <button
            onClick={() => setView(session ? 'dashboard' : 'login')}
            className="text-sm font-semibold text-stone-600 hover:text-primary-800 transition-colors"
          >
            {session ? 'Dashboard' : 'Inloggen'}
          </button>
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
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#5e4339',
                    brandAccent: '#4a342e',
                  }
                }
              }
            }}
            providers={[]}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'E-mailadres',
                  password_label: 'Wachtwoord',
                  button_label: 'Inloggen',
                  loading_button_label: 'Bezig met inloggen...',
                  link_text: "Heb je al een account? Log in",
                },
                sign_up: {
                  email_label: 'E-mailadres',
                  password_label: 'Wachtwoord',
                  button_label: 'Registreren',
                  loading_button_label: 'Bezig met registreren...',
                  link_text: "Nog geen account? Registreer hier",
                }
              }
            }}
          />
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

                        <div className="flex-shrink-0 pt-6 md:pt-0 border-t md:border-t-0 md:border-l border-stone-100 md:pl-8 flex md:flex-col gap-3 justify-center min-w-[140px]">
                          {q.status === 'open' ? (
                            <>
                              <h4 className="hidden md:block text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 text-center">Jouw Stem</h4>
                              <div className="flex md:flex-col gap-3 w-full">
                                <VoteButton onClick={() => handleVote(q.id, 'yes')} variant="yes" />
                                <VoteButton onClick={() => handleVote(q.id, 'no')} variant="no" />
                                <VoteButton onClick={() => handleVote(q.id, 'abstain')} variant="abstain" />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full px-6 py-4 bg-stone-50 rounded border border-stone-200">
                              <span className="text-stone-500 font-semibold text-sm uppercase tracking-wide">Voltooid</span>
                            </div>
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

function VoteButton({ onClick, variant }: { onClick: () => void, variant: 'yes' | 'no' | 'abstain' }) {
  const styles = {
    yes: "border-stone-200 text-stone-600 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-sm",
    no: "border-stone-200 text-stone-600 hover:bg-rose-50 hover:border-rose-500 hover:text-rose-700 hover:shadow-sm",
    abstain: "border-stone-200 text-stone-600 hover:bg-stone-100 hover:border-stone-400 hover:text-stone-800 hover:shadow-sm"
  }



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
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "flex flex-1 md:flex-initial flex-row items-center gap-3 px-4 py-3 md:py-2.5 rounded-lg border transition-all duration-200 justify-start md:justify-center group",
        styles[variant]
      )}
      title={labels[variant]}
    >
      <span className="opacity-50 group-hover:opacity-100 transition-opacity">{icons[variant]}</span>
      <span className="text-sm font-bold">{labels[variant]}</span>
    </button>
  )
}

export default App
