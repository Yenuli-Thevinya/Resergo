'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReservationProvider } from '@/context/reservation-context'
import { ResourceProvider } from '@/context/resource-context'
import { UserProvider } from '@/context/user-context'
import { api } from '@/lib/api-client'
import type { ResourceOption, SessionUser } from '@/types'
import { Header } from './header'
import { Sidebar } from './sidebar'

type AppShellProps = {
  user: SessionUser
  resources: ResourceOption[]
  upcomingCount: number
  greeting: string
  weekday: string
  dateLabel: string
  children: React.ReactNode
}

/** Sidebar + header + shared dialogs around every signed-in page. */
export function AppShell({ user, resources, upcomingCount, greeting, weekday, dateLabel, children }: AppShellProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    try {
      await api('/api/auth/logout', { method: 'POST' })
    } catch {}
    window.location.href = '/login'
  }

  return (
    <UserProvider user={user}>
      <ReservationProvider resources={resources}>
        <ResourceProvider>
          <div className="app-shell">
            <Sidebar open={menuOpen} close={() => setMenuOpen(false)} logout={handleLogout} upcomingCount={upcomingCount} />
            <main className="main">
              <Header
                openMenu={() => setMenuOpen(true)}
                logout={handleLogout}
                greeting={greeting}
                weekday={weekday}
                dateLabel={dateLabel}
              />
              {children}
            </main>
          </div>
        </ResourceProvider>
      </ReservationProvider>
    </UserProvider>
  )
}
