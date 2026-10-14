import { prisma } from '@/lib/db'
import { dayBounds, formatTime, monthBounds, todayDateString } from '@/lib/datetime'
import { buildResourceDTO } from '@/lib/resources'
import { reservationInclude, toReservationDTO } from '@/lib/reservations'
import type { DashboardStats, SessionUser } from '@/types'

/** Everything on the overview page, calculated from current PostgreSQL data. */
export async function getDashboardStats(user: SessionUser): Promise<DashboardStats> {
  const now = new Date()
  const today = dayBounds(todayDateString())!
  const month = monthBounds(now)
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [resources, activeSlots, todayRows, myUpcomingRows, departments, bookersThisMonth, usage] = await Promise.all([
    prisma.resource.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, endTime: { gt: now } },
      select: { resourceId: true, startTime: true, endTime: true },
      orderBy: { startTime: 'asc' },
    }),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, startTime: { gte: today.start, lt: today.end } },
      include: reservationInclude,
      orderBy: { startTime: 'asc' },
    }),
    prisma.reservation.findMany({
      where: { userId: user.id, status: { not: 'CANCELLED' }, startTime: { gt: now } },
      include: reservationInclude,
      orderBy: { startTime: 'asc' },
    }),
    prisma.department.findMany({
      select: { id: true, _count: { select: { users: { where: { status: 'ACTIVE' } } } } },
    }),
    prisma.reservation.groupBy({
      by: ['userId'],
      where: { status: { not: 'CANCELLED' }, startTime: { gte: month.start, lt: month.end } },
    }),
    prisma.reservation.groupBy({
      by: ['resourceId'],
      where: { status: { not: 'CANCELLED' }, startTime: { gte: last30 } },
      _count: { _all: true },
    }),
  ])

  const resourceDTOs = resources.map((r) => buildResourceDTO(r, activeSlots, now))
  const open = resourceDTOs.filter((r) => r.availability === 'Available')
  const roomsOpen = open.filter((r) => /room/i.test(r.category)).length

  const usageById = new Map(usage.map((u) => [u.resourceId, u._count._all]))
  const popular = [...resourceDTOs]
    .sort((a, b) => {
      const byUsage = (usageById.get(b.id) ?? 0) - (usageById.get(a.id) ?? 0)
      if (byUsage !== 0) return byUsage
      return Number(b.availability === 'Available') - Number(a.availability === 'Available')
    })
    .slice(0, 3)

  const nextRow = myUpcomingRows[0]

  return {
    availableNow: open.length,
    totalResources: resourceDTOs.length,
    roomsOpen,
    assetsOpen: open.length - roomsOpen,
    todaysReservations: todayRows.length,
    todaysDepartments: new Set(todayRows.map((r) => r.user.department.name)).size,
    yourUpcoming: myUpcomingRows.length,
    nextStartLabel: nextRow ? formatTime(nextRow.startTime) : null,
    activeTeams: departments.filter((d) => d._count.users > 0).length,
    peopleBooking: bookersThisMonth.length,
    nextUp: nextRow ? toReservationDTO(nextRow, user, now) : null,
    popular,
    today: todayRows.map((r) => toReservationDTO(r, user, now)),
  }
}
