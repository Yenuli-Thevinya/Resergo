import { prisma } from '@/lib/db'
import { isValidDateString, todayDateString } from '@/lib/datetime'
import { buildResourceDTO } from '@/lib/resources'
import { listActiveForDay } from '@/lib/reservations'
import type { CalendarData, SessionUser } from '@/types'

/** Resources + active reservations for one day (the calendar grid). */
export async function getAvailabilityForDate(user: SessionUser, requestedDate?: string): Promise<CalendarData> {
  const date = requestedDate && isValidDateString(requestedDate) ? requestedDate : todayDateString()
  const now = new Date()

  const [resources, reservations, slots] = await Promise.all([
    prisma.resource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    listActiveForDay(user, date),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, endTime: { gt: now } },
      select: { resourceId: true, startTime: true, endTime: true },
    }),
  ])

  return {
    date,
    isToday: date === todayDateString(),
    serverNow: now.toISOString(),
    rows: resources.map((resource) => ({
      resource: buildResourceDTO(resource, slots, now),
      reservations: reservations.filter((r) => r.resourceId === resource.id),
    })),
  }
}

