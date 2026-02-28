import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  createDocument,
  createDocumentUploadUrl,
  getDocument,
  getDocumentExtractionStatus,
  processDocumentExtraction,
  seedDocumentIfEmpty,
  updateDocumentText
} from '../lib/mock-store'
import { requireRole } from '../plugins/require-role'
import { requireWorkspaceScope } from '../plugins/workspace-scope'

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().optional()
})

const metadataSchema = z.object({
  name: z.string().min(1).optional(),
  docType: z.string().min(1),
  frameworkTags: z.array(z.string()).default([]),
  systemTag: z.string().optional(),
  owner: z.string().min(1),
  storageKey: z.string().optional(),
  text: z.string().optional(),
  lastUpdated: z.string().optional(),
  expiryDate: z.string().optional()
})

const processSchema = z.object({
  text: z.string().optional()
})

export async function documentRoutes(app: FastifyInstance) {
  app.post(
    '/v1/workspaces/:id/documents/upload-url',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const parsed = uploadUrlSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid upload request.', errors: parsed.error.flatten() })
      }

      const upload = createDocumentUploadUrl({
        workspaceId,
        fileName: parsed.data.fileName,
        contentType: parsed.data.contentType
      })

      return reply.code(201).send({ data: upload })
    }
  )

  app.post(
    '/v1/workspaces/:id/documents',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const parsed = metadataSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid document metadata.', errors: parsed.error.flatten() })
      }

      const document = createDocument({
        workspaceId,
        name: parsed.data.name,
        docType: parsed.data.docType,
        frameworkTags: parsed.data.frameworkTags,
        systemTag: parsed.data.systemTag,
        owner: parsed.data.owner,
        storageKey: parsed.data.storageKey,
        text: parsed.data.text,
        lastUpdated: parsed.data.lastUpdated,
        expiryDate: parsed.data.expiryDate
      })

      seedDocumentIfEmpty(workspaceId)

      return reply.code(201).send({
        data: {
          documentId: document.id,
          workspaceId,
          name: document.name,
          docType: document.docType,
          owner: document.owner,
          extractedStatus: 'queued',
          createdAt: document.createdAt
        }
      })
    }
  )

  app.post(
    '/v1/workspaces/:id/documents/:documentId/process',
    { preHandler: [requireRole(['analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const documentId = (request.params as { documentId: string }).documentId
      const parsed = processSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.code(400).send({ message: 'Invalid process payload.', errors: parsed.error.flatten() })
      }

      const document = getDocument(documentId)
      if (!document || document.workspaceId !== workspaceId) {
        return reply.code(404).send({ message: 'Document not found.' })
      }

      if (parsed.data.text) {
        updateDocumentText(documentId, parsed.data.text)
      }

      const extraction = await processDocumentExtraction(documentId)
      if (!extraction) {
        return reply.code(404).send({ message: 'Unable to process document extraction.' })
      }

      return {
        data: {
          documentId,
          status: extraction.status,
          chunks: extraction.chunks,
          snippets: extraction.snippets,
          parserVersion: extraction.parserVersion,
          failureReason: extraction.failureReason ?? null,
          updatedAt: extraction.updatedAt
        }
      }
    }
  )

  app.get(
    '/v1/workspaces/:id/documents/:documentId/status',
    { preHandler: [requireRole(['viewer', 'client_approver', 'analyst', 'org_admin']), requireWorkspaceScope] },
    async (request, reply) => {
      const workspaceId = (request.params as { id: string }).id
      const documentId = (request.params as { documentId: string }).documentId
      const status = getDocumentExtractionStatus(workspaceId, documentId)

      if (!status) {
        return reply.code(404).send({ message: 'Document extraction status not found.' })
      }

      return { data: status }
    }
  )
}
