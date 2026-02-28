import type { Job } from 'bullmq'

export async function handleImportJob(job: Job) {
  const { questionnaireId, workspaceId } = job.data

  await job.updateProgress(20)
  await new Promise((resolve) => setTimeout(resolve, 100))

  await job.updateProgress(50)
  await new Promise((resolve) => setTimeout(resolve, 100))

  await job.updateProgress(100)

  return {
    questionnaireId,
    workspaceId,
    normalizedQuestions: 0,
    status: 'import_completed'
  }
}
