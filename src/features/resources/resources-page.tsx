import { requireUser } from '@/lib/auth'
import { listResources } from '@/lib/resources'
import { ResourcesView } from './resources-view'

export async function ResourcesPage() {
  const user = await requireUser()
  const resources = await listResources()
  return <ResourcesView resources={resources} isAdmin={user.role === 'ADMIN'} />
}
