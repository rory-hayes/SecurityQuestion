import { type Job, type Processor, Worker } from 'bullmq'
import { handleDocumentExtractJob } from './jobs/document-extract-job'
import { handleDraftJob } from './jobs/draft-job'
import { handleExportJob } from './jobs/export-job'
import { handleImportJob } from './jobs/import-job'
import { handleNormaliseJob } from './jobs/normalise-job'
import { handleVerifyJob } from './jobs/verify-job'

const connection = {
  host: process.env.REDIS_HOST ?? '127.0.0.1',
  port: Number(process.env.REDIS_PORT ?? '6379'),
  maxRetriesPerRequest: null
}

function createWorker(queueName: string, processor: Processor) {
  const worker = new Worker(queueName, processor, { connection })

  worker.on('ready', () => {
    console.log(`[worker] ${queueName} ready`)
  })

  worker.on('completed', (job) => {
    console.log(`[worker] ${queueName} completed job ${job.id}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`[worker] ${queueName} failed job ${job?.id}:`, err)
  })

  return worker
}

const importWorker = createWorker('questionnaire-import', handleImportJob)
const documentExtractWorker = createWorker('document-extract', handleDocumentExtractJob)
const normaliseWorker = createWorker('questionnaire-normalise', handleNormaliseJob)
const draftWorker = createWorker('questionnaire-drafting', handleDraftJob)
const verifyWorker = createWorker('question-verify', handleVerifyJob)
const exportWorker = createWorker('questionnaire-export', handleExportJob)

async function shutdown(signal: string) {
  console.log(`[worker] received ${signal}, shutting down...`)
  await Promise.all([
    importWorker.close(),
    documentExtractWorker.close(),
    normaliseWorker.close(),
    draftWorker.close(),
    verifyWorker.close(),
    exportWorker.close()
  ])
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
