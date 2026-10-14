import { requireUser } from '@/lib/auth'
import { listReservations } from '@/lib/reservations'
import { ReservationsView } from './reservations-view'

export async function ReservationsPage() {
  const user = await requireUser()
  const reservations = await listReservations(user)
  return <ReservationsView reservations={reservations} />
}
