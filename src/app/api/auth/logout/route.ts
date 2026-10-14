import { logout } from '@/lib/auth'
import { respond } from '@/lib/http'

export async function POST(req: Request) {
  return respond(req, async () => {
    await logout()
    return { ok: true }
  })
}
