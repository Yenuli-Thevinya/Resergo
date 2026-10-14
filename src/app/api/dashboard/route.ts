import { requireApiUser } from '@/lib/auth'
import { getDashboardStats } from '@/lib/dashboard'
import { respond } from '@/lib/http'

export async function GET(req: Request) {
  return respond(req, async () => getDashboardStats(await requireApiUser()))
}
