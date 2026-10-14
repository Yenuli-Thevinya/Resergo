'use client'

import { createContext, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ResourceDetailsDialog } from '@/components/common/resource-details-dialog'
import { ResourceFormDialog } from '@/components/common/resource-form-dialog'
import { useReservation } from '@/context/reservation-context'
import { useToast } from '@/context/toast-context'
import { useCurrentUser } from '@/context/user-context'
import type { ResourceDTO } from '@/types'

type ResourceContextValue = {
  openDetails: (resourceId: number) => void
  /** admin only: pass a resource to edit it, nothing to create one */
  openForm: (resource?: ResourceDTO) => void
}

const ResourceContext = createContext<ResourceContextValue | null>(null)

type Active = { type: 'details'; id: number } | { type: 'form'; resource?: ResourceDTO } | null

export function ResourceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const toast = useToast()
  const user = useCurrentUser()
  const { openCreate, openDetails: openReservationDetails } = useReservation()
  const [active, setActive] = useState<Active>(null)

  const value = useMemo<ResourceContextValue>(
    () => ({
      openDetails: (id) => setActive({ type: 'details', id }),
      openForm: (resource) => user.role === 'ADMIN' && setActive({ type: 'form', resource }),
    }),
    [user.role],
  ) as ResourceContextValue

  return (
    <ResourceContext.Provider value={value}>
      {children}

      {active?.type === 'details' && (
        <ResourceDetailsDialog
          resourceId={active.id}
          isAdmin={user.role === 'ADMIN'}
          onClose={() => setActive(null)}
          onReserve={(resourceId) => {
            setActive(null)
            openCreate({ resourceId })
          }}
          onEdit={(resource) => setActive({ type: 'form', resource })}
          onOpenReservation={(reservation) => {
            setActive(null)
            openReservationDetails(reservation)
          }}
        />
      )}

      {active?.type === 'form' && user.role === 'ADMIN' && (
        <ResourceFormDialog
          resource={active.resource}
          onClose={() => setActive(null)}
          onSaved={(message) => {
            setActive(null)
            toast.success(message)
            router.refresh()
          }}
        />
      )}
    </ResourceContext.Provider>
  )
}

export function useResourceDialogs(): ResourceContextValue {
  const ctx = useContext(ResourceContext)
  if (!ctx) throw new Error('useResourceDialogs must be used inside <ResourceProvider>')
  return ctx
}
