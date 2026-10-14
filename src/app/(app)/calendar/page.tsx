import { CalendarPage } from '@/features/calendar/calendar-page'

export default async function Page({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams
  return <CalendarPage date={date} />
}
