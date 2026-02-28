import type { Job } from 'bullmq'

export async function handleDocumentExtractJob(job: Job) {
  const { documentId, workspaceId } = job.data

  await job.updateProgress(30)
  await new Promise((resolve) => setTimeout(resolve, 120))

  await job.updateProgress(70)
  await new Promise((resolve) => setTimeout(resolve, 120))

  await job.updateProgress(100)

  return {
    documentId,
    workspaceId,
    status: 'document_extraction_completed'
  }
}
