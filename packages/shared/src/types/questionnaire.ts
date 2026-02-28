export type ResponseType = 'yes_no' | 'short_text' | 'long_text' | 'multi_select' | 'unknown'

export interface QuestionConstraint {
  wordLimit?: number
  allowedOptions?: string[]
  requiresEvidence?: boolean
  formatHint?: string
}

export interface NormalizedQuestion {
  id: string
  questionnaireId: string
  workspaceId: string
  sectionPath: string[]
  prompt: string
  responseType: ResponseType
  constraints: QuestionConstraint
  stableKey: string
}
