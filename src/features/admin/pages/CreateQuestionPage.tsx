import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGroups, useCreateQuestion } from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Input, Textarea, Select } from '@/components/ui'

export function CreateQuestionPage() {
  const navigate = useNavigate()
  const { data: groups, isLoading: loadingGroups } = useGroups()
  const createQuestion = useCreateQuestion()
  const { success, error: showError } = useToast()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupId, setGroupId] = useState('')
  const [deadline, setDeadline] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await createQuestion.mutateAsync({
        title,
        description,
        group_id: groupId,
        deadline: deadline || undefined,
      })
      success('Vraag aangemaakt', 'De vraag is succesvol gepubliceerd')
      navigate('/admin/questions')
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const groupOptions = (groups ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="text-3xl font-serif text-stone-800 mb-2">Nieuw Agendapunt</h1>
        <p className="text-stone-500">Stel een nieuwe vraag op voor de stemming</p>
      </header>

      <div className="bg-white border border-stone-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="Bijv. Goedkeuring notulen vergadering"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="text-lg"
          />

          <Textarea
            id="description"
            label="Toelichting"
            placeholder="Beschrijf de context en het doel van deze stemming..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
          />

          <Input
            id="deadline"
            label="Deadline (optioneel)"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div className="flex items-center justify-between pt-6 border-t border-stone-100">
            <Button variant="ghost" type="button" onClick={() => navigate('/admin/questions')}>
              Annuleren
            </Button>

            <Button type="submit" loading={createQuestion.isPending} size="lg">
              Publiceren
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
