export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: any,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** fetch wrapper for the /api routes: unwraps { data }, throws ApiError with the server's message. */
export async function api<T = unknown>(url: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, {
      method: init.method ?? 'GET',
      headers: init.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to reach the server. Please check your connection and try again.')
  }

  let json: any = null
  try {
    json = await res.json()
  } catch {}

  if (!res.ok) {
    // session expired / signed out elsewhere -> back to the login page
    if (res.status === 401 && !url.startsWith('/api/auth/login') && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'ERROR',
      json?.error?.message ?? 'Something went wrong. Please try again.',
      json?.error?.details,
    )
  }
  return json?.data as T
}

export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Something went wrong. Please try again.'
