import type { Job } from 'bullmq'

export async function handleNormaliseJob(job: Job) {
  const { questionnaireId, workspaceId } = job.data

  await job.updateProgress(25)
  await new Promise((resolve) => setTimeout(resolve, 100))

  await job.updateProgress(65)
  await new Promise((resolve) => setTimeout(resolve, 100))

  await job.updateProgress(100)

  return {
    questionnaireId,
    workspaceId,
    status: 'normalise_completed'
  }
}
