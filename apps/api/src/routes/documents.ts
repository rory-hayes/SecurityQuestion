import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireRole } from '../plugins/require-role'
import { requireWorkspaceScope } from '../plugins/workspace-scope'

const metadataSchema = z.object({
  docType: z.string().min(1),
  frameworkTags: z.array(z.string()).default([]),
  systemTag: z.string().optional(),
  owner: z.string().min(1),
  lastUpdated: z.string().optional(),
  expiryDate: z.string().optional()
})

export async function documentRoutes(app: FastifyInstance) {
  app.post(
    '/v1/workspaces/:id/documents',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
    const workspaceId = (request.params as { id: string }).id
    const parsed = metadataSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid document metadata.', errors: parsed.error.flatten() })
    }

      return reply.code(201).send({
        data: {
          documentId: `doc-${Date.now()}`,
          workspaceId,
          ...parsed.data,
          extractedStatus: 'queued',
          createdAt: new Date().toISOString()
        }
      })
    }
  )
}
