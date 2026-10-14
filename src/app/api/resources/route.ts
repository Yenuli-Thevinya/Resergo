import { requireApiUser } from '@/lib/auth'
import { readJson, respond } from '@/lib/http'
import { createResource, listResources } from '@/lib/resources'
import { resourceInputSchema } from '@/lib/validation'

export async function GET(req: Request) {
  return respond(req, async () => {
    await requireApiUser()
    return listResources()
  })
}

export async function POST(req: Request) {
  return respond(
    req,
    async () => {
      const user = await requireApiUser()
      return createResource(user, resourceInputSchema.parse(await readJson(req)))
    },
    201,
  )
}
