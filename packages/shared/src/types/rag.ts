import type { ResponseType } from './questionnaire'

export type MappingSuggestionSource = 'deterministic' | 'ai_fallback'

export interface QuestionMappingSuggestion {
  questionnaireId: string
  headerRowIndex: number
  questionColumn: string
  answerColumn: string
  evidenceColumn?: string
  confidence: number
  source: MappingSuggestionSource
  reasoningSummary: string
}

export interface QuestionConstraintDetected {
  responseTypeHints: ResponseType[]
  requiresEvidence: boolean
  wordLimit?: number
  allowedOptions?: string[]
  formatHint?: string
}

export interface ConfidenceBreakdown {
  evidenceCoverage: number
  retrievalRelevance: number
  evidenceRecency: number
  verifierPass: number
  answerLibraryAlignment: number
  total: number
}

export interface CitationLink {
  snippetId: string
  documentId: string
  chunkId: string
  excerpt: string
  charStart: number
  charEnd: number
  sentenceIndex: number
  relevanceScore: number
}

export type ClaimIssueSeverity = 'error' | 'warning'

export interface ClaimValidationIssue {
  id: string
  questionId: string
  type: 'missing_citation' | 'unsupported_claim' | 'conflicting_evidence' | 'tone_violation'
  severity: ClaimIssueSeverity
  message: string
  sentenceIndex?: number
  citationIds?: string[]
}

export interface ModelRouteDecision {
  flow: 'mapping' | 'normalise' | 'draft' | 'verify' | 'missing_info'
  selectedModel: string
  escalationModel?: string
  escalated: boolean
  reasons: string[]
  temperature: number
  store: boolean
}

export interface DraftGenerationTrace {
  traceId: string
  questionId: string
  routeDecision: ModelRouteDecision
  latencyMs: number
  promptTokens?: number
  completionTokens?: number
  requestHash: string
  at: string
}
