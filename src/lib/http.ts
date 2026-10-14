import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ForbiddenError, ValidationError } from '@/lib/errors'

/** Block cross-site form posts: if the browser sends an Origin it must be our own host. */
function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (!origin) return // non-browser client (curl, server-to-server); cookie auth still required
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {}
  if (!host || originHost !== host) throw new ForbiddenError('Cross-site request blocked.')
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new ValidationError('Invalid request body.')
  }
}

export function parseId(raw: string, what = 'Record'): number {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw new AppError(404, 'NOT_FOUND', `${what} not found.`)
  return id
}

const DB_DOWN = /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|P100[12]|P1017|Can't reach database|connection (terminated|refused|timeout)|Connection terminated|ConnectionError|PrismaClientInitializationError/i

export function isDatabaseDown(error: unknown): boolean {
  const e = error as { name?: string; code?: string; message?: string; cause?: { code?: string; message?: string } }
  return DB_DOWN.test(`${e?.name} ${e?.code} ${e?.message} ${e?.cause?.code} ${e?.cause?.message}`)
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.status },
    )
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: error.issues[0]?.message ?? 'Invalid input.' } },
      { status: 400 },
    )
  }
  if (isDatabaseDown(error)) {
    return NextResponse.json(
      { error: { code: 'DATABASE_UNAVAILABLE', message: 'Unable to connect to the database.' } },
      { status: 503 },
    )
  }
  console.error('[api] unexpected error', error)
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } },
    { status: 500 },
  )
}

/** Wraps every route handler: CSRF origin check, JSON envelope, consistent error responses. */
export async function respond<T>(req: Request, fn: () => Promise<T>, status = 200): Promise<NextResponse> {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') assertSameOrigin(req)
    const data = await fn()
    return NextResponse.json({ data }, { status })
  } catch (error) {
    return errorResponse(error)
  }
}
