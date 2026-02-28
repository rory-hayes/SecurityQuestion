import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  canExportQuestionnaire,
  confirmQuestionnaireMapping,
  createQuestionnaire,
  draftQuestionnaire,
  getDraftByQuestionId,
  getDraftDetail,
  getMapping,
  getProgress,
  getQuestionById,
  getQuestionState,
  getQuestionWorkspace,
  getQuestionnaire,
  getQuestionnaireWorkspace,
  listChangedQuestionsSinceLast,
  listQuestionsForQuestionnaire,
  markQuestionnaireExported,
  approveQuestion,
  regenerateQuestion,
  setProgressStage,
  suggestQuestionnaireMapping,
  updateQuestionState,
  attachCitationToQuestion
} from '../lib/mock-store'
import {
  getDraftingQueue,
  getExportQueue,
  getImportQueue,
  getQuestionVerifyQueue,
  getQuestionnaireNormaliseQueue
} from '../lib/queue'
import { requireRole } from '../plugins/require-role'
import { requireWorkspaceScope } from '../plugins/workspace-scope'

const importSchema = z.object({
  sourceFilename: z.string().min(1).default('questionnaire.csv'),
  sourceType: z.enum(['csv', 'xlsx', 'xls']).default('csv'),
  extractionMode: z.enum(['deterministic', 'hybrid']).default('hybrid'),
  csvText: z.string().optional(),
  workbookBase64: z.string().optional(),
  rows: z.array(z.array(z.string())).optional()
})

const parseSchema = z
  .object({
    questionnaireId: z.string().optional(),
    sourceFilename: z.string().min(1).optional(),
    sourceType: z.enum(['csv', 'xlsx', 'xls']).optional(),
    extractionMode: z.enum(['deterministic', 'hybrid']).optional(),
    csvText: z.string().optional(),
    workbookBase64: z.string().optional(),
    rows: z.array(z.array(z.string())).optional()
  })
  .refine((value) => Boolean(value.questionnaireId || value.rows || value.csvText || value.workbookBase64), {
    message: 'Provide questionnaireId or source content for parse.'
  })

const mappingConfirmSchema = z.object({
  headerRowIndex: z.number().int().min(0),
  questionColumn: z.string().min(1),
  answerColumn: z.string().min(1),
  evidenceColumn: z.string().optional()
})

const draftSchema = z.object({
  mode: z.enum(['batch', 'question_ids']).default('batch'),
  questionIds: z.array(z.string()).optional(),
  modelRouteMode: z.enum(['balanced', 'premium', 'cost']).default('balanced')
})

const stateSchema = z.object({
  state: z.enum(['drafted', 'in_review', 'needs_client_input', 'approved', 'exported']),
  note: z.string().max(500).optional()
})

const approveSchema = z.object({
  approvedBy: z.string().min(1),
  comment: z.string().max(500).optional(),
  acknowledgeLowConfidence: z.boolean().default(false)
})

const attachEvidenceSchema = z.object({
  questionWorkspaceId: z.string().min(1),
  snippetWorkspaceId: z.string().min(1),
  snippetId: z.string().min(1),
  sentenceIndex: z.number().int().min(0).optional(),
  explicitConfirmation: z.boolean().default(false)
})

function enforceQuestionnaireScope(questionnaireId: string, requestWorkspaceId: string | null) {
  const scope = getQuestionnaireWorkspace(questionnaireId)
  if (!scope) return { ok: false as const, status: 404, message: 'Questionnaire not found.' }
  if (requestWorkspaceId && requestWorkspaceId !== scope) {
    return { ok: false as const, status: 403, message: 'Workspace mismatch.' }
  }
  return { ok: true as const, workspaceId: scope }
}

function enforceQuestionScope(questionId: string, requestWorkspaceId: string | null) {
  const scope = getQuestionWorkspace(questionId)
  if (!scope) return { ok: false as const, status: 404, message: 'Question not found.' }
  if (requestWorkspaceId && requestWorkspaceId !== scope) {
    return { ok: false as const, status: 403, message: 'Workspace mismatch.' }
  }
  return { ok: true as const, workspaceId: scope }
}

