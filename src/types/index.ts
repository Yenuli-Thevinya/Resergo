// Shared DTO types (plain JSON-serialisable objects). No Prisma imports here so
// client components can use them safely.

export type Role = 'USER' | 'ADMIN'
export type UserStatus = 'ACTIVE' | 'INACTIVE'
export type ResourceStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'MAINTENANCE'
export type ReservationDisplayStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ResourceAvailability = 'Available' | 'Booked' | 'Unavailable' | 'Maintenance'
export type Tone = 'mint' | 'blue' | 'yellow'

export type SessionUser = {
  id: number
  fullName: string
  email: string
  role: Role
  departmentId: number
  departmentName: string
  initials: string
}

export type DepartmentOption = { id: number; name: string }

export type DepartmentDTO = {
  id: number
  name: string
  activeEmployees: number
  reservationsThisMonth: number
}

export type UserDTO = {
  id: number
  fullName: string
  email: string
  role: Role
  status: UserStatus
  departmentId: number
  departmentName: string
  initials: string
}

export type ResourceDTO = {
  id: number
  name: string
  category: string
  description: string | null
  location: string
  capacity: string | null
  /** Operational status stored in the database */
  status: ResourceStatus
  /** Calculated from status + active reservations right now */
  availability: ResourceAvailability
  nextText: string
  tone: Tone
}

export type ResourceOption = {
  id: number
  name: string
  location: string
  status: ResourceStatus
}

export type ReservationDTO = {
  id: number
  resourceId: number
  resourceName: string
  resourceLocation: string
  userId: number
  bookedBy: string
  bookedByInitials: string
  department: string
  /** ISO timestamps (UTC) */
  startTime: string
  endTime: string
  purpose: string
  status: ReservationDisplayStatus
  isMine: boolean
  canEdit: boolean
  canCancel: boolean
}

export type ConflictInfo = {
  reservationId: number
  resourceName: string
  bookedBy: string
  department: string
  startTime: string
  endTime: string
}

export type AvailabilityResult = {
  available: boolean
  reason?: string
  conflict?: ConflictInfo
}

export type ResourceDetailDTO = ResourceDTO & { upcoming: ReservationDTO[] }

export type DashboardStats = {
  availableNow: number
  totalResources: number
  roomsOpen: number
  assetsOpen: number
  todaysReservations: number
  todaysDepartments: number
  yourUpcoming: number
  nextStartLabel: string | null
  activeTeams: number
  peopleBooking: number
  nextUp: ReservationDTO | null
  popular: ResourceDTO[]
  today: ReservationDTO[]
}

export type CalendarRowData = {
  resource: ResourceDTO
  reservations: ReservationDTO[]
}

export type CalendarData = {
  date: string
  isToday: boolean
  serverNow: string
  rows: CalendarRowData[]
}

export type TeamsData = {
  departments: DepartmentDTO[]
  users: UserDTO[]
  activeUsers: number
  reservationsThisMonth: number
  mostActive: { name: string; count: number } | null
}
