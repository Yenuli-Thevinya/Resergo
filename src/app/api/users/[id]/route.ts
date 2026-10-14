import { requireApiUser } from '@/lib/auth'
import { parseId, readJson, respond } from '@/lib/http'
import { getUser, updateUser } from '@/lib/users'
import { userUpdateSchema } from '@/lib/validation'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    await requireApiUser()
    return getUser(parseId((await params).id, 'User'))
  })
}

/** Admin only. Also used to activate / deactivate a user (status field). */
export async function PATCH(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const admin = await requireApiUser()
    const id = parseId((await params).id, 'User')
    return updateUser(admin, id, userUpdateSchema.parse(await readJson(req)))
  })
}
