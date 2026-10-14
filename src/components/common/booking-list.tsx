'use client'

import { Clock3 } from 'lucide-react'
import { useReservation } from '@/context/reservation-context'
import { formatTime } from '@/lib/datetime'
import type { ReservationDTO } from '@/types'
import { EmptyState } from './empty-state'
import { reservationStatusLabel, reservationStatusTone } from './status'

export function BookingList({ reservations, emptyText = 'No reservations today.' }: { reservations: ReservationDTO[]; emptyText?: string }) {
  const { openDetails } = useReservation()

  if (reservations.length === 0) {
    return <EmptyState compact icon={Clock3} title={emptyText} description="New reservations will show up here as soon as they are made." />
  }

  return (
    <div className="booking-list">
      {reservations.map((booking) => {
        const [clock, meridiem] = formatTime(booking.startTime).split(' ')
        const tone = booking.isMine ? 'mint' : 'blue'
        return (
          <div
            className="booking-row row-clickable"
            key={booking.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetails(booking)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openDetails(booking)}
          >
            <div className={`time ${tone}`}>
              {clock}
              <small>{meridiem}</small>
            </div>
            <div className="booking-marker" />
            <div className="booking-main">
              <div>
                <strong>{booking.resourceName}</strong>
                <span>{booking.purpose}</span>
              </div>
              <div className="booking-person">
                <span className="avatar small">{booking.bookedByInitials}</span>
                <div>
                  <strong>{booking.bookedBy}</strong>
                  <span>{booking.department}</span>
                </div>
              </div>
            </div>
            <span className={`status-tag ${reservationStatusTone[booking.status]}`}>{reservationStatusLabel[booking.status]}</span>
          </div>
        )
      })}
    </div>
  )
}
