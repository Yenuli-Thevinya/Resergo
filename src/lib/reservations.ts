import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { dayBounds } from '@/lib/datetime'
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { assertReservationOwner } from '@/lib/permissions'
import { deriveStatus, validateWindow } from '@/lib/reservation-rules'
import { initialsOf } from '@/lib/auth'
import type { ReservationInput } from '@/lib/validation'
import type { AvailabilityResult, ConflictInfo, ReservationDTO, SessionUser } from '@/types'

const reservationInclude = {
  resource: { select: { id: true, name: true, location: true } },
  user: { select: { id: true, fullName: true, department: { select: { name: true } } } },
} satisfies Prisma.ReservationInclude

export type ReservationRow = Prisma.ReservationGetPayload<{ include: typeof reservationInclude }>

export function toReservationDTO(row: ReservationRow, viewer: SessionUser, now: Date = new Date()): ReservationDTO {
  const isMine = row.userId === viewer.id
  const cancelled = row.status === 'CANCELLED'
  return {
    id: row.id,
    resourceId: row.resourceId,
    resourceName: row.resource.name,
    resourceLocation: row.resource.location,
    userId: row.userId,
    bookedBy: row.user.fullName,
    bookedByInitials: initialsOf(row.user.fullName),
    department: row.user.department.name,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    purpose: row.purpose,
    status: deriveStatus(row.status, row.startTime, row.endTime, now),
    isMine,
    // Ownership is the ONLY thing that grants edit/cancel — admins get no special rights here.
    canEdit: isMine && !cancelled && row.startTime > now,
    canCancel: isMine && !cancelled && row.endTime > now,
  }
}

const conflictInfo = (row: ReservationRow): ConflictInfo => ({
  reservationId: row.id,
  resourceName: row.resource.name,
  bookedBy: row.user.fullName,
  department: row.user.department.name,
  startTime: row.startTime.toISOString(),
  endTime: row.endTime.toISOString(),
})

const conflictError = (row: ReservationRow) =>
  new ConflictError('This resource is already reserved during the selected time.', 'RESERVATION_CONFLICT', {
    conflict: conflictInfo(row),
  })

type Db = Prisma.TransactionClient | typeof prisma

/** First ACTIVE reservation on this resource overlapping [start, end). */
async function findConflict(db: Db, resourceId: number, start: Date, end: Date, excludeId?: number) {
  return db.reservation.findFirst({
    where: {
      resourceId,
      status: { not: 'CANCELLED' },
      startTime: { lt: end }, // newEnd   > existingStart
      endTime: { gt: start }, // newStart < existingEnd
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: reservationInclude,
    orderBy: { startTime: 'asc' },
  })
}

/** Did PostgreSQL's exclusion constraint reject the insert/update? (race-condition backstop) */
function isOverlapViolation(error: unknown): boolean {
  const e = error as { message?: string; code?: string; meta?: unknown; cause?: unknown }
  let blob = `${e?.message ?? ''} ${e?.code ?? ''}`
  try {
    blob += ` ${JSON.stringify(e?.meta ?? {})} ${JSON.stringify(e?.cause ?? {})}`
  } catch {}
  return /reservation_no_overlap|23P01/.test(blob)
}

/**
 * Locks the resource row for the rest of the transaction. Everyone trying to book the
 * SAME resource waits here, so "check for conflicts, then insert" can't interleave.
 */
async function lockBookableResource(tx: Prisma.TransactionClient, resourceId: number) {
  const rows = await tx.$queryRaw<{ status: string; isActive: boolean }[]>`
    SELECT "status"::text AS "status", "isActive" FROM "Resource" WHERE "id" = ${resourceId} FOR UPDATE`
  const resource = rows[0]
  if (!resource || !resource.isActive) throw new NotFoundError('Resource not found.')
  if (resource.status !== 'AVAILABLE') throw new ValidationError('This resource is currently unavailable.')
}

export async function createReservation(user: SessionUser, input: ReservationInput): Promise<ReservationDTO> {
  const { start, end } = validateWindow(input)

  try {
    const row = await prisma.$transaction(async (tx) => {
      await lockBookableResource(tx, input.resourceId)

      const conflict = await findConflict(tx, input.resourceId, start, end)
      if (conflict) throw conflictError(conflict)

      return tx.reservation.create({
        data: {
          resourceId: input.resourceId,
          userId: user.id, // always from the session, never from the request body
          startTime: start,
          endTime: end,
          purpose: input.purpose,
          status: 'UPCOMING',
        },
        include: reservationInclude,
      })
    })
    return toReservationDTO(row, user)
  } catch (error) {
    throw await translateOverlap(error, input.resourceId, start, end)
  }
}

export async function updateReservation(user: SessionUser, id: number, input: ReservationInput): Promise<ReservationDTO> {
  const existing = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude })
  if (!existing) throw new NotFoundError('Reservation not found.')

  assertReservationOwner(user, existing) // 403 for everyone except the creator (admins included)

  const now = new Date()
  if (existing.status === 'CANCELLED') throw new ValidationError('Cancelled reservations cannot be edited.')
  if (existing.endTime <= now) throw new ValidationError('Completed reservations cannot be edited.')
  if (existing.startTime <= now) throw new ValidationError('A reservation that has already started cannot be edited.')

  const { start, end } = validateWindow(input, now)

  try {
    const row = await prisma.$transaction(async (tx) => {
      await lockBookableResource(tx, input.resourceId)

      const conflict = await findConflict(tx, input.resourceId, start, end, id) // ignore itself
      if (conflict) throw conflictError(conflict)

      return tx.reservation.update({
        where: { id },
        data: { resourceId: input.resourceId, startTime: start, endTime: end, purpose: input.purpose },
        include: reservationInclude,
      })
    })
    return toReservationDTO(row, user)
  } catch (error) {
    throw await translateOverlap(error, input.resourceId, start, end, id)
  }
}

