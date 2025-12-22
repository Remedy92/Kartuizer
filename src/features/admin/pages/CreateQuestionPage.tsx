import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, BarChart3, Plus, Trash2, GripVertical } from 'lucide-react'
import { useGroups, useCreateQuestion, useCreatePoll } from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { QuestionType } from '@/types'

interface PollOption {
  id: string
  label: string
  description: string
}

const generateId = () => Math.random().toString(36).substring(2, 9)

export function CreateQuestionPage() {
  const navigate = useNavigate()
  const { data: groups, isLoading: loadingGroups } = useGroups()
  const createQuestion = useCreateQuestion()
  const createPoll = useCreatePoll()
  const { success, error: showError } = useToast()

  // Form state
  const [questionType, setQuestionType] = useState<QuestionType>('standard')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [deadline, setDeadline] = useState('')

  // Poll-specific state
  const [allowMultiple, setAllowMultiple] = useState(false)
  const [options, setOptions] = useState<PollOption[]>([
    { id: generateId(), label: '', description: '' },
    { id: generateId(), label: '', description: '' },
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (questionType === 'poll') {
        // Validate poll options
        const validOptions = options.filter((o) => o.label.trim())
        if (validOptions.length < 2) {
          showError('Fout', 'Een poll moet minimaal 2 opties hebben')
          return
        }

        await createPoll.mutateAsync({
          title,
          description,
          group_id: groupId,
          deadline: deadline || undefined,
          question_type: 'poll',
          allow_multiple: allowMultiple,
          options: validOptions.map((o) => ({
            label: o.label.trim(),
            description: o.description.trim() || undefined,
          })),
        })
        success('Poll aangemaakt', 'De poll is succesvol gepubliceerd')
      } else {
        await createQuestion.mutateAsync({
          title,
          description,
          group_id: groupId,
          deadline: deadline || undefined,
          question_type: 'standard',
        })
        success('Vraag aangemaakt', 'De stemming is succesvol gepubliceerd')
      }
      navigate('/admin/questions')
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const addOption = () => {
    setOptions([...options, { id: generateId(), label: '', description: '' }])
  }

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id))
    }
  }

  const updateOption = (id: string, field: 'label' | 'description', value: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, [field]: value } : o)))
  }

  const groupOptions = (groups ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  const isPending = createQuestion.isPending || createPoll.isPending

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-serif text-stone-800 mb-2"
        >
          Nieuw Agendapunt
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-stone-500"
        >
          Maak een stemming of poll aan voor de leden
        </motion.p>
      </header>

      {/* Type Selector */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <label className="block text-xs font-medium text-stone-500 mb-3 tracking-wider uppercase">
          Type
        </label>
        <div className="grid grid-cols-2 gap-3">
          <TypeCard
            icon={<Vote className="w-5 h-5" />}
            title="Standaard Stemming"
            description="Ja / Nee / Onthouding"
            selected={questionType === 'standard'}
            onClick={() => setQuestionType('standard')}
          />
          <TypeCard
            icon={<BarChart3 className="w-5 h-5" />}
            title="Poll"
            description="Meerdere opties"
            selected={questionType === 'poll'}
            onClick={() => setQuestionType('poll')}
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white border border-stone-200"
      >
        <form onSubmit={handleSubmit}>
          {/* Main form fields */}
          <div className="p-8 space-y-6">
            <Select
              id="group"
              label="Doelgroep"
              placeholder="Selecteer orgaan..."
              options={groupOptions}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              disabled={loadingGroups}
            />

            <Input
              id="title"
              label="Onderwerp"
              placeholder={
                questionType === 'poll'
                  ? 'Bijv. Welke kleur voor het nieuwe dak?'
                  : 'Bijv. Goedkeuring notulen vergadering'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-lg"
            />

            <Textarea
              id="description"
              label="Toelichting"
              placeholder="Beschrijf de context en het doel..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />

            <Input
              id="deadline"
              label="Deadline (optioneel)"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Poll Options Section */}
          <AnimatePresence mode="wait">
            {questionType === 'poll' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="border-t border-stone-100">
                  {/* Multi-choice toggle */}
                  <div className="px-8 py-5 bg-stone-50/50 border-b border-stone-100">
                    <button
                      type="button"
                      onClick={() => setAllowMultiple(!allowMultiple)}
                      className="flex items-center gap-3 group w-full text-left"
                    >
                      <div
                        className={cn(
                          'w-5 h-5 border-2 flex items-center justify-center transition-all duration-200',
                          allowMultiple
                            ? 'bg-primary-800 border-primary-800'
                            : 'bg-white border-stone-300 group-hover:border-stone-400'
                        )}
                      >
                        {allowMultiple && (
                          <motion.svg
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-3 h-3 text-white"
                            viewBox="0 0 12 12"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M2 6l3 3 5-6" />
                          </motion.svg>
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-stone-700">
                          Meerdere keuzes toestaan
                        </span>
                        <span className="text-xs text-stone-500 ml-2">
                          {allowMultiple ? '(Meerkeuze)' : '(Enkelvoudig)'}
                        </span>
                      </div>
                    </button>
                  </div>

                  {/* Options list */}
                  <div className="p-8 pt-6">
                    <label className="block text-xs font-medium text-stone-500 mb-4 tracking-wider uppercase">
                      Opties
                    </label>

                    <div className="space-y-3">
                      <AnimatePresence mode="popLayout">
                        {options.map((option, index) => (
                          <motion.div
                            key={option.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            transition={{
                              duration: 0.2,
                              layout: { duration: 0.25 },
                            }}
                            className="group"
                          >
                            <div className="flex gap-3 items-start">
                              {/* Drag handle placeholder */}
                              <div className="pt-3 text-stone-300">
                                <GripVertical className="w-4 h-4" />
                              </div>

                              {/* Option number */}
                              <div className="pt-3 w-6 flex-shrink-0">
                                <span className="text-xs font-medium text-stone-400">
                                  {String(index + 1).padStart(2, '0')}
                                </span>
                              </div>

                              {/* Option fields */}
                              <div className="flex-1 bg-stone-50 border border-stone-200 p-4 hover:border-stone-300 transition-colors">
                                <input
                                  type="text"
                                  placeholder="Optie naam"
                                  value={option.label}
                                  onChange={(e) => updateOption(option.id, 'label', e.target.value)}
                                  className="w-full bg-transparent border-0 p-0 text-stone-800 placeholder:text-stone-400 focus:ring-0 font-medium"
                                />
                                <input
                                  type="text"
                                  placeholder="Beschrijving (optioneel)"
                                  value={option.description}
                                  onChange={(e) =>
                                    updateOption(option.id, 'description', e.target.value)
                                  }
                                  className="w-full bg-transparent border-0 p-0 mt-2 text-sm text-stone-500 placeholder:text-stone-300 focus:ring-0"
                                />
                              </div>

                              {/* Remove button */}
                              <button
                                type="button"
                                onClick={() => removeOption(option.id)}
                                disabled={options.length <= 2}
                                className={cn(
                                  'pt-3 text-stone-300 hover:text-rose-500 transition-colors',
                                  options.length <= 2 && 'opacity-30 cursor-not-allowed'
                                )}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    {/* Add option button */}
                    <motion.button
                      type="button"
                      onClick={addOption}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="mt-4 w-full py-3 border-2 border-dashed border-stone-200 text-stone-500 hover:border-primary-300 hover:text-primary-700 hover:bg-primary-50/30 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Optie toevoegen
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit section */}
          <div className="px-8 py-6 bg-stone-50/50 border-t border-stone-100 flex items-center justify-between">
            <Button variant="ghost" type="button" onClick={() => navigate('/admin/questions')}>
              Annuleren
            </Button>

            <Button type="submit" loading={isPending} size="lg">
              {questionType === 'poll' ? 'Poll Publiceren' : 'Publiceren'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// Type selection card component
function TypeCard({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'relative p-5 border-2 text-left transition-all duration-200',
        selected
          ? 'border-primary-800 bg-primary-50/50'
          : 'border-stone-200 bg-white hover:border-stone-300'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute top-3 right-3 w-4 h-4 border-2 transition-all duration-200',
          selected ? 'border-primary-800 bg-primary-800' : 'border-stone-300 bg-white'
        )}
      >
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-full h-full flex items-center justify-center"
          >
            <div className="w-1.5 h-1.5 bg-white" />
          </motion.div>
        )}
      </div>

      <div
        className={cn(
          'w-10 h-10 flex items-center justify-center mb-3 transition-colors',
          selected ? 'bg-primary-100 text-primary-800' : 'bg-stone-100 text-stone-500'
        )}
      >
        {icon}
      </div>

      <h3
        className={cn(
          'font-medium mb-1 transition-colors',
          selected ? 'text-primary-900' : 'text-stone-700'
        )}
      >
        {title}
      </h3>
      <p className="text-xs text-stone-500">{description}</p>
    </motion.button>
  )
}
