import { z } from 'zod'

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Please choose a valid date.')
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Please choose a valid time.')

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Please enter your email.'),
  password: z.string().min(1, 'Please enter your password.'),
})

export const reservationInputSchema = z.object({
  resourceId: z.coerce.number().int().positive('Please choose a resource.'),
  date: dateString,
  startTime: timeString,
  endTime: timeString,
  purpose: z.string().trim().min(1, 'Please enter a purpose for this reservation.').max(300, 'Purpose must be 300 characters or fewer.'),
})
export type ReservationInput = z.infer<typeof reservationInputSchema>

export const availabilityQuerySchema = z.object({
  resourceId: z.coerce.number().int().positive(),
  date: dateString,
  startTime: timeString,
  endTime: timeString,
  excludeId: z.coerce.number().int().positive().optional(),
})

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .nullish()
    .transform((v) => (v ? v : null))

export const resourceInputSchema = z.object({
  name: z.string().trim().min(2, 'Resource name must be at least 2 characters.').max(80, 'Resource name must be 80 characters or fewer.'),
  category: z.string().trim().min(2, 'Please enter a category.').max(50, 'Category must be 50 characters or fewer.'),
  description: optionalText(500, 'Description'),
  location: z.string().trim().min(2, 'Please enter a location.').max(80, 'Location must be 80 characters or fewer.'),
  capacity: optionalText(40, 'Capacity'),
  status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE'], { error: 'Please choose a status.' }),
})
export const resourceUpdateSchema = resourceInputSchema.partial()

const password = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(72, 'Password must be 72 characters or fewer.')

export const userCreateSchema = z.object({
  fullName: z.string().trim().min(2, 'Please enter the full name.').max(80, 'Full name must be 80 characters or fewer.'),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address.').max(120),
  departmentId: z.coerce.number().int().positive('Please choose a department.'),
  role: z.enum(['USER', 'ADMIN'], { error: 'Please choose a role.' }),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  password,
})

export const userUpdateSchema = z.object({
  fullName: userCreateSchema.shape.fullName.optional(),
  email: userCreateSchema.shape.email.optional(),
  departmentId: userCreateSchema.shape.departmentId.optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  /** Optional password reset */
  password: password.optional(),
})

export type ResourceInput = z.infer<typeof resourceInputSchema>
export type UserCreateInput = z.infer<typeof userCreateSchema>
export type UserUpdateInput = z.infer<typeof userUpdateSchema>
