import { WORKDAY_END_HOUR, WORKDAY_START_HOUR } from '@/config/app'
import { formatMinutes, isValidDateString, minutesOfDay, parseZoned } from '@/lib/datetime'
import { ValidationError } from '@/lib/errors'
import type { ReservationDisplayStatus } from '@/types'

/** Pure business rules (no database access). */

export function deriveStatus(
  stored: 'UPCOMING' | 'COMPLETED' | 'CANCELLED',
  start: Date,
  end: Date,
  now: Date,
): ReservationDisplayStatus {
  if (stored === 'CANCELLED') return 'CANCELLED'
  if (end <= now) return 'COMPLETED'
  if (start <= now) return 'IN_PROGRESS'
  return 'UPCOMING'
}

/** Overlap formula: newStart < existingEnd AND newEnd > existingStart */
export const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean => aStart < bEnd && aEnd > bStart

/**
 * Validates date + start/end and turns them into real instants.
 * Throws a ValidationError with a user-friendly message.
 */
export function validateWindow(
  input: { date: string; startTime: string; endTime: string },
  now: Date = new Date(),
): { start: Date; end: Date } {
  if (!isValidDateString(input.date)) throw new ValidationError('Please choose a valid date.')

  const start = parseZoned(input.date, input.startTime)
  const end = parseZoned(input.date, input.endTime)
  if (!start || !end) throw new ValidationError('Please choose a valid start and end time.')

  if (start >= end) throw new ValidationError('End time must be later than start time.')

  const startMin = minutesOfDay(input.startTime)
  const endMin = minutesOfDay(input.endTime)
  if (startMin < WORKDAY_START_HOUR * 60 || endMin > WORKDAY_END_HOUR * 60) {
    throw new ValidationError(
      `Reservations must be between ${formatMinutes(WORKDAY_START_HOUR * 60)} and ${formatMinutes(WORKDAY_END_HOUR * 60)}.`,
    )
  }

  if (start < now) throw new ValidationError('Reservations cannot be made in the past.')

  return { start, end }
}
