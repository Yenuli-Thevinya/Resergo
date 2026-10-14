import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE } from '@/config/app'

/**
 * Optimistic gate: signed-out visitors are sent to /login before any page code runs.
 * This only checks that a session cookie exists. The REAL check (session valid,
 * user active, role) happens on the server in requireUser() / requireApiUser().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE)?.value
  const hasCookie = Boolean(token && token.trim().length > 0)

  if (!hasCookie && pathname !== '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // pages only: skip API routes (they return 401 JSON), Next internals and static files
  matcher: ['/((?!api|_next/static|_next/image|.*\\..*).*)'],
}
