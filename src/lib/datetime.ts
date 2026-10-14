import { DateTime } from 'luxon'
import { APP_TIMEZONE } from '@/config/app'

/** All date/time maths happens in the configured app time zone. */

export const zoned = (d: Date | string): DateTime =>
  (typeof d === 'string' ? DateTime.fromISO(d) : DateTime.fromJSDate(d)).setZone(APP_TIMEZONE).setLocale('en-US')

export const nowZoned = (): DateTime => DateTime.now().setZone(APP_TIMEZONE).setLocale('en-US')

export const todayDateString = (): string => nowZoned().toFormat('yyyy-MM-dd')

export function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && DateTime.fromFormat(value, 'yyyy-MM-dd', { zone: APP_TIMEZONE }).isValid
}

export function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

/** "2026-10-12" + "10:00" (app time zone) -> real instant. null when invalid. */
export function parseZoned(date: string, time: string): Date | null {
  if (!isValidDateString(date) || !isValidTimeString(time)) return null
  const dt = DateTime.fromFormat(`${date} ${time}`, 'yyyy-MM-dd HH:mm', { zone: APP_TIMEZONE })
  return dt.isValid ? dt.toJSDate() : null
}

/** [start of day, start of next day) as instants. */
export function dayBounds(date: string): { start: Date; end: Date } | null {
  if (!isValidDateString(date)) return null
  const start = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: APP_TIMEZONE }).startOf('day')
  return { start: start.toJSDate(), end: start.plus({ days: 1 }).toJSDate() }
}

export function monthBounds(ref: Date = new Date()): { start: Date; end: Date } {
  const start = zoned(ref).startOf('month')
  return { start: start.toJSDate(), end: start.plus({ months: 1 }).toJSDate() }
}

export function addDays(date: string, days: number): string {
  return DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: APP_TIMEZONE }).plus({ days }).toFormat('yyyy-MM-dd')
}

export const minutesOfDay = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export const formatTime = (d: Date | string): string => zoned(d).toFormat('h:mm a')
export const formatTimeRange = (start: Date | string, end: Date | string): string =>
  `${formatTime(start)} – ${formatTime(end)}`
export const formatDateLong = (d: Date | string): string => zoned(d).toFormat('d MMMM yyyy')
export const formatDateShort = (d: Date | string): string => zoned(d).toFormat('d MMM yyyy')
export const dateInputOf = (d: Date | string): string => zoned(d).toFormat('yyyy-MM-dd')
export const timeInputOf = (d: Date | string): string => zoned(d).toFormat('HH:mm')

export function formatCalendarHeading(date: string): string {
  return DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: APP_TIMEZONE }).setLocale('en-US').toFormat('cccc, MMMM d, yyyy')
}

/** "Today", "Tomorrow" or "12 Oct 2026" */
export function describeDay(d: Date | string, now: Date = new Date()): string {
  const day = zoned(d).startOf('day')
  const today = zoned(now).startOf('day')
  const diff = Math.round(day.diff(today, 'days').days)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return formatDateShort(d)
}

/** minutes since midnight -> "9:30 AM" */
export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60)
  const m = total % 60
  const suffix = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export const pad2 = (n: number): string => String(n).padStart(2, '0')
