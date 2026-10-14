import { login } from '@/lib/auth'
import { readJson, respond } from '@/lib/http'
import { loginSchema } from '@/lib/validation'

export async function POST(req: Request) {
  return respond(req, async () => {
    const { email, password } = loginSchema.parse(await readJson(req))
    const clientKey = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
    const user = await login(email, password, clientKey)
    return { user }
  })
}
