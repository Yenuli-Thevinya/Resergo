import { requireApiUser } from '@/lib/auth'
import { respond } from '@/lib/http'
import { listDepartments } from '@/lib/users'

export async function GET(req: Request) {
  return respond(req, async () => {
    await requireApiUser()
    return listDepartments()
  })
}
