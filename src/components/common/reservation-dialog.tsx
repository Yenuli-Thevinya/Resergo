'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { SLOT_MINUTES, WORKDAY_END_HOUR, WORKDAY_START_HOUR } from '@/config/app'
import { useCurrentUser } from '@/context/user-context'
import { ApiError, api, errorMessage } from '@/lib/api-client'
import {
  dateInputOf,
  formatMinutes,
  formatTimeRange,
  minutesOfDay,
  nowZoned,
  pad2,
  parseZoned,
  timeInputOf,
  todayDateString,
  addDays,
} from '@/lib/datetime'
import type { AvailabilityResult, ConflictInfo, ReservationDTO, ResourceOption } from '@/types'
import { Modal } from './modal'

export type ReservationPrefill = { resourceId?: number; date?: string; startTime?: string }

type Props = {
  mode: 'create' | 'edit'
  resources: ResourceOption[]
  prefill?: ReservationPrefill
  reservation?: ReservationDTO
  onClose: () => void
  onSaved: (message: string) => void
}

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'ok' }
  | { state: 'invalid'; message: string }
  | { state: 'conflict'; conflict?: ConflictInfo }

const toHHmm = (minutes: number) => `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`

const SLOTS: { value: string; label: string; minutes: number }[] = []
for (let m = WORKDAY_START_HOUR * 60; m <= WORKDAY_END_HOUR * 60; m += SLOT_MINUTES) {
  SLOTS.push({ value: toHHmm(m), label: formatMinutes(m), minutes: m })
}
const START_OPTIONS = SLOTS.slice(0, -1)
const END_OPTIONS = SLOTS.slice(1)
const LAST_MINUTE = WORKDAY_END_HOUR * 60

/** Next sensible slot: the next half hour from now, or 9:00 tomorrow when the day is over. */
function defaultSlot(): { date: string; start: string } {
  const now = nowZoned()
  const minutes = Math.ceil((now.hour * 60 + now.minute + 1) / SLOT_MINUTES) * SLOT_MINUTES
  const first = WORKDAY_START_HOUR * 60
  if (minutes + SLOT_MINUTES > LAST_MINUTE) return { date: addDays(todayDateString(), 1), start: toHHmm(first) }
  return { date: todayDateString(), start: toHHmm(Math.max(minutes, first)) }
}

const addMinutes = (time: string, plus: number) => toHHmm(Math.min(minutesOfDay(time) + plus, LAST_MINUTE))

