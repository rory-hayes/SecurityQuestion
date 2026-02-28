import type { Job } from 'bullmq'

function scoreToBand(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.75) return 'high'
  if (score >= 0.5) return 'medium'
  return 'low'
}

export async function handleDraftJob(job: Job) {
  const { questionnaireId } = job.data

  const evidenceCoverage = 0.8
  const matchQuality = 0.72
  const recency = 0.9

  const confidenceScore = Number((0.5 * evidenceCoverage + 0.3 * matchQuality + 0.2 * recency).toFixed(3))

  await job.updateProgress(40)
  await new Promise((resolve) => setTimeout(resolve, 120))

  await job.updateProgress(100)

  return {
    questionnaireId,
    confidenceScore,
    confidenceBand: scoreToBand(confidenceScore),
    status: 'drafting_completed'
  }
}
