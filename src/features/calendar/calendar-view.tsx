'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, MapPin, Plus, X } from 'lucide-react'
import { EmptyState } from '@/components/common/empty-state'
import { PageHeading } from '@/components/common/page-heading'
import { CALENDAR_HOURS, SLOT_MINUTES } from '@/config/app'
import { useReservation } from '@/context/reservation-context'
import { addDays, formatCalendarHeading, formatDateLong, formatTimeRange, pad2, parseZoned, todayDateString, zoned } from '@/lib/datetime'
import type { CalendarData, ReservationDTO } from '@/types'

const HOUR_MS = 60 * 60 * 1000

export function CalendarView({ data }: { data: CalendarData }) {
  const router = useRouter()
  const { openCreate, openEdit, requestCancel } = useReservation()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<ReservationDTO | null>(null)
  const now = new Date(data.serverNow)

  const go = (date: string) =>
    startTransition(() => {
      setSelected(null)
      router.push(date === todayDateString() ? '/calendar' : `/calendar?date=${date}`)
    })

  /** HH:mm to pre-fill for a free hour, or null when that hour is already over. */
  function freeSlotStart(hour: number): string | null {
    const slotStart = parseZoned(data.date, `${pad2(hour)}:00`)!.getTime()
    if (slotStart + HOUR_MS <= now.getTime()) return null
    let minutes = hour * 60
    if (slotStart < now.getTime()) {
      const z = zoned(now)
      minutes = Math.ceil((z.hour * 60 + z.minute + 1) / SLOT_MINUTES) * SLOT_MINUTES
      if (minutes >= (hour + 1) * 60) return null
    }
    return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
  }

  return (
    <section className="calendar-page">
      <PageHeading
        kicker="RESERGO / CALENDAR"
        title="Daily availability"
        description="See who has reserved each resource and when it becomes available."
        action={
          <button className="reserve-button" onClick={() => openCreate({ date: data.date >= todayDateString() ? data.date : undefined })}>
            <Plus /> New reservation
          </button>
        }
      />

      <div className="calendar-toolbar">
        <button className="calendar-arrow" aria-label="Previous day" onClick={() => go(addDays(data.date, -1))}>
          ‹
        </button>
        <div className="calendar-date">
          <CalendarDays />
          <strong>{formatCalendarHeading(data.date)}</strong>
          {data.isToday && <span>Today</span>}
        </div>
        <button className="calendar-arrow" aria-label="Next day" onClick={() => go(addDays(data.date, 1))}>
          ›
        </button>
        {!data.isToday && (
          <button className="ghost-button" onClick={() => go(todayDateString())}>
            Today
          </button>
        )}
      </div>

      <div className="calendar-legend">
        <span>
          <i className="legend-dot free" /> Available
        </span>
        <span>
          <i className="legend-dot reserved" /> Reserved
        </span>
        <span>
          <i className="legend-dot mine" /> Your reservation
        </span>
        <small>Click a free slot to reserve it, or a reservation for details</small>
      </div>

      {data.rows.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No resources to show" description="Resources appear on the calendar once an administrator adds them." />
      ) : (
        <div className="calendar-grid" aria-busy={pending} style={pending ? { opacity: 0.55, transition: 'opacity .15s' } : undefined}>
          <div className="calendar-corner">Resources</div>
          {CALENDAR_HOURS.map((hour) => (
            <div className="calendar-time" key={hour}>
              {pad2(hour)}
            </div>
          ))}

          {data.rows.map(({ resource, reservations }) => (
            <div className="calendar-resource-row" key={resource.id}>
              <div className="calendar-resource">
                <strong>{resource.name}</strong>
                <span>
                  <MapPin /> {resource.location}
                </span>
                {resource.status !== 'AVAILABLE' && <small className="row-flag">{resource.availability}</small>}
              </div>

              {CALENDAR_HOURS.map((hour) => {
                const slotStart = parseZoned(data.date, `${pad2(hour)}:00`)!
                const slotEnd = new Date(slotStart.getTime() + HOUR_MS)
                const inSlot = reservations.filter((r) => new Date(r.startTime) < slotEnd && new Date(r.endTime) > slotStart)
                const startingHere = inSlot.filter((r) => {
                  const firstHour = CALENDAR_HOURS.find((h) => {
                    const s = parseZoned(data.date, `${pad2(h)}:00`)!
                    return new Date(r.startTime) < new Date(s.getTime() + HOUR_MS) && new Date(r.endTime) > s
                  })
                  return firstHour === hour
                })
                const startSlot = freeSlotStart(hour)

                return (
                  <div className={`calendar-cell ${inSlot.length ? 'has-booking' : ''}`} key={hour}>
                    {startingHere.length ? (
                      <div className="calendar-stack">
                        {startingHere.map((r) => (
                          <button
                            key={r.id}
                            className={`calendar-booking ${r.isMine ? 'mint' : 'blue'}`}
                            title={`${r.resourceName} · ${formatTimeRange(r.startTime, r.endTime)}`}
                            onClick={() => setSelected(r)}
                          >
                            <strong>{r.bookedBy}</strong>
                            <small>{r.department}</small>
                          </button>
                        ))}
                      </div>
                    ) : inSlot.length ? (
                      <span className="booking-continuation">Reserved</span>
                    ) : resource.status !== 'AVAILABLE' ? (
                      <span className="slot-note">{resource.availability}</span>
                    ) : startSlot ? (
                      <button
                        className="free-slot"
                        aria-label={`Reserve ${resource.name} at ${pad2(hour)}:00`}
                        onClick={() => openCreate({ resourceId: resource.id, date: data.date, startTime: startSlot })}
                      >
                        <span className="free-label">Free</span>
                      </button>
                    ) : (
                      <span className="slot-note past-slot">—</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="calendar-popover" role="dialog" aria-label="Reservation details">
          <button onClick={() => setSelected(null)} aria-label="Close reservation details">
            <X />
          </button>
          <span className="popover-kicker">RESERVATION DETAILS</span>
          <h3>{selected.resourceName}</h3>
          <strong className="popover-time">
            {formatDateLong(selected.startTime)} · {formatTimeRange(selected.startTime, selected.endTime)}
          </strong>
          <div className="popover-person">
            <span className="avatar small">{selected.bookedByInitials}</span>
            <div>
              <strong>{selected.bookedBy}</strong>
              <span>{selected.department}</span>
            </div>
          </div>
          <p>{selected.purpose}</p>
          {!selected.isMine && <p className="popover-note">Only {selected.bookedBy} can change this reservation.</p>}
          <div className="popover-actions">
            <button className="ghost-button" onClick={() => setSelected(null)}>
              Close details
            </button>
            {selected.canEdit && (
              <button
                className="ghost-button"
                onClick={() => {
                  openEdit(selected)
                  setSelected(null)
                }}
              >
                Edit
              </button>
            )}
            {selected.canCancel && (
              <button
                className="ghost-button danger-text"
                onClick={() => {
                  requestCancel(selected)
                  setSelected(null)
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
