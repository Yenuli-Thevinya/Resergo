'use client'

import { createContext, useContext } from 'react'
import type { SessionUser } from '@/types'

const UserContext = createContext<SessionUser | null>(null)

/** The signed-in user, loaded on the server from the session cookie and passed down. */
export function UserProvider({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>
}

export function useCurrentUser(): SessionUser {
  const user = useContext(UserContext)
  if (!user) throw new Error('useCurrentUser must be used inside <UserProvider>')
  return user
}
