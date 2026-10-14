import { requireApiUser } from '@/lib/auth'
import { parseId, readJson, respond } from '@/lib/http'
import { cancelReservation, getReservation, updateReservation } from '@/lib/reservations'
import { reservationInputSchema } from '@/lib/validation'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    return getReservation(user, parseId((await params).id, 'Reservation'))
  })
}

/** Owner only (403 for everyone else, admins included). */
export async function PATCH(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    const id = parseId((await params).id, 'Reservation')
    return updateReservation(user, id, reservationInputSchema.parse(await readJson(req)))
  })
}

/** Soft-cancels (status = CANCELLED). Owner only. */
export async function DELETE(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    return cancelReservation(user, parseId((await params).id, 'Reservation'))
  })
}
