import type { FastifyInstance } from 'fastify'
import { publicFaq, publicPricing } from '../lib/mock-store'

export async function publicRoutes(app: FastifyInstance) {
  app.get('/v1/public/pricing', async () => {
    return { data: publicPricing }
  })

  app.get('/v1/public/faq', async () => {
    return { data: publicFaq }
  })
}
