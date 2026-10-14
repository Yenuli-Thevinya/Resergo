import { requireApiUser } from '@/lib/auth'
import { readJson, respond } from '@/lib/http'
import { createUser, listUsers } from '@/lib/users'
import { userCreateSchema } from '@/lib/validation'

export async function GET(req: Request) {
  return respond(req, async () => {
    await requireApiUser()
    return listUsers()
  })
}

/** Admin only. */
export async function POST(req: Request) {
  return respond(
    req,
    async () => {
      const admin = await requireApiUser()
      return createUser(admin, userCreateSchema.parse(await readJson(req)))
    },
    201,
  )
}
