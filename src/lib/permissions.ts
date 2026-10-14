import { ForbiddenError } from '@/lib/errors'
import type { SessionUser } from '@/types'

/**
 * Authorization rules (always enforced on the server):
 *
 *  - ADMIN gets exactly two extra powers: manage resources and manage users.
 *  - Reservation ownership applies to EVERYONE, admins included:
 *    only the person who created a reservation may edit or cancel it.
 */

export const isAdmin = (user: SessionUser): boolean => user.role === 'ADMIN'

export function assertAdmin(user: SessionUser): void {
  if (!isAdmin(user)) throw new ForbiddenError()
}

export const isReservationOwner = (user: SessionUser, reservation: { userId: number }): boolean =>
  reservation.userId === user.id

export function assertReservationOwner(user: SessionUser, reservation: { userId: number }): void {
  if (!isReservationOwner(user, reservation)) {
    throw new ForbiddenError('You can only change reservations that you created.')
  }
}
