import { requireUser } from '@/lib/auth'
import { getTeamsData, listDepartments } from '@/lib/users'
import { TeamsView } from './teams-view'

export async function TeamsPage() {
  const user = await requireUser()
  const [teams, departmentOptions] = await Promise.all([getTeamsData(), listDepartments()])
  return <TeamsView teams={teams} departmentOptions={departmentOptions} isAdmin={user.role === 'ADMIN'} />
}
