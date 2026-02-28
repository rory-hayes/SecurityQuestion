import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { brandingByOrg } from '../lib/mock-store'
import { requireRole } from '../plugins/require-role'

const brandingPatchSchema = z.object({
  productName: z.string().min(2).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  accentHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
})

export async function brandingRoutes(app: FastifyInstance) {
  app.get('/v1/orgs/:id/branding', { preHandler: requireRole(['org_admin', 'analyst']) }, async (request, reply) => {
    const orgId = (request.params as { id: string }).id

    if (request.auth.orgId !== orgId && !request.auth.roles.includes('org_admin')) {
      return reply.code(403).send({ message: 'Cross-org access denied.' })
    }

    const branding = brandingByOrg.get(orgId)
    if (!branding) {
      return reply.code(404).send({ message: 'Branding settings not found.' })
    }

    return { data: branding }
  })

  app.patch('/v1/orgs/:id/branding', { preHandler: requireRole(['org_admin']) }, async (request, reply) => {
    const orgId = (request.params as { id: string }).id
    if (request.auth.orgId !== orgId) {
      return reply.code(403).send({ message: 'Cross-org mutation denied.' })
    }

    const parsed = brandingPatchSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload.', errors: parsed.error.flatten() })
    }

    const previous = brandingByOrg.get(orgId) ?? {
      orgId,
      productName: 'Security Questionnaire Copilot',
      logoUrl: null,
      accentHex: '#365EEA',
      updatedAt: new Date().toISOString()
    }

    const next = {
      ...previous,
      ...parsed.data,
      updatedAt: new Date().toISOString()
    }
    brandingByOrg.set(orgId, next)

    return { data: next }
  })
}
