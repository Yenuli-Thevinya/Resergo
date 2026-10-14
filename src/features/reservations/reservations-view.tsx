'use client'

import { useState } from 'react'
import { FileText, Plus } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeading } from '@/components/common/page-heading'
import { reservationStatusLabel, reservationStatusTone } from '@/components/common/status'
import { useReservation } from '@/context/reservation-context'
import { formatDateShort, formatTimeRange } from '@/lib/datetime'
import type { ReservationDTO } from '@/types'

type Tab = 'all' | 'mine'

export function ReservationsView({ reservations }: { reservations: ReservationDTO[] }) {
  const { openCreate, openDetails, openEdit, requestCancel } = useReservation()
  const [tab, setTab] = useState<Tab>('all')

  const rows = tab === 'all' ? reservations : reservations.filter((r) => r.isMine)

  return (
    <section>
      <PageHeading
        kicker="RESERGO / RESERVATIONS"
        title="Reservation log"
        description="See every resource hold across your organization."
        action={
          <button className="reserve-button" onClick={() => openCreate()}>
            <Plus /> New reservation
          </button>
        }
      />

      <div className="tabs">
        <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
          All reservations
        </button>
        <button className={tab === 'mine' ? 'active' : ''} onClick={() => setTab('mine')}>
          My reservations
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={tab === 'mine' ? "You haven't made any reservations yet." : 'No reservations yet.'}
          description="Reserve a room or piece of equipment and it will show up here."
          action={
            <button className="reserve-button" onClick={() => openCreate()}>
              <Plus /> New reservation
            </button>
          }
        />
      ) : (
        <div className="reservation-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Resource</th>
                <th>Booked by</th>
                <th>Department</th>
                <th>Purpose</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={r.status === 'CANCELLED' ? 'row-muted' : undefined}>
                  <td>{formatTimeRange(r.startTime, r.endTime)}</td>
                  <td>
                    <strong>{r.resourceName}</strong>
                  </td>
                  <td>
                    {r.bookedBy}
                    {r.isMine && <em className="you-tag">You</em>}
                  </td>
                  <td>
                    <span className="department-badge">{r.department}</span>
                  </td>
                  <td>{r.purpose}</td>
                  <td>{formatDateShort(r.startTime)}</td>
                  <td>
                    <span className={`status-tag ${reservationStatusTone[r.status]}`}>{reservationStatusLabel[r.status]}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="table-action" onClick={() => openDetails(r)}>
                        View
                      </button>
                      {/* Edit / Cancel only exist for the person who created the reservation (admins included). The server enforces it too. */}
                      {r.canEdit && (
                        <button className="table-action" onClick={() => openEdit(r)}>
                          Edit
                        </button>
                      )}
                      {r.canCancel && (
                        <button className="table-action danger" onClick={() => requestCancel(r)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
