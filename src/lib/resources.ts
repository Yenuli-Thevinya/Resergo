import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { describeDay, formatTime } from '@/lib/datetime'
import { ConflictError, NotFoundError } from '@/lib/errors'
import { assertAdmin } from '@/lib/permissions'
import { reservationInclude, toReservationDTO } from '@/lib/reservations'
import type { ResourceInput } from '@/lib/validation'
import type {
  ResourceAvailability,
  ResourceDTO,
  ResourceDetailDTO,
  ResourceOption,
  SessionUser,
  Tone,
} from '@/types'

type ResourceRow = Prisma.ResourceGetPayload<object>
type Slot = { resourceId: number; startTime: Date; endTime: Date }

const toneFor = (category: string): Tone =>
  /meeting/i.test(category) ? 'mint' : /conference/i.test(category) ? 'blue' : 'yellow'

/**
 * "Booked" is never stored. It is derived here from the operational status
 * plus the ACTIVE reservations that cover the current moment.
 */
export function buildResourceDTO(row: ResourceRow, slots: Slot[], now: Date = new Date()): ResourceDTO {
  const mine = slots
    .filter((s) => s.resourceId === row.id && s.endTime > now)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  const current = mine.find((s) => s.startTime <= now && s.endTime > now)
  const next = mine.find((s) => s.startTime > now)

  let availability: ResourceAvailability
  let nextText: string

  if (row.status === 'MAINTENANCE') {
    availability = 'Maintenance'
    nextText = 'Under maintenance'
  } else if (row.status === 'UNAVAILABLE') {
    availability = 'Unavailable'
    nextText = 'Currently unavailable'
  } else if (current) {
    availability = 'Booked'
    // follow back-to-back bookings to find when it is really free again
    let freeAt = current.endTime
    for (const slot of mine) if (slot.startTime <= freeAt && slot.endTime > freeAt) freeAt = slot.endTime
    nextText = `Free at ${formatTime(freeAt)}`
  } else {
    availability = 'Available'
    if (!next) nextText = 'No upcoming reservations'
    else {
      const day = describeDay(next.startTime, now)
      nextText = day === 'Today' ? `Next reservation ${formatTime(next.startTime)}` : `Next reservation ${day.toLowerCase()}`
    }
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    location: row.location,
    capacity: row.capacity,
    status: row.status,
    availability,
    nextText,
    tone: toneFor(row.category),
  }
}

async function activeSlots(resourceIds?: number[], now = new Date()): Promise<Slot[]> {
  return prisma.reservation.findMany({
    where: {
      status: { not: 'CANCELLED' },
      endTime: { gt: now },
      ...(resourceIds ? { resourceId: { in: resourceIds } } : {}),
    },
    select: { resourceId: true, startTime: true, endTime: true },
    orderBy: { startTime: 'asc' },
  })
}

export async function listResources(): Promise<ResourceDTO[]> {
  const rows = await prisma.resource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
  const now = new Date()
  const slots = await activeSlots(rows.map((r) => r.id), now)
  return rows.map((row) => buildResourceDTO(row, slots, now))
}

/** Resources that can currently be reserved (used by the reservation form). */
export async function listBookableResources(): Promise<ResourceOption[]> {
  const rows = await prisma.resource.findMany({
    where: { isActive: true, status: 'AVAILABLE' },
    select: { id: true, name: true, location: true, status: true },
    orderBy: { name: 'asc' },
  })
  return rows
}

export async function getResource(user: SessionUser, id: number): Promise<ResourceDetailDTO> {
  const row = await prisma.resource.findUnique({ where: { id } })
  if (!row || !row.isActive) throw new NotFoundError('Resource not found.')

  const now = new Date()
  const [slots, upcoming] = await Promise.all([
    activeSlots([id], now),
    prisma.reservation.findMany({
      where: { resourceId: id, status: { not: 'CANCELLED' }, endTime: { gt: now } },
      include: reservationInclude,
      orderBy: { startTime: 'asc' },
      take: 8,
    }),
  ])

  return { ...buildResourceDTO(row, slots, now), upcoming: upcoming.map((r) => toReservationDTO(r, user, now)) }
}

const duplicateName = () => new ConflictError('A resource with this name already exists.', 'DUPLICATE_RESOURCE')

export async function createResource(user: SessionUser, input: ResourceInput): Promise<ResourceDTO> {
  assertAdmin(user)
  try {
    const row = await prisma.resource.create({ data: input })
    return buildResourceDTO(row, [])
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicateName()
    throw error
  }
}

export async function updateResource(
  user: SessionUser,
  id: number,
  input: Partial<ResourceInput>,
): Promise<ResourceDTO> {
  assertAdmin(user)
  const existing = await prisma.resource.findUnique({ where: { id } })
  if (!existing || !existing.isActive) throw new NotFoundError('Resource not found.')

  try {
    const row = await prisma.resource.update({ where: { id }, data: input })
    return buildResourceDTO(row, await activeSlots([id]))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicateName()
    throw error
  }
}

/**
 * Removes a resource without ever destroying reservation history:
 *  - upcoming active reservations  -> refused (mark it Unavailable/Maintenance instead)
 *  - has past/cancelled history    -> deactivated (hidden, history kept)
 *  - never used                    -> deleted
 */
export async function removeResource(user: SessionUser, id: number): Promise<{ result: 'deleted' | 'deactivated' }> {
  assertAdmin(user)
  const existing = await prisma.resource.findUnique({ where: { id } })
  if (!existing || !existing.isActive) throw new NotFoundError('Resource not found.')

  const upcoming = await prisma.reservation.count({
    where: { resourceId: id, status: { not: 'CANCELLED' }, endTime: { gt: new Date() } },
  })
  if (upcoming > 0) {
    throw new ConflictError(
      'This resource has upcoming reservations. Mark it Unavailable or Maintenance instead, or wait until they have finished.',
      'RESOURCE_IN_USE',
    )
  }

  const history = await prisma.reservation.count({ where: { resourceId: id } })
  if (history > 0) {
    await prisma.resource.update({ where: { id }, data: { isActive: false } })
    return { result: 'deactivated' }
  }
  await prisma.resource.delete({ where: { id } })
  return { result: 'deleted' }
}
