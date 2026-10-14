import { createHash, randomBytes } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import { SESSION_COOKIE, SESSION_TTL_DAYS } from '@/config/app'
import { prisma } from '@/lib/db'
import { AppError, UnauthorizedError } from '@/lib/errors'
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from '@/lib/rate-limit'
import type { SessionUser } from '@/types'

const BCRYPT_ROUNDS = 12

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, BCRYPT_ROUNDS)

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

// Compared against when the email is unknown so response time does not reveal which emails exist.
let dummyHash: string | null = null
const getDummyHash = async () => (dummyHash ??= await bcrypt.hash('not-a-real-password', BCRYPT_ROUNDS))

export async function login(email: string, password: string, clientKey: string): Promise<SessionUser> {
  const throttleKey = `${email}|${clientKey}`
  if (isLoginBlocked(throttleKey)) {
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed sign-in attempts. Please try again in a few minutes.')
  }

  const user = await prisma.user.findUnique({ where: { email }, include: { department: true } })
  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? (await getDummyHash()))

  if (!user || !passwordOk) {
    recordLoginFailure(throttleKey)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is inactive. Please contact an administrator.')
  }

  clearLoginFailures(throttleKey)
  await createSession(user.id)

  return toSessionUser(user)
}

type UserWithDepartment = {
  id: number
  fullName: string
  email: string
  role: 'USER' | 'ADMIN'
  departmentId: number
  department: { name: string }
}

function toSessionUser(user: UserWithDepartment): SessionUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    departmentName: user.department.name,
    initials: initialsOf(user.fullName),
  }
}

async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)

  // Only the hash is stored, so a leaked database cannot be used to hijack sessions.
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } })
  // opportunistic cleanup of expired sessions
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.SESSION_COOKIE_SECURE !== 'false',
    path: '/',
    expires: expiresAt,
  })
}

export async function logout(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } })
  store.delete(SESSION_COOKIE)
}

/** The signed-in user (re-checked against the database on every request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { department: true } } },
  })
  if (!session || session.expiresAt < new Date() || session.user.status !== 'ACTIVE') return null

  return toSessionUser(session.user)
})

/** For pages / layouts: redirect to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return user
}

/** For API routes: respond 401 when signed out. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw new UnauthorizedError()
  return user
}
