'use client'

import { ChevronRight } from 'lucide-react'
import { useReservation } from '@/context/reservation-context'
import { describeDay, formatTimeRange } from '@/lib/datetime'
import type { ReservationDTO } from '@/types'

export function NextUpCard({ reservation }: { reservation: ReservationDTO | null }) {
  const { openDetails } = useReservation()

  if (!reservation) {
    return (
      <section className="next-reservation">
        <div>
          <span>NEXT UP FOR YOU</span>
          <h3>No upcoming reservations.</h3>
          <p>When you reserve a room or equipment, it will appear here.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="next-reservation">
      <div>
        <span>NEXT UP FOR YOU</span>
        <h3>{reservation.resourceName}</h3>
        <p>
          {describeDay(reservation.startTime)} · {formatTimeRange(reservation.startTime, reservation.endTime)} · {reservation.purpose}
        </p>
      </div>
      <button type="button" onClick={() => openDetails(reservation)}>
        View booking <ChevronRight />
      </button>
    </section>
  )
}
