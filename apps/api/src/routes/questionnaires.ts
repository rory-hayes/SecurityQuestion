import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getDraftingQueue, getExportQueue, getImportQueue } from '../lib/queue'
import { questionnaireProgress } from '../lib/mock-store'
import { requireRole } from '../plugins/require-role'
import { requireWorkspaceScope } from '../plugins/workspace-scope'

const stateSchema = z.object({
  state: z.enum(['drafted', 'in_review', 'needs_client_input', 'approved', 'exported']),
  note: z.string().max(500).optional()
})

const approveSchema = z.object({
  approvedBy: z.string().min(1),
  comment: z.string().max(500).optional()
})

const attachEvidenceSchema = z.object({
  questionWorkspaceId: z.string().min(1),
  snippetWorkspaceId: z.string().min(1),
  snippetId: z.string().min(1),
  explicitConfirmation: z.boolean().default(false)
})

export async function questionnaireRoutes(app: FastifyInstance) {
  app.get(
    '/v1/workspaces/:id/questions/changed-since-last',
    { preHandler: [requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']), requireWorkspaceScope] },
    async () => {
      return {
        data: [
          {
            questionId: 'q-102',
            stableKey: 'encryption-at-rest',
            previousUpdatedAt: '2025-11-01T09:20:00Z',
            currentUpdatedAt: '2026-02-14T13:42:00Z',
            changedBy: 'analyst@firm.example'
          }
        ]
      }
    }
  )

  app.post(
    '/v1/workspaces/:id/questionnaires/import',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const questionnaireId = `qnr-${Date.now()}`

      const queue = getImportQueue()
      if (queue) {
        await queue.add('import', {
          questionnaireId,
          workspaceId,
          initiatedBy: request.auth.userId
        })
      }

      questionnaireProgress.set(questionnaireId, { percent: 5, status: 'queued_import', resumed: false })

      return reply.code(202).send({
        data: {
          questionnaireId,
          workspaceId,
          status: 'queued'
        }
      })
    }
  )

  app.post('/v1/questionnaires/:id/draft', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id

    const queue = getDraftingQueue()
    if (queue) {
      await queue.add('draft', {
        questionnaireId,
        requestedBy: request.auth.userId,
        orgId: request.auth.orgId
      })
    }

    questionnaireProgress.set(questionnaireId, { percent: 25, status: 'drafting_started', resumed: false })

    return reply.code(202).send({
      data: {
        questionnaireId,
        status: 'drafting_started'
      }
    })
  })

  app.patch('/v1/questions/:id/state', { preHandler: requireRole(['analyst', 'org_admin', 'client_approver']) }, async (request, reply) => {
    const parsed = stateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid state payload', errors: parsed.error.flatten() })
    }

    return {
      data: {
        questionId: (request.params as { id: string }).id,
        ...parsed.data,
        changedBy: request.auth.userId,
        changedAt: new Date().toISOString()
      }
    }
  })

  app.post('/v1/questions/:id/approve', { preHandler: requireRole(['client_approver', 'org_admin']) }, async (request, reply) => {
    const parsed = approveSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid approval payload', errors: parsed.error.flatten() })
    }

    return {
      data: {
        questionId: (request.params as { id: string }).id,
        approvedBy: parsed.data.approvedBy,
        comment: parsed.data.comment ?? null,
        approvedAt: new Date().toISOString()
      }
    }
  })

  app.post('/v1/questions/:id/evidence/attach', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const parsed = attachEvidenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid evidence attachment payload', errors: parsed.error.flatten() })
    }

    const mismatch = parsed.data.questionWorkspaceId !== parsed.data.snippetWorkspaceId
    if (mismatch && !parsed.data.explicitConfirmation) {
      return reply.code(409).send({
        message: 'Cross-workspace evidence attachment requires explicit confirmation and audit logging.',
        needsConfirmation: true
      })
    }

    return {
      data: {
        questionId: (request.params as { id: string }).id,
        snippetId: parsed.data.snippetId,
        crossWorkspace: mismatch,
        explicitConfirmation: parsed.data.explicitConfirmation,
        attachedAt: new Date().toISOString(),
        auditAction: 'evidence_attached'
      }
    }
  })

  app.post('/v1/questionnaires/:id/export', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id

    const queue = getExportQueue()
    if (queue) {
      await queue.add('export', {
        questionnaireId,
        requestedBy: request.auth.userId
      })
    }

    questionnaireProgress.set(questionnaireId, { percent: 80, status: 'exporting', resumed: false })

    return reply.code(202).send({
      data: {
        questionnaireId,
        status: 'export_queued'
      }
    })
  })

  app.get('/v1/questionnaires/:id/progress', { preHandler: requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id
    const progress = questionnaireProgress.get(questionnaireId)

    if (!progress) {
      return reply.code(404).send({ message: 'No progress found for questionnaire.' })
    }

    return { data: progress }
  })
}
