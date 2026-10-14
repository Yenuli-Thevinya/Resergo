import { requireApiUser } from '@/lib/auth'
import { getAvailabilityForDate } from '@/lib/calendar'
import { respond } from '@/lib/http'

export async function GET(req: Request) {
  return respond(req, async () => {
    const user = await requireApiUser()
    return getAvailabilityForDate(user, new URL(req.url).searchParams.get('date') ?? undefined)
  })
}
