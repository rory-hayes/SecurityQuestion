import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../plugins/require-role'

const createWorkspaceSchema = z.object({
  name: z.string().min(2),
  ownerEmail: z.string().email(),
  reviewCadence: z.enum(['monthly', 'quarterly', 'custom'])
})

export async function workspaceRoutes(app: FastifyInstance) {
  app.post('/v1/workspaces', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const parsed = createWorkspaceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid workspace payload.', errors: parsed.error.flatten() })
    }

    return reply.code(201).send({
      data: {
        id: `ws-${Date.now()}`,
        orgId: request.auth.orgId,
        ...parsed.data,
        createdBy: request.auth.userId,
        createdAt: new Date().toISOString()
      }
    })
  })
}
