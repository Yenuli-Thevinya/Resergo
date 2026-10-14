'use client'

import { formatDateLong, formatTimeRange } from '@/lib/datetime'
import type { ReservationDTO } from '@/types'
import { Modal } from './modal'
import { reservationStatusLabel, reservationStatusTone } from './status'

type Props = {
  reservation: ReservationDTO
  onClose: () => void
  onEdit: () => void
  onCancelReservation: () => void
}

export function ReservationDetailsDialog({ reservation: r, onClose, onEdit, onCancelReservation }: Props) {
  return (
    <Modal kicker="RESERVATION DETAILS" title={r.resourceName} subtitle={r.resourceLocation} onClose={onClose}>
      <div className="detail-list">
        <div className="detail-row">
          <span>Booked by</span>
          <strong className="detail-person">
            <span className="avatar small">{r.bookedByInitials}</span>
            {r.bookedBy}
            {r.isMine && <em>You</em>}
          </strong>
        </div>
        <div className="detail-row">
          <span>Department</span>
          <strong>{r.department}</strong>
        </div>
        <div className="detail-row">
          <span>Date</span>
          <strong>{formatDateLong(r.startTime)}</strong>
        </div>
        <div className="detail-row">
          <span>Time</span>
          <strong>{formatTimeRange(r.startTime, r.endTime)}</strong>
        </div>
        <div className="detail-row">
          <span>Purpose</span>
          <strong>{r.purpose}</strong>
        </div>
        <div className="detail-row">
          <span>Status</span>
          <span className={`status-tag ${reservationStatusTone[r.status]}`} style={{ display: 'inline-block' }}>
            {reservationStatusLabel[r.status]}
          </span>
        </div>
      </div>

      {!r.isMine && <p className="detail-note">Only {r.bookedBy} can change or cancel this reservation.</p>}

      <div className="modal-bottom">
        <span />
        <div>
          <button type="button" className="ghost-button" onClick={onClose}>
            Close
          </button>
          {r.canCancel && (
            <button type="button" className="danger-button" onClick={onCancelReservation}>
              Cancel reservation
            </button>
          )}
          {r.canEdit && (
            <button type="button" className="reserve-button" onClick={onEdit}>
              Edit
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
