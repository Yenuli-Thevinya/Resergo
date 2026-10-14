import { AppShell } from '@/components/layout/app-shell'
import { requireUser } from '@/lib/auth'
import { nowZoned } from '@/lib/datetime'
import { countUpcoming } from '@/lib/reservations'
import { listBookableResources } from '@/lib/resources'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser() // signed-out visitors are redirected to /login
  const [resources, upcomingCount] = await Promise.all([listBookableResources(), countUpcoming(user.id)])

  const now = nowZoned()
  const greeting = now.hour < 12 ? 'Good morning' : now.hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <AppShell
      user={user}
      resources={resources}
      upcomingCount={upcomingCount}
      greeting={greeting}
      weekday={now.toFormat('cccc').toUpperCase()}
      dateLabel={now.toFormat('d LLLL yyyy').toUpperCase()}
    >
      {children}
    </AppShell>
  )
}
