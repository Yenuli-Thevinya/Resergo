'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, ChevronRight, CircleHelp, FileText, Grid2X2, LayoutDashboard, LogOut, Settings2, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/common/logo'
import { useCurrentUser } from '@/context/user-context'

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number }

type SidebarProps = {
  open: boolean
  close: () => void
  logout: () => void
  upcomingCount: number
}

export function Sidebar({ open, close, logout, upcomingCount }: SidebarProps) {
  const pathname = usePathname()
  const user = useCurrentUser()

  const nav: NavItem[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/resources', label: 'Resource library', icon: Grid2X2 },
    { href: '/reservations', label: 'Reservations', icon: FileText, badge: upcomingCount },
    { href: '/calendar', label: 'Calendar', icon: CalendarDays },
    { href: '/teams', label: 'Teams & people', icon: Users },
  ]
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))

  return (
    <>
      <div className={`scrim ${open ? 'visible' : ''}`} onClick={close} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="side-head">
          <Logo />
          <button className="close-button" onClick={close} aria-label="Close navigation">
            <X />
          </button>
        </div>

        <div className="side-section">
          <p>Workspace</p>
          {nav.map(({ href, label, icon: Icon, badge }) => (
            <Link key={href} href={href} onClick={close} className={`side-link ${isActive(href) ? 'selected' : ''}`}>
              <Icon />
              <span>{label}</span>
              {badge ? <b>{badge}</b> : null}
            </Link>
          ))}
        </div>

        <div className="side-bottom">
          <p>Account</p>
          <button className="side-link">
            <Settings2 />
            <span>Settings</span>
          </button>
          <button className="side-link">
            <CircleHelp />
            <span>Help center</span>
          </button>
          <button className="profile-chip">
            <span className="avatar">{user.initials}</span>
            <span>
              <strong>{user.fullName}</strong>
              <small>
                {user.departmentName} · {user.role === 'ADMIN' ? 'Admin' : 'Employee'}
              </small>
            </span>
            <ChevronRight />
          </button>
          <button className="logout-link" onClick={logout} aria-label="Sign out">
            <LogOut /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
