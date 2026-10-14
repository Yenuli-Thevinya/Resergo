import { requireApiUser } from '@/lib/auth'
import { respond } from '@/lib/http'

export async function GET(req: Request) {
  return respond(req, async () => ({ user: await requireApiUser() }))
}
