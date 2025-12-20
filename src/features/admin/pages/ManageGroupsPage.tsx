import { useState } from 'react'
import { Plus, Loader2, Trash2, Users, Edit } from 'lucide-react'
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Input, Modal, Card, CardContent } from '@/components/ui'
import type { Group } from '@/types'

export function ManageGroupsPage() {
  const { data: groups, isLoading } = useGroups()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const { success, error: showError } = useToast()

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requiredVotes, setRequiredVotes] = useState('')

  const resetForm = () => {
    setName('')
    setDescription('')
    setRequiredVotes('')
  }

  const openEditModal = (group: Group) => {
    setEditingGroup(group)
    setName(group.name)
    setDescription(group.description ?? '')
    setRequiredVotes(String(group.required_votes))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createGroup.mutateAsync({
        name,
        description: description || undefined,
        required_votes: parseInt(requiredVotes, 10),
      })
      success('Groep aangemaakt', 'De groep is succesvol aangemaakt')
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingGroup) return

    try {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        name,
        description: description || undefined,
        required_votes: parseInt(requiredVotes, 10),
      })
      success('Groep bijgewerkt', 'De groep is succesvol bijgewerkt')
      setEditingGroup(null)
      resetForm()
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleDelete = async () => {
    if (!deletingGroup) return

    try {
      await deleteGroup.mutateAsync(deletingGroup.id)
      success('Groep verwijderd', 'De groep is succesvol verwijderd')
      setDeletingGroup(null)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  return (
    <div>
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-2">Groepen</h1>
          <p className="text-stone-500">Beheer organen en stemdrempels</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} className="mr-2" />
          Nieuwe groep
        </Button>
      </header>

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      ) : !groups || groups.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-stone-500 italic">Geen groepen gevonden</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary-50">
                    <Users className="w-5 h-5 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="font-medium text-stone-800">{group.name}</h3>
                    <p className="text-sm text-stone-500">
                      Drempel: {group.required_votes} stemmen
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openEditModal(group)}>
                    <Edit size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeletingGroup(group)}>
                    <Trash2 size={14} className="text-rose-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          resetForm()
        }}
        title="Nieuwe groep"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            id="name"
            label="Naam"
            placeholder="Bijv. Raad van Bestuur"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="description"
            label="Beschrijving (optioneel)"
            placeholder="Korte beschrijving van de groep"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            id="requiredVotes"
            label="Vereiste stemmen"
            type="number"
            min="1"
            placeholder="5"
            value={requiredVotes}
            onChange={(e) => setRequiredVotes(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setShowCreateModal(false)
                resetForm()
              }}
            >
              Annuleren
            </Button>
            <Button type="submit" loading={createGroup.isPending}>
              Aanmaken
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editingGroup}
        onClose={() => {
          setEditingGroup(null)
          resetForm()
        }}
        title="Groep bewerken"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            id="edit-name"
            label="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            id="edit-description"
            label="Beschrijving (optioneel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            id="edit-requiredVotes"
            label="Vereiste stemmen"
            type="number"
            min="1"
            value={requiredVotes}
            onChange={(e) => setRequiredVotes(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setEditingGroup(null)
                resetForm()
              }}
            >
              Annuleren
            </Button>
            <Button type="submit" loading={updateGroup.isPending}>
              Opslaan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deletingGroup}
        onClose={() => setDeletingGroup(null)}
        title="Groep verwijderen"
        description="Weet je zeker dat je deze groep wilt verwijderen?"
      >
        <p className="text-stone-600 mb-6">
          De groep &quot;{deletingGroup?.name}&quot; wordt permanent verwijderd. Alle bijbehorende
          vragen moeten eerst worden verwijderd of verplaatst.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeletingGroup(null)}>
            Annuleren
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleteGroup.isPending}>
            Verwijderen
          </Button>
        </div>
      </Modal>
    </div>
  )
}
