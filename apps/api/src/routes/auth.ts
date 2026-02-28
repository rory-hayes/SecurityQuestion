import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

const requestSchema = z.object({
  email: z.string().email(),
  organizationName: z.string().min(2)
})

const verifySchema = z.object({
  token: z.string().min(8)
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/v1/auth/magic-link', async (request, reply) => {
    const parsed = requestSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid magic-link request', errors: parsed.error.flatten() })
    }

    return reply.code(202).send({
      data: {
        status: 'sent',
        email: parsed.data.email,
        organizationName: parsed.data.organizationName,
        requestId: `ml-${Date.now()}`
      }
    })
  })

  app.post('/v1/auth/magic-link/verify', async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid verify request', errors: parsed.error.flatten() })
    }

    return reply.send({
      data: {
        sessionToken: `session-${parsed.data.token}`,
        userId: 'user-1',
        orgId: 'org-default'
      }
    })
  })
}
