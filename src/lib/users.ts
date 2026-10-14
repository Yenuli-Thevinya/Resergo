import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword, initialsOf } from '@/lib/auth'
import { monthBounds } from '@/lib/datetime'
import { AppError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors'
import { assertAdmin } from '@/lib/permissions'
import type { UserCreateInput, UserUpdateInput } from '@/lib/validation'
import type { DepartmentDTO, DepartmentOption, SessionUser, TeamsData, UserDTO } from '@/types'

const userSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
  status: true,
  departmentId: true,
  department: { select: { name: true } },
} satisfies Prisma.UserSelect // passwordHash is never selected

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>

const toUserDTO = (u: UserRow): UserDTO => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  status: u.status,
  departmentId: u.departmentId,
  departmentName: u.department.name,
  initials: initialsOf(u.fullName),
})

export async function listDepartments(): Promise<DepartmentOption[]> {
  return prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } })
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await prisma.user.findMany({
    select: userSelect,
    orderBy: [{ status: 'asc' }, { fullName: 'asc' }],
  })
  return rows.map(toUserDTO)
}

export async function getUser(id: number): Promise<UserDTO> {
  const row = await prisma.user.findUnique({ where: { id }, select: userSelect })
  if (!row) throw new NotFoundError('User not found.')
  return toUserDTO(row)
}

const duplicateEmail = () => new ConflictError('A user with this email already exists.', 'DUPLICATE_EMAIL')

async function assertDepartmentExists(id: number) {
  const dept = await prisma.department.findUnique({ where: { id } })
  if (!dept) throw new ValidationError('Please choose a valid department.')
}

export async function createUser(admin: SessionUser, input: UserCreateInput): Promise<UserDTO> {
  assertAdmin(admin)
  await assertDepartmentExists(input.departmentId)
  try {
    const row = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        departmentId: input.departmentId,
        role: input.role,
        status: input.status,
        passwordHash: await hashPassword(input.password), // never store plaintext
      },
      select: userSelect,
    })
    return toUserDTO(row)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw duplicateEmail()
    throw error
  }
}

export async function updateUser(admin: SessionUser, id: number, input: UserUpdateInput): Promise<UserDTO> {
  assertAdmin(admin)
  const target = await prisma.user.findUnique({ where: { id } })
  if (!target) throw new NotFoundError('User not found.')

  const newRole = input.role ?? target.role
  const newStatus = input.status ?? target.status
  const losesAdminAccess = target.role === 'ADMIN' && target.status === 'ACTIVE' && (newRole !== 'ADMIN' || newStatus !== 'ACTIVE')

  if (losesAdminAccess) {
    if (target.id === admin.id) {
      throw new ValidationError('You cannot deactivate or demote your own account.')
    }
    const otherAdmins = await prisma.user.count({ where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } } })
    if (otherAdmins === 0) throw new ValidationError('At least one active administrator is required.')
  }

  if (input.departmentId !== undefined) await assertDepartmentExists(input.departmentId)

  const { password, ...rest } = input
  try {
    const row = await prisma.user.update({
      where: { id },
      data: { ...rest, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      select: userSelect,
    })

    // Deactivation or a password reset signs the person out everywhere.
    const deactivated = target.status === 'ACTIVE' && newStatus === 'INACTIVE'
    if ((deactivated || password) && target.id !== admin.id) {
      await prisma.session.deleteMany({ where: { userId: id } })
    }
    return toUserDTO(row)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw duplicateEmail()
      if (error.code === 'P2025') throw new AppError(404, 'NOT_FOUND', 'User not found.')
    }
    throw error
  }
}

export async function getTeamsData(): Promise<TeamsData> {
  const { start, end } = monthBounds()

  const [departments, users, monthReservations] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: { where: { status: 'ACTIVE' } } } } },
    }),
    listUsers(),
    prisma.reservation.findMany({
      where: { status: { not: 'CANCELLED' }, startTime: { gte: start, lt: end } },
      select: { user: { select: { departmentId: true } } },
    }),
  ])

  const perDepartment = new Map<number, number>()
  for (const r of monthReservations) {
    perDepartment.set(r.user.departmentId, (perDepartment.get(r.user.departmentId) ?? 0) + 1)
  }

  const departmentDTOs: DepartmentDTO[] = departments.map((d) => ({
    id: d.id,
    name: d.name,
    activeEmployees: d._count.users,
    reservationsThisMonth: perDepartment.get(d.id) ?? 0,
  }))

  const top = [...departmentDTOs].sort((a, b) => b.reservationsThisMonth - a.reservationsThisMonth)[0]

  return {
    departments: departmentDTOs,
    users,
    activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
    reservationsThisMonth: monthReservations.length,
    mostActive: top && top.reservationsThisMonth > 0 ? { name: top.name, count: top.reservationsThisMonth } : null,
  }
}
