import { useNavigate } from 'react-router-dom'
import { useGroups } from '@/hooks'
import { CreateQuestionForm } from '@/features/questions/components/CreateQuestionForm'

export function CreateQuestionPage() {
  const navigate = useNavigate()
  const { data: groups, isLoading: loadingGroups } = useGroups()

  const groupOptions = (groups ?? []).map((g) => ({
    value: g.id,
    label: g.name,
  }))

  return (
    <CreateQuestionForm
      groupOptions={groupOptions}
      groupsLoading={loadingGroups}
      onCancel={() => navigate('/admin/questions')}
      onSuccess={() => navigate('/admin/questions')}
    />
  )
}
