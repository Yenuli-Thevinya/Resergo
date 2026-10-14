import { requireApiUser } from '@/lib/auth'
import { readJson, respond } from '@/lib/http'
import { createReservation, listReservations } from '@/lib/reservations'
import { reservationInputSchema } from '@/lib/validation'

export async function GET(req: Request) {
  return respond(req, async () => {
    const user = await requireApiUser()
    const params = new URL(req.url).searchParams
    return listReservations(user, {
      scope: params.get('scope') === 'mine' ? 'mine' : 'all',
      date: params.get('date') ?? undefined,
    })
  })
}

export async function POST(req: Request) {
  return respond(
    req,
    async () => {
      const user = await requireApiUser()
      // userId is NEVER read from the body — it always comes from the session.
      return createReservation(user, reservationInputSchema.parse(await readJson(req)))
    },
    201,
  )
}
