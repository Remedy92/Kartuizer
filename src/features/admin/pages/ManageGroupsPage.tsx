import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Loader2,
  Trash2,
  Users,
  Edit,
  UserPlus,
  X,
  Mail,
} from 'lucide-react'
import {
  useGroups,
  useGroupMembers,
  useCreateGroup,
  useUpdateGroup,
  useDeleteGroup,
  useAddGroupMember,
  useRemoveGroupMember,
  useUsers,
} from '@/hooks'
import { useToast } from '@/hooks'
import { Button, Input, Modal, Card, CardContent, Select } from '@/components/ui'
import type { Group, GroupMember, UserProfile } from '@/types'



interface GroupMembersSectionProps {
  groupId: string
  allUsers: UserProfile[]
}

function GroupMembersSection({ groupId, allUsers }: GroupMembersSectionProps) {
  const { data: members = [], isLoading, error: membersError } = useGroupMembers(groupId)
  const addMember = useAddGroupMember()
  const removeMember = useRemoveGroupMember()
  const { success, error: showError } = useToast()

  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [removingMember, setRemovingMember] = useState<GroupMember | null>(null)

  // Filter out users already in the group
  const availableUsers = allUsers.filter(
    (user) => !members.some((m) => m.user_id === user.id)
  )

  const handleAddMember = async () => {
    if (!selectedUserId) return

    try {
      await addMember.mutateAsync({
        groupId,
        userId: selectedUserId,
      })
      success('Lid toegevoegd', 'Het lid is aan de groep toegevoegd')
      setShowAddForm(false)
      setSelectedUserId('')
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }

  const handleRemoveMember = async () => {
    if (!removingMember) return

    try {
      await removeMember.mutateAsync({
        groupId,
        userId: removingMember.user_id,
      })
      success('Lid verwijderd', 'Het lid is uit de groep verwijderd')
      setRemovingMember(null)
    } catch (err) {
      showError('Fout', err instanceof Error ? err.message : 'Er is een fout opgetreden')
    }
  }



  if (isLoading) {
    return (
      <div className="pt-4 border-t border-stone-100 flex justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-stone-300" />
      </div>
    )
  }

  return (
    <div className="pt-4 border-t border-stone-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium text-stone-500 tracking-wider uppercase">
          Leden ({members.length})
        </span>
        {!showAddForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="text-primary-700 hover:text-primary-800"
          >
            <UserPlus size={14} className="mr-1.5" />
            Toevoegen
          </Button>
        )}
      </div>

      {/* Error state */}
      {membersError && (
        <p className="text-xs text-rose-500 mb-4 bg-rose-50 p-2 rounded">
          Leden konden niet worden geladen.
        </p>
      )}

      {/* Add member form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-stone-50 rounded-lg p-4 mb-4 space-y-3">
              {availableUsers.length > 0 ? (
                <Select
                  id="add-user"
                  placeholder="Selecteer gebruiker..."
                  options={availableUsers.map((u) => ({
                    value: u.id,
                    label: u.display_name || u.email,
                  }))}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="bg-white"
                />
              ) : (
                <p className="text-sm text-stone-500 italic py-2">
                  Alle actieve gebruikers zijn al lid van deze groep.
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {availableUsers.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAddMember}
                    loading={addMember.isPending}
                    disabled={!selectedUserId}
                  >
                    Toevoegen
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddForm(false)
                    setSelectedUserId('')
                  }}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      {members.length === 0 ? (
        <p className="text-sm text-stone-400 italic py-2">Nog geen leden</p>
      ) : (
        <div className="space-y-1">
          {members.map((member) => {
            const displayName = member.user_profiles?.display_name || member.user_profiles?.email?.split('@')[0] || 'Onbekend'
            const email = member.user_profiles?.email

            return (
              <div
                key={member.user_id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-stone-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200 flex items-center justify-center flex-shrink-0 shadow-sm group-hover:border-stone-300 transition-colors">
                    <span className="text-xs font-bold text-stone-500">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-800 text-sm truncate group-hover:text-primary-900 transition-colors">
                      {displayName}
                    </div>
                    {email && email.toLowerCase() !== displayName.toLowerCase() && (
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 truncate mt-0.5 font-medium">
                        <Mail size={10} className="opacity-60" />
                        {email}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Remove button with subtle hover effect */}
                  <button
                    onClick={() => setRemovingMember(member)}
                    className="p-2 rounded-full opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-stone-300 hover:text-rose-400 transition-all duration-200"
                    title="Verwijderen"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Remove confirmation modal */}
      <Modal
        open={!!removingMember}
        onClose={() => setRemovingMember(null)}
        title="Lid verwijderen"
      >
        <p className="text-stone-600 mb-6">
          Weet je zeker dat je{' '}
          <strong>
            {removingMember?.user_profiles?.display_name ||
              removingMember?.user_profiles?.email}
          </strong>{' '}
          uit deze groep wilt verwijderen?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRemovingMember(null)}>
            Annuleren
          </Button>
          <Button
            variant="danger"
            onClick={handleRemoveMember}
            loading={removeMember.isPending}
          >
            Verwijderen
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export function ManageGroupsPage() {
  const { data: groups, isLoading: isLoadingGroups } = useGroups()
  const { data: users } = useUsers()
  const createGroup = useCreateGroup()
  const updateGroup = useUpdateGroup()
  const deleteGroup = useDeleteGroup()
  const { success, error: showError } = useToast()

  const isLoading = isLoadingGroups

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [deletingGroup, setDeletingGroup] = useState<Group | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const resetForm = () => {
    setName('')
    setDescription('')
  }

  const openEditModal = (group: Group) => {
    setEditingGroup(group)
    setName(group.name)
    setDescription(group.description ?? '')
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createGroup.mutateAsync({
        name,
        description: description || undefined,
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
        name: name,
        description: description || undefined,
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
          <p className="text-stone-500">Raad van mede eigendom en blokraden</p>
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
              <CardContent className="p-5">
                {/* Group header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary-50">
                      <Users className="w-5 h-5 text-primary-700" />
                    </div>
                    <div>
                      <h3 className="font-medium text-stone-800">{group.name}</h3>
                      <p className="text-sm text-stone-500">
                        Leden: {group.required_votes}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(group)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingGroup(group)}
                    >
                      <Trash2 size={14} className="text-rose-500" />
                    </Button>
                  </div>
                </div>

                {/* Members section */}
                <GroupMembersSection
                  groupId={group.id}
                  allUsers={users || []}
                />
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
