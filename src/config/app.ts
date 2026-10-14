/**
 * Central app configuration.
 * Change the calendar/booking window here and everything (calendar grid,
 * reservation form, server validation) follows.
 */

/** Time zone used for "today", the calendar and all displayed times. */
export const APP_TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Asia/Colombo'

/** Reservations must start at/after this hour (24h clock). */
export const WORKDAY_START_HOUR = 9
/** Reservations must end at/before this hour (24h clock). Last calendar column is END - 1. */
export const WORKDAY_END_HOUR = 15
/** Granularity of the time pickers in the reservation form. */
export const SLOT_MINUTES = 30

/** Hour columns shown in the calendar: 09, 10, 11, 12, 13, 14 */
export const CALENDAR_HOURS: number[] = Array.from(
  { length: WORKDAY_END_HOUR - WORKDAY_START_HOUR },
  (_, i) => WORKDAY_START_HOUR + i,
)

export const SESSION_COOKIE = 'resergo_session'
export const SESSION_TTL_DAYS = 7
