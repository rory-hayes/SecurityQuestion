import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { globalTemplates } from '../lib/mock-store'
import { requireRole } from '../plugins/require-role'
import { requireWorkspaceScope } from '../plugins/workspace-scope'

const importTemplateSchema = z.object({
  templateId: z.string().min(1),
  explicitConfirmation: z.boolean().default(false)
})

export async function templateRoutes(app: FastifyInstance) {
  app.get('/v1/templates/global', { preHandler: requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']) }, async () => {
    return { data: globalTemplates }
  })

  app.post(
    '/v1/workspaces/:id/templates/global/import',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const parsed = importTemplateSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid template import payload', errors: parsed.error.flatten() })
      }

      const template = globalTemplates.find((item) => item.id === parsed.data.templateId)
      if (!template) {
        return reply.code(404).send({ message: 'Template not found.' })
      }

      if (!parsed.data.explicitConfirmation) {
        return reply.code(409).send({
          message: 'Global template imports require explicit confirmation for non-client-specific usage.',
          needsConfirmation: true
        })
      }

      return reply.code(201).send({
        data: {
          importedTemplateId: template.id,
          workspaceId: (request.params as { id: string }).id,
          importedAt: new Date().toISOString(),
          importedBy: request.auth.userId,
          auditAction: 'global_template_imported'
        }
      })
    }
  )
}
