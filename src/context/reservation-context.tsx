'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ReservationDetailsDialog } from '@/components/common/reservation-details-dialog'
import { ReservationDialog, type ReservationPrefill } from '@/components/common/reservation-dialog'
import { useToast } from '@/context/toast-context'
import { api, errorMessage } from '@/lib/api-client'
import { formatDateLong, formatTimeRange } from '@/lib/datetime'
import type { ReservationDTO, ResourceOption } from '@/types'

type ReservationContextValue = {
  openCreate: (prefill?: ReservationPrefill) => void
  openEdit: (reservation: ReservationDTO) => void
  openDetails: (reservation: ReservationDTO) => void
  requestCancel: (reservation: ReservationDTO) => void
}

const ReservationContext = createContext<ReservationContextValue | null>(null)

type Active =
  | { type: 'form'; mode: 'create'; prefill?: ReservationPrefill }
  | { type: 'form'; mode: 'edit'; reservation: ReservationDTO }
  | { type: 'details'; reservation: ReservationDTO }
  | { type: 'cancel'; reservation: ReservationDTO }
  | null

/** Hosts the reservation dialogs once, so any page/component can open them. */
export function ReservationProvider({ resources, children }: { resources: ResourceOption[]; children: React.ReactNode }) {
  const router = useRouter()
  const toast = useToast()
  const [active, setActive] = useState<Active>(null)
  const [busy, setBusy] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)

  const close = useCallback(() => {
    setActive(null)
    setCancelError(null)
  }, [])

  const value = useMemo<ReservationContextValue>(
    () => ({
      openCreate: (prefill) => setActive({ type: 'form', mode: 'create', prefill }),
      openEdit: (reservation) => setActive({ type: 'form', mode: 'edit', reservation }),
      openDetails: (reservation) => setActive({ type: 'details', reservation }),
      requestCancel: (reservation) => {
        setCancelError(null)
        setActive({ type: 'cancel', reservation })
      },
    }),
    [],
  )

  async function confirmCancel(reservation: ReservationDTO) {
    setBusy(true)
    setCancelError(null)
    try {
      await api(`/api/reservations/${reservation.id}`, { method: 'DELETE' })
      close()
      toast.success('Reservation cancelled')
      router.refresh() // dashboard, list, calendar and availability re-read from PostgreSQL
    } catch (error) {
      setCancelError(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ReservationContext.Provider value={value}>
      {children}

      {active?.type === 'form' && (
        <ReservationDialog
          mode={active.mode}
          resources={resources}
          prefill={active.mode === 'create' ? active.prefill : undefined}
          reservation={active.mode === 'edit' ? active.reservation : undefined}
          onClose={close}
          onSaved={(message) => {
            close()
            toast.success(message)
            router.refresh()
          }}
        />
      )}

      {active?.type === 'details' && (
        <ReservationDetailsDialog
          reservation={active.reservation}
          onClose={close}
          onEdit={() => setActive({ type: 'form', mode: 'edit', reservation: active.reservation })}
          onCancelReservation={() => value.requestCancel(active.reservation)}
        />
      )}

      {active?.type === 'cancel' && (
        <ConfirmDialog
          title="Cancel reservation?"
          message="Are you sure you want to cancel this reservation?"
          details={
            <div className="detail-list">
              <div className="detail-row">
                <span>Resource</span>
                <strong>{active.reservation.resourceName}</strong>
              </div>
              <div className="detail-row">
                <span>When</span>
                <strong>
                  {formatDateLong(active.reservation.startTime)}, {formatTimeRange(active.reservation.startTime, active.reservation.endTime)}
                </strong>
              </div>
            </div>
          }
          confirmLabel="Cancel reservation"
          cancelLabel="Keep reservation"
          busy={busy}
          error={cancelError}
          onConfirm={() => confirmCancel(active.reservation)}
          onCancel={close}
        />
      )}
    </ReservationContext.Provider>
  )
}

export function useReservation(): ReservationContextValue {
  const ctx = useContext(ReservationContext)
  if (!ctx) throw new Error('useReservation must be used inside <ReservationProvider>')
  return ctx
}
