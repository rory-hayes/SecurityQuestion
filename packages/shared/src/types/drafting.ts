export type ConfidenceBand = 'high' | 'medium' | 'low'

export interface Citation {
  snippetId: string
  documentId: string
  chunkId: string
  excerpt: string
  charStart: number
  charEnd: number
}

export interface MissingInfoItem {
  field: string
  reason: string
  ownerRole: 'analyst' | 'client_approver'
}

export interface AnswerDraft {
  id: string
  questionId: string
  text: string
  citations: Citation[]
  confidenceScore: number
  confidenceBand: ConfidenceBand
  missingInfo: MissingInfoItem[]
  noEvidenceFound: boolean
  modelTraceId: string
}
