'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Loader2 } from 'lucide-react'
import { api, errorMessage } from '@/lib/api-client'
import { describeDay, formatTimeRange } from '@/lib/datetime'
import type { ReservationDTO, ResourceDetailDTO } from '@/types'
import { Modal } from './modal'
import { availabilityTone } from './status'

type Props = {
  resourceId: number
  isAdmin: boolean
  onClose: () => void
  onReserve: (resourceId: number) => void
  onEdit: (resource: ResourceDetailDTO) => void
  onOpenReservation: (reservation: ReservationDTO) => void
}

export function ResourceDetailsDialog({ resourceId, isAdmin, onClose, onReserve, onEdit, onOpenReservation }: Props) {
  const [resource, setResource] = useState<ResourceDetailDTO | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let stale = false
    api<ResourceDetailDTO>(`/api/resources/${resourceId}`)
      .then((data) => !stale && setResource(data))
      .catch((e) => !stale && setError(errorMessage(e)))
    return () => {
      stale = true
    }
  }, [resourceId])

  return (
    <Modal kicker="RESOURCE DETAILS" title={resource?.name ?? 'Resource'} subtitle={resource ? [resource.category, resource.location].join(' · ') : undefined} onClose={onClose}>
      {error && (
        <div className="availability-box has-conflict" role="alert">
          <strong>{error}</strong>
        </div>
      )}
      {!resource && !error && (
        <div className="availability-box">
          <strong>
            <Loader2 className="spin" /> Loading…
          </strong>
        </div>
      )}

      {resource && (
        <>
          <div className="detail-list">
            <div className="detail-row">
              <span>Availability</span>
              <span className={`availability ${availabilityTone[resource.availability]}`}>{resource.availability}</span>
            </div>
            <div className="detail-row">
              <span>Capacity</span>
              <strong>{resource.capacity || '—'}</strong>
            </div>
            <div className="detail-row">
              <span>Next</span>
              <strong>{resource.nextText}</strong>
            </div>
            {resource.description && (
              <div className="detail-row">
                <span>About</span>
                <strong style={{ fontWeight: 500 }}>{resource.description}</strong>
              </div>
            )}
          </div>

          <h3 className="detail-subhead">Upcoming reservations</h3>
          {resource.upcoming.length === 0 ? (
            <p className="detail-note">Nothing is booked yet — this resource is free.</p>
          ) : (
            <div className="detail-list">
              {resource.upcoming.map((r) => (
                <button type="button" className="detail-row detail-link" key={r.id} onClick={() => onOpenReservation(r)}>
                  <span>
                    <CalendarDays /> {describeDay(r.startTime)} · {formatTimeRange(r.startTime, r.endTime)}
                  </span>
                  <strong>{r.bookedBy}</strong>
                </button>
              ))}
            </div>
          )}

          <div className="modal-bottom">
            <span />
            <div>
              <button type="button" className="ghost-button" onClick={onClose}>
                Close
              </button>
              {isAdmin && (
                <button type="button" className="ghost-button" onClick={() => onEdit(resource)}>
                  Edit resource
                </button>
              )}
              {(resource.availability === 'Available' || resource.availability === 'Booked') && (
                <button type="button" className="reserve-button" onClick={() => onReserve(resource.id)}>
                  Reserve
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
