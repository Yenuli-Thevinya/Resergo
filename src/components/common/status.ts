import type { ReservationDisplayStatus, ResourceAvailability } from '@/types'

export const reservationStatusLabel: Record<ReservationDisplayStatus, string> = {
  UPCOMING: 'Upcoming',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const reservationStatusTone: Record<ReservationDisplayStatus, 'mint' | 'blue' | 'gray' | 'red'> = {
  UPCOMING: 'mint',
  IN_PROGRESS: 'blue',
  COMPLETED: 'gray',
  CANCELLED: 'red',
}

export const availabilityTone: Record<ResourceAvailability, 'mint' | 'blue' | 'yellow'> = {
  Available: 'mint',
  Booked: 'blue',
  Unavailable: 'yellow',
  Maintenance: 'yellow',
}
