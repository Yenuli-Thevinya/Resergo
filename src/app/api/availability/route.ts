import { requireApiUser } from '@/lib/auth'
import { respond } from '@/lib/http'
import { checkAvailability } from '@/lib/reservations'
import { availabilityQuerySchema } from '@/lib/validation'

export async function GET(req: Request) {
  return respond(req, async () => {
    await requireApiUser()
    const params = Object.fromEntries(new URL(req.url).searchParams)
    return checkAvailability(availabilityQuerySchema.parse(params))
  })
}