/** Soft cancel: the row stays for history but stops blocking availability. */
export async function cancelReservation(user: SessionUser, id: number): Promise<ReservationDTO> {
  const existing = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude })
  if (!existing) throw new NotFoundError('Reservation not found.')

  assertReservationOwner(user, existing)

  if (existing.status === 'CANCELLED') throw new ValidationError('This reservation is already cancelled.')
  if (existing.endTime <= new Date()) throw new ValidationError('Completed reservations cannot be cancelled.')

  const row = await prisma.reservation.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: reservationInclude,
  })
  return toReservationDTO(row, user)
}

async function translateOverlap(error: unknown, resourceId: number, start: Date, end: Date, excludeId?: number) {
  if (!isOverlapViolation(error)) return error
  const conflict = await findConflict(prisma, resourceId, start, end, excludeId)
  return conflict
    ? conflictError(conflict)
    : new ConflictError('This resource is already reserved during the selected time.', 'RESERVATION_CONFLICT')
}

export async function getReservation(user: SessionUser, id: number): Promise<ReservationDTO> {
  const row = await prisma.reservation.findUnique({ where: { id }, include: reservationInclude })
  if (!row) throw new NotFoundError('Reservation not found.')
  return toReservationDTO(row, user)
}

export async function listReservations(
  user: SessionUser,
  opts: { scope?: 'all' | 'mine'; date?: string; take?: number } = {},
): Promise<ReservationDTO[]> {
  const bounds = opts.date ? dayBounds(opts.date) : null
  if (opts.date && !bounds) throw new ValidationError('Please choose a valid date.')

  const rows = await prisma.reservation.findMany({
    where: {
      ...(opts.scope === 'mine' ? { userId: user.id } : {}),
      ...(bounds ? { startTime: { lt: bounds.end }, endTime: { gt: bounds.start } } : {}),
    },
    include: reservationInclude,
    orderBy: { startTime: 'desc' },
    take: opts.take ?? 500,
  })
  const now = new Date()
  return rows.map((row) => toReservationDTO(row, user, now))
}

/** Live conflict check used by the reservation form (UX only — the server re-checks on save). */
export async function checkAvailability(
  input: { resourceId: number; date: string; startTime: string; endTime: string; excludeId?: number },
): Promise<AvailabilityResult> {
  let window: { start: Date; end: Date }
  try {
    window = validateWindow(input)
  } catch (error) {
    if (error instanceof ValidationError) return { available: false, reason: error.message }
    throw error
  }

  const resource = await prisma.resource.findUnique({ where: { id: input.resourceId } })
  if (!resource || !resource.isActive) return { available: false, reason: 'Resource not found.' }
  if (resource.status !== 'AVAILABLE') return { available: false, reason: 'This resource is currently unavailable.' }

  const conflict = await findConflict(prisma, input.resourceId, window.start, window.end, input.excludeId)
  if (conflict) {
    return {
      available: false,
      reason: 'This resource is already reserved during the selected time.',
      conflict: conflictInfo(conflict),
    }
  }
  return { available: true }
}

export async function countUpcoming(userId: number): Promise<number> {
  return prisma.reservation.count({
    where: { userId, status: { not: 'CANCELLED' }, endTime: { gt: new Date() } },
  })
}

/** Active reservations overlapping a calendar day. */
export async function listActiveForDay(user: SessionUser, date: string): Promise<ReservationDTO[]> {
  const bounds = dayBounds(date)
  if (!bounds) throw new ValidationError('Please choose a valid date.')
  const rows = await prisma.reservation.findMany({
    where: { status: { not: 'CANCELLED' }, startTime: { lt: bounds.end }, endTime: { gt: bounds.start } },
    include: reservationInclude,
    orderBy: { startTime: 'asc' },
  })
  const now = new Date()
  return rows.map((row) => toReservationDTO(row, user, now))
}

export { reservationInclude }