export function ReservationDialog({ mode, resources, prefill, reservation, onClose, onSaved }: Props) {
  const router = useRouter()
  const user = useCurrentUser()

  const initial = useMemo(() => {
    if (mode === 'edit' && reservation) {
      return {
        resourceId: reservation.resourceId,
        date: dateInputOf(reservation.startTime),
        startTime: timeInputOf(reservation.startTime),
        endTime: timeInputOf(reservation.endTime),
        purpose: reservation.purpose,
      }
    }
    const fallback = defaultSlot()
    const startTime = prefill?.startTime ?? fallback.start
    return {
      resourceId: prefill?.resourceId ?? resources[0]?.id ?? 0,
      date: prefill?.date ?? fallback.date,
      startTime,
      endTime: addMinutes(startTime, 60),
      purpose: '',
    }
    // computed once when the dialog opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [resourceId, setResourceId] = useState(initial.resourceId)
  const [date, setDate] = useState(initial.date)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [purpose, setPurpose] = useState(initial.purpose)
  const [check, setCheck] = useState<Check>({ state: 'idle' })
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // the current resource must always be selectable when editing (even if it is now unavailable)
  const resourceOptions = useMemo(() => {
    if (mode === 'edit' && reservation && !resources.some((r) => r.id === reservation.resourceId)) {
      return [
        { id: reservation.resourceId, name: reservation.resourceName, location: reservation.resourceLocation, status: 'AVAILABLE' as const },
        ...resources,
      ]
    }
    return resources
  }, [mode, reservation, resources])

  // Instant client-side checks (the server repeats every one of them).
  const clientProblem = useMemo(() => {
    if (!date) return 'Please choose a date.'
    if (minutesOfDay(endTime) <= minutesOfDay(startTime)) return 'End time must be later than start time.'
    const start = parseZoned(date, startTime)
    if (!start) return 'Please choose a valid date and time.'
    if (start.getTime() < Date.now()) return 'Reservations cannot be made in the past.'
    return null
  }, [date, startTime, endTime])

  // Live availability (UX only — the server re-checks inside a transaction when saving).
  useEffect(() => {
    if (clientProblem) {
      setCheck({ state: 'invalid', message: clientProblem })
      return
    }
    if (!resourceId) {
      setCheck({ state: 'idle' })
      return
    }
    setCheck({ state: 'checking' })
    let stale = false
    const timer = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ resourceId: String(resourceId), date, startTime, endTime })
        if (mode === 'edit' && reservation) qs.set('excludeId', String(reservation.id))
        const result = await api<AvailabilityResult>(`/api/availability?${qs}`)
        if (stale) return
        if (result.available) setCheck({ state: 'ok' })
        else if (result.conflict) setCheck({ state: 'conflict', conflict: result.conflict })
        else setCheck({ state: 'invalid', message: result.reason ?? 'This slot is not available.' })
      } catch (error) {
        if (!stale) setCheck({ state: 'invalid', message: errorMessage(error) })
      }
    }, 250)
    return () => {
      stale = true
      clearTimeout(timer)
    }
  }, [resourceId, date, startTime, endTime, clientProblem, mode, reservation])

  const onStartChange = (value: string) => {
    setStartTime(value)
    if (minutesOfDay(endTime) <= minutesOfDay(value)) setEndTime(addMinutes(value, 60))
  }

  async function submit() {
    setSubmitError(null)
    if (!resourceId) return setSubmitError('Please choose a resource.')
    if (!purpose.trim()) return setSubmitError('Please enter a purpose for this reservation.')
    if (clientProblem) return setSubmitError(clientProblem)

    setBusy(true)
    try {
      const body = { resourceId, date, startTime, endTime, purpose: purpose.trim() }
      if (mode === 'edit' && reservation) {
        await api(`/api/reservations/${reservation.id}`, { method: 'PATCH', body })
      } else {
        await api('/api/reservations', { method: 'POST', body })
      }
      onSaved(mode === 'edit' ? 'Reservation updated successfully' : 'Reservation created successfully')
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RESERVATION_CONFLICT') {
        setCheck({ state: 'conflict', conflict: error.details?.conflict })
      } else {
        setSubmitError(errorMessage(error))
      }
    } finally {
      setBusy(false)
    }
  }

  const blocked = busy || check.state === 'conflict' || check.state === 'invalid' || resourceOptions.length === 0
  const rangeLabel = `${formatMinutes(minutesOfDay(startTime))} – ${formatMinutes(minutesOfDay(endTime))}`

  return (
    <Modal
      kicker={mode === 'edit' ? 'EDIT HOLD' : 'NEW HOLD / 01'}
      title={mode === 'edit' ? 'Edit reservation' : 'Reserve a resource'}
      subtitle={mode === 'edit' ? 'Change the resource, time or purpose.' : 'Give your team a place to make progress.'}
      onClose={onClose}
    >
      {resourceOptions.length === 0 && (
        <div className="availability-box has-conflict">
          <strong>
            <AlertTriangle /> No resources are available to reserve right now.
          </strong>
        </div>
      )}

      <label>
        Resource
        <select value={resourceId} onChange={(e) => setResourceId(Number(e.target.value))}>
          {resourceOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {r.location}
            </option>
          ))}
        </select>
      </label>

      <div className="form-two">
        <label>
          Date
          <input type="date" value={date} min={todayDateString()} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Start time
          <select value={startTime} onChange={(e) => onStartChange(e.target.value)}>
            {START_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        End time
        <select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
          {END_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Purpose
        <textarea rows={3} maxLength={300} placeholder="What are you working on?" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
      </label>

      {check.state === 'conflict' ? (
        <div className="availability-box has-conflict" role="alert">
          <strong>
            <AlertTriangle /> Resource already reserved.
          </strong>
          {check.conflict ? (
            <>
              <span>Reserved by: {check.conflict.bookedBy}</span>
              <span>Department: {check.conflict.department}</span>
              <span>Existing time: {formatTimeRange(check.conflict.startTime, check.conflict.endTime)}</span>
            </>
          ) : (
            <span>This resource is already reserved during the selected time.</span>
          )}
          <button
            type="button"
            className="text-button"
            onClick={() => {
              onClose()
              router.push(`/calendar?date=${date}`)
            }}
          >
            View available times
          </button>
        </div>
      ) : check.state === 'invalid' ? (
        <div className="availability-box has-conflict" role="alert">
          <strong>
            <AlertTriangle /> {check.message}
          </strong>
        </div>
      ) : check.state === 'checking' ? (
        <div className="availability-box">
          <strong>
            <Loader2 className="spin" /> Checking availability…
          </strong>
          <span>Selected slot: {rangeLabel}</span>
        </div>
      ) : (
        <div className="availability-box">
          <strong>
            <Check /> This resource is available
          </strong>
          <span>Selected slot: {rangeLabel}</span>
        </div>
      )}

      {submitError && (
        <div className="availability-box has-conflict" role="alert">
          <strong>{submitError}</strong>
        </div>
      )}

      <div className="modal-bottom">
        <span>
          Reserved by{' '}
          <strong>
            {user.fullName} · {user.departmentName}
          </strong>
        </span>
        <div>
          <button type="button" className="ghost-button" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="reserve-button" disabled={blocked} onClick={submit}>
            {busy ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Confirm reservation'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

