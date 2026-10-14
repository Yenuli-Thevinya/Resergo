import { requireUser } from '@/lib/auth'
import { getAvailabilityForDate } from '@/lib/calendar'
import { CalendarView } from './calendar-view'

/** `date` comes from ?date=YYYY-MM-DD (defaults to today). Data is read live from PostgreSQL. */
export async function CalendarPage({ date }: { date?: string }) {
  const user = await requireUser()
  const data = await getAvailabilityForDate(user, date)
  return <CalendarView data={data} />
}
