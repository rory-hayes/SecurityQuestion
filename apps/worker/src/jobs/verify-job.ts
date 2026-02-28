import type { Job } from 'bullmq'

export async function handleVerifyJob(job: Job) {
  const { questionnaireId } = job.data

  await job.updateProgress(45)
  await new Promise((resolve) => setTimeout(resolve, 80))

  await job.updateProgress(100)

  return {
    questionnaireId,
    status: 'verification_completed'
  }
}