export async function questionnaireRoutes(app: FastifyInstance) {
  app.get(
    '/v1/workspaces/:id/questions/changed-since-last',
    { preHandler: [requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']), requireWorkspaceScope] },
    async (request) => {
      const workspaceId = (request.params as { id: string }).id
      return {
        data: listChangedQuestionsSinceLast(workspaceId)
      }
    }
  )

  app.post(
    '/v1/workspaces/:id/questionnaires/import',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const parsed = importSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid questionnaire import payload.', errors: parsed.error.flatten() })
      }

      const questionnaire = createQuestionnaire({
        workspaceId,
        sourceFilename: parsed.data.sourceFilename,
        sourceType: parsed.data.sourceType,
        extractionMode: parsed.data.extractionMode,
        csvText: parsed.data.csvText,
        workbookBase64: parsed.data.workbookBase64,
        rows: parsed.data.rows
      })

      const queue = getImportQueue()
      if (queue) {
        await queue.add(
          'import',
          {
            questionnaireId: questionnaire.id,
            workspaceId,
            initiatedBy: request.auth.userId,
            sourceFilename: questionnaire.sourceFilename,
            sourceType: questionnaire.sourceType,
            extractionMode: questionnaire.extractionMode
          },
          {
            jobId: `import:${workspaceId}:${questionnaire.id}:v${questionnaire.version}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 500 }
          }
        )
      }

      setProgressStage(questionnaire.id, 'import', 'in_progress', 20)

      return reply.code(202).send({
        data: {
          questionnaireId: questionnaire.id,
          workspaceId,
          status: 'queued',
          sourceFilename: questionnaire.sourceFilename,
          sourceType: questionnaire.sourceType,
          extractionMode: questionnaire.extractionMode
        }
      })
    }
  )

  app.post(
    '/v1/workspaces/:id/questionnaires/parse',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const parsed = parseSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid parse request.', errors: parsed.error.flatten() })
      }

      let questionnaireId = parsed.data.questionnaireId
      if (!questionnaireId) {
        const created = createQuestionnaire({
          workspaceId,
          sourceFilename: parsed.data.sourceFilename ?? 'questionnaire.csv',
          sourceType: parsed.data.sourceType ?? 'csv',
          extractionMode: parsed.data.extractionMode ?? 'hybrid',
          csvText: parsed.data.csvText,
          workbookBase64: parsed.data.workbookBase64,
          rows: parsed.data.rows
        })
        questionnaireId = created.id
      }

      const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
      if (!check.ok) {
        return reply.code(check.status).send({ message: check.message })
      }

      setProgressStage(questionnaireId, 'import', 'completed', 100)
      const suggestion = await suggestQuestionnaireMapping(questionnaireId)
      if (!suggestion) {
        return reply.code(404).send({ message: 'Questionnaire not found.' })
      }

      return {
        data: {
          questionnaireId,
          ...suggestion
        }
      }
    }
  )

  app.post(
    '/v1/workspaces/:id/questionnaires/:questionnaireId/mapping/suggest',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const questionnaireId = (request.params as { questionnaireId: string }).questionnaireId
      const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
      if (!check.ok) {
        return reply.code(check.status).send({ message: check.message })
      }

      const suggestion = await suggestQuestionnaireMapping(questionnaireId)
      if (!suggestion) {
        return reply.code(404).send({ message: 'Questionnaire not found.' })
      }

      return {
        data: {
          questionnaireId,
          ...suggestion
        }
      }
    }
  )

  app.post(
    '/v1/workspaces/:id/questionnaires/:questionnaireId/mapping/confirm',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const questionnaireId = (request.params as { questionnaireId: string }).questionnaireId
      const parsed = mappingConfirmSchema.safeParse(request.body)
      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid mapping confirmation payload.', errors: parsed.error.flatten() })
      }

      const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
      if (!check.ok) {
        return reply.code(check.status).send({ message: check.message })
      }

      const queue = getQuestionnaireNormaliseQueue()
      if (queue) {
        await queue.add(
          'normalise',
          {
            questionnaireId,
            workspaceId: check.workspaceId,
            mapping: parsed.data,
            requestedBy: request.auth.userId
          },
          {
            jobId: `normalise:${check.workspaceId}:${questionnaireId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 500 }
          }
        )
      }

      setProgressStage(questionnaireId, 'normalise', 'in_progress', 20)
      const result = confirmQuestionnaireMapping(questionnaireId, parsed.data)
      if (!result) {
        return reply.code(404).send({ message: 'Questionnaire not found.' })
      }

      return reply.code(201).send({ data: result })
    }
  )

  app.get('/v1/questionnaires/:id/questions', { preHandler: requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id
    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const questions = listQuestionsForQuestionnaire(questionnaireId).map((question) => ({
      ...question,
      state: getQuestionState(question.id)?.state ?? 'drafted',
      confidenceBand: getDraftByQuestionId(question.id)?.confidenceBand ?? null,
      confidenceScore: getDraftByQuestionId(question.id)?.confidenceScore ?? null
    }))

    return { data: questions }
  })

  app.post('/v1/questionnaires/:id/draft', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id
    const parsed = draftSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid draft request payload.', errors: parsed.error.flatten() })
    }

    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const queue = getDraftingQueue()
    if (queue) {
      await queue.add(
        'draft',
        {
          questionnaireId,
          requestedBy: request.auth.userId,
          orgId: request.auth.orgId,
          modelRouteMode: parsed.data.modelRouteMode,
          mode: parsed.data.mode,
          questionIds: parsed.data.questionIds
        },
        {
          jobId: `draft:${check.workspaceId}:${questionnaireId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 }
        }
      )
    }

    const result = await draftQuestionnaire(questionnaireId, parsed.data.mode === 'question_ids' ? parsed.data.questionIds : undefined)
    if (!result) {
      return reply.code(404).send({ message: 'Questionnaire not found.' })
    }

    if (result.verifierFailures > 0) {
      const verifyQueue = getQuestionVerifyQueue()
      if (verifyQueue) {
        await verifyQueue.add(
          'verify',
          {
            questionnaireId,
            requestedBy: request.auth.userId
          },
          {
            jobId: `verify:${check.workspaceId}:${questionnaireId}`,
            attempts: 3,
            backoff: { type: 'exponential', delay: 500 }
          }
        )
      }
    }

    return reply.code(202).send({
      data: {
        status: 'drafting_completed',
        ...result
      }
    })
  })

  app.post('/v1/questions/:id/regenerate', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const questionId = (request.params as { id: string }).id
    const check = enforceQuestionScope(questionId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const regenerated = await regenerateQuestion(questionId)
    if (!regenerated) {
      return reply.code(404).send({ message: 'Question not found.' })
    }

    return reply.code(202).send({ data: regenerated })
  })

  app.get('/v1/questions/:id/draft-detail', { preHandler: requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']) }, async (request, reply) => {
    const questionId = (request.params as { id: string }).id
    const check = enforceQuestionScope(questionId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const detail = getDraftDetail(questionId)
    if (!detail) {
      return reply.code(404).send({ message: 'Draft detail not found.' })
    }

    return { data: detail }
  })

  app.patch('/v1/questions/:id/state', { preHandler: requireRole(['analyst', 'org_admin', 'client_approver']) }, async (request, reply) => {
    const questionId = (request.params as { id: string }).id
    const check = enforceQuestionScope(questionId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const parsed = stateSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid state payload', errors: parsed.error.flatten() })
    }

    const next = updateQuestionState({
      questionId,
      state: parsed.data.state,
      note: parsed.data.note,
      changedBy: request.auth.userId
    })

    return {
      data: {
        questionId,
        ...next
      }
    }
  })

  app.post('/v1/questions/:id/approve', { preHandler: requireRole(['client_approver', 'org_admin']) }, async (request, reply) => {
    const questionId = (request.params as { id: string }).id
    const check = enforceQuestionScope(questionId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const parsed = approveSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid approval payload', errors: parsed.error.flatten() })
    }

    const draft = getDraftByQuestionId(questionId)
    if (!draft) {
      return reply.code(409).send({ message: 'Cannot approve without a draft.' })
    }

    const approval = approveQuestion({
      questionId,
      approvedBy: parsed.data.approvedBy,
      comment: parsed.data.comment,
      acknowledgeLowConfidence: parsed.data.acknowledgeLowConfidence
    })

    updateQuestionState({
      questionId,
      state: 'approved',
      note: parsed.data.comment,
      changedBy: request.auth.userId
    })

    return {
      data: {
        questionId,
        approvedBy: approval.approvedBy,
        comment: approval.comment ?? null,
        acknowledgeLowConfidence: approval.acknowledgeLowConfidence,
        approvedAt: approval.approvedAt
      }
    }
  })

  app.post('/v1/questions/:id/evidence/attach', { preHandler: requireRole(['analyst', 'org_admin']) }, async (request, reply) => {
    const questionId = (request.params as { id: string }).id
    const parsed = attachEvidenceSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid evidence attachment payload', errors: parsed.error.flatten() })
    }

    const check = enforceQuestionScope(questionId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const mismatch = parsed.data.questionWorkspaceId !== parsed.data.snippetWorkspaceId
    if (mismatch && !parsed.data.explicitConfirmation) {
      return reply.code(409).send({
        message: 'Cross-workspace evidence attachment requires explicit confirmation and audit logging.',
        needsConfirmation: true
      })
    }

    const attached = attachCitationToQuestion({
      questionId,
      snippetId: parsed.data.snippetId,
      sentenceIndex: parsed.data.sentenceIndex,
      workspaceId: parsed.data.snippetWorkspaceId
    })

    if (!attached) {
      return reply.code(404).send({ message: 'Draft or snippet not found.' })
    }

    if ('error' in attached && attached.error === 'workspace_mismatch') {
      return reply.code(403).send({ message: 'Snippet does not belong to question workspace.' })
    }

    return {
      data: {
        questionId,
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
    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const gate = canExportQuestionnaire(questionnaireId)
    if (!gate.ok) {
      return reply.code(409).send({
        message: 'Export blocked by confidence/citation/approval gates.',
        blockers: gate.blocking
      })
    }

    const queue = getExportQueue()
    if (queue) {
      await queue.add(
        'export',
        {
          questionnaireId,
          requestedBy: request.auth.userId
        },
        {
          jobId: `export:${check.workspaceId}:${questionnaireId}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 500 }
        }
      )
    }

    markQuestionnaireExported(questionnaireId)

    return reply.code(202).send({
      data: {
        questionnaireId,
        status: 'export_queued'
      }
    })
  })

  app.get('/v1/questionnaires/:id/progress', { preHandler: requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']) }, async (request, reply) => {
    const questionnaireId = (request.params as { id: string }).id
    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const progress = getProgress(questionnaireId)

    if (!progress) {
      return reply.code(404).send({ message: 'No progress found for questionnaire.' })
    }

    return { data: progress }
  })

  app.get('/v1/workspaces/:id/questionnaires/:questionnaireId/mapping', { preHandler: [requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']), requireWorkspaceScope] }, async (request, reply) => {
    const questionnaireId = (request.params as { questionnaireId: string }).questionnaireId
    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const mapping = getMapping(questionnaireId)
    if (!mapping) {
      return reply.code(404).send({ message: 'Mapping not found.' })
    }

    return { data: mapping }
  })

  app.get('/v1/workspaces/:id/questionnaires/:questionnaireId', { preHandler: [requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']), requireWorkspaceScope] }, async (request, reply) => {
    const questionnaireId = (request.params as { questionnaireId: string }).questionnaireId
    const check = enforceQuestionnaireScope(questionnaireId, request.auth.workspaceId)
    if (!check.ok) {
      return reply.code(check.status).send({ message: check.message })
    }

    const questionnaire = getQuestionnaire(questionnaireId)
    if (!questionnaire) {
      return reply.code(404).send({ message: 'Questionnaire not found.' })
    }

    return { data: questionnaire }
  })
}
