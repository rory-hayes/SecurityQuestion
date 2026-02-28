import { Queue } from 'bullmq'

const redisConnection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? '6379')
}

let importQueue: Queue | null = null
let documentExtractQueue: Queue | null = null
let questionnaireNormaliseQueue: Queue | null = null
let draftingQueue: Queue | null = null
let questionVerifyQueue: Queue | null = null
let exportQueue: Queue | null = null

function queueDisabled() {
  return process.env.DISABLE_QUEUES === 'true'
}

export function getImportQueue() {
  if (queueDisabled()) return null
  if (!importQueue) importQueue = new Queue('questionnaire-import', { connection: redisConnection })
  return importQueue
}

export function getDocumentExtractQueue() {
  if (queueDisabled()) return null
  if (!documentExtractQueue) documentExtractQueue = new Queue('document-extract', { connection: redisConnection })
  return documentExtractQueue
}

export function getQuestionnaireNormaliseQueue() {
  if (queueDisabled()) return null
  if (!questionnaireNormaliseQueue) questionnaireNormaliseQueue = new Queue('questionnaire-normalise', { connection: redisConnection })
  return questionnaireNormaliseQueue
}

export function getDraftingQueue() {
  if (queueDisabled()) return null
  if (!draftingQueue) draftingQueue = new Queue('questionnaire-drafting', { connection: redisConnection })
  return draftingQueue
}

export function getQuestionVerifyQueue() {
  if (queueDisabled()) return null
  if (!questionVerifyQueue) questionVerifyQueue = new Queue('question-verify', { connection: redisConnection })
  return questionVerifyQueue
}

export function getExportQueue() {
  if (queueDisabled()) return null
  if (!exportQueue) exportQueue = new Queue('questionnaire-export', { connection: redisConnection })
  return exportQueue
}
