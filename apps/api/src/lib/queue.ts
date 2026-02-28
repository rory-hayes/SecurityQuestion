import { Queue } from 'bullmq'

const redisConnection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? '6379')
}

let importQueue: Queue | null = null
let draftingQueue: Queue | null = null
let exportQueue: Queue | null = null

function queueDisabled() {
  return process.env.DISABLE_QUEUES === 'true'
}

export function getImportQueue() {
  if (queueDisabled()) return null
  if (!importQueue) importQueue = new Queue('questionnaire-import', { connection: redisConnection })
  return importQueue
}

export function getDraftingQueue() {
  if (queueDisabled()) return null
  if (!draftingQueue) draftingQueue = new Queue('questionnaire-drafting', { connection: redisConnection })
  return draftingQueue
}

export function getExportQueue() {
  if (queueDisabled()) return null
  if (!exportQueue) exportQueue = new Queue('questionnaire-export', { connection: redisConnection })
  return exportQueue
}
