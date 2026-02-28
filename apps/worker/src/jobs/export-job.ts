import type { Job } from 'bullmq'

export async function handleExportJob(job: Job) {
  const { questionnaireId } = job.data

  await job.updateProgress(35)
  await new Promise((resolve) => setTimeout(resolve, 80))

  await job.updateProgress(75)
  await new Promise((resolve) => setTimeout(resolve, 80))

  await job.updateProgress(100)

  return {
    questionnaireId,
    status: 'export_completed',
    artifactKey: `exports/${questionnaireId}.xlsx`,
    evidencePackKey: `exports/${questionnaireId}-evidence.zip`
  }
}
