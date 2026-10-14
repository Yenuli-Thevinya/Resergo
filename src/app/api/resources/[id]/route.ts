import { requireApiUser } from '@/lib/auth'
import { parseId, readJson, respond } from '@/lib/http'
import { getResource, removeResource, updateResource } from '@/lib/resources'
import { resourceUpdateSchema } from '@/lib/validation'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    return getResource(user, parseId((await params).id, 'Resource'))
  })
}

export async function PATCH(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    const id = parseId((await params).id, 'Resource')
    return updateResource(user, id, resourceUpdateSchema.parse(await readJson(req)))
  })
}

/** Deletes the resource, or deactivates it when reservation history exists. */
export async function DELETE(req: Request, { params }: Ctx) {
  return respond(req, async () => {
    const user = await requireApiUser()
    return removeResource(user, parseId((await params).id, 'Resource'))
  })
}
