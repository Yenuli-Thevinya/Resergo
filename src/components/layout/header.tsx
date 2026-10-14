'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, LogOut, Menu, Plus } from 'lucide-react'
import { useReservation } from '@/context/reservation-context'
import { useCurrentUser } from '@/context/user-context'

type HeaderProps = {
  openMenu: () => void
  logout: () => void
  greeting: string
  weekday: string
  dateLabel: string
}

export function Header({ openMenu, logout, greeting, weekday, dateLabel }: HeaderProps) {
  const user = useCurrentUser()
  const { openCreate } = useReservation()
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileOpen])

  return (
    <header className="topbar">
      <button className="mobile-trigger" onClick={openMenu} aria-label="Open navigation">
        <Menu />
      </button>
      <div>
        <div className="crumb">
          {weekday} <span>/</span> {dateLabel}
        </div>
        <h1>
          {greeting}, {user.fullName.split(' ')[0]}.
        </h1>
        <p>Everything your organization has reserved, in one clear view.</p>
      </div>
      <div className="top-actions">
        <button className="notify" aria-label="Notifications">
          <Bell />
          <i />
        </button>

        <div className="profile-menu-container" ref={menuRef}>
          <button
            className="avatar profile-btn"
            aria-label="Open profile"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((prev) => !prev)}
            title={`${user.fullName} (${user.role})`}
          >
            {user.initials}
          </button>

          {profileOpen && (
            <div className="profile-dropdown" role="menu">
              <div className="profile-dropdown-header">
                <div className="avatar small">{user.initials}</div>
                <div className="profile-dropdown-info">
                  <strong>{user.fullName}</strong>
                  <small>{user.email}</small>
                  <span className="profile-role-tag">
                    {user.departmentName} · {user.role === 'ADMIN' ? 'Admin' : 'Employee'}
                  </span>
                </div>
              </div>
              <div className="profile-dropdown-divider" />
              <button
                className="profile-dropdown-logout"
                role="menuitem"
                onClick={() => {
                  setProfileOpen(false)
                  logout()
                }}
              >
                <LogOut />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>

        <button className="reserve-button" onClick={() => openCreate()}>
          <Plus /> New reservation
        </button>
      </div>
    </header>
  )
}
