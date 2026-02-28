import { createHash, randomUUID } from 'node:crypto'
import type {
  ClaimValidationIssue,
  ConfidenceBand,
  ConfidenceBreakdown,
  DraftGenerationTrace,
  CitationLink,
  MissingInfoItem,
  ModelRouteDecision,
  NormalizedQuestion
} from '@sqc/shared'
import { CONFIDENCE_THRESHOLDS, MODEL_IDS, STORE_POLICY } from './rag-config'
import { embedText } from './openai-gateway'

const TOKEN_TARGET = 820
const TOKEN_OVERLAP = 120

export interface DocumentForRag {
  id: string
  workspaceId: string
  name: string
  text: string
  lastUpdated?: string
  expiryDate?: string
}

export interface RagChunk {
  id: string
  workspaceId: string
  documentId: string
  documentName: string
  chunkIndex: number
  content: string
  embedding: number[]
  lastUpdated?: string
  expiryDate?: string
}

export interface RagSnippet {
  id: string
  workspaceId: string
  documentId: string
  chunkId: string
  excerpt: string
  charStart: number
  charEnd: number
  approved: boolean
}

export interface DraftComputationResult {
  text: string
  citations: CitationLink[]
  confidenceScore: number
  confidenceBand: ConfidenceBand
  confidenceBreakdown: ConfidenceBreakdown
  noEvidenceFound: boolean
  missingInfo: MissingInfoItem[]
  issues: ClaimValidationIssue[]
  routeDecision: ModelRouteDecision
  trace: DraftGenerationTrace
}

type ScoredSnippet = {
  snippet: RagSnippet
  chunk: RagChunk
  score: number
  lexicalScore: number
  vectorScore: number
  freshnessScore: number
}

function nowIso() {
  return new Date().toISOString()
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function tokenize(value: string) {
  return normalize(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 1)
}

function sentenceSplit(value: string) {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function lexicalSimilarity(a: string, b: string) {
  const aTokens = new Set(tokenize(a))
  const bTokens = new Set(tokenize(b))
  if (!aTokens.size || !bTokens.size) return 0

  let overlap = 0
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1
  }
  return overlap / Math.max(aTokens.size, bTokens.size)
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    normA += a[index] * a[index]
    normB += b[index] * b[index]
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function freshnessScore(lastUpdated?: string, expiryDate?: string) {
  const now = Date.now()
  let score = 1

  if (expiryDate) {
    const expiry = Date.parse(expiryDate)
    if (!Number.isNaN(expiry) && expiry < now) score -= 0.45
  }

  if (lastUpdated) {
    const updated = Date.parse(lastUpdated)
    if (!Number.isNaN(updated)) {
      const ageDays = Math.max(0, (now - updated) / (1000 * 60 * 60 * 24))
      if (ageDays > 365) score -= 0.25
      if (ageDays > 730) score -= 0.3
    }
  }

  return Math.max(0, Math.min(1, score))
}

function fitConfidenceBand(score: number): ConfidenceBand {
  if (score >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (score >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  return 'low'
}

export async function chunkDocument(document: DocumentForRag) {
  const words = document.text.split(/\s+/).filter(Boolean)
  const chunks: RagChunk[] = []
  const snippets: RagSnippet[] = []

  if (!words.length) return { chunks, snippets }

  let start = 0
  let chunkIndex = 0
  while (start < words.length) {
    const end = Math.min(words.length, start + TOKEN_TARGET)
    const content = words.slice(start, end).join(' ')
    const chunkId = `chunk-${document.id}-${chunkIndex}`
    const embedding = await embedText(content)
    chunks.push({
      id: chunkId,
      workspaceId: document.workspaceId,
      documentId: document.id,
      documentName: document.name,
      chunkIndex,
      content,
      embedding,
      lastUpdated: document.lastUpdated,
      expiryDate: document.expiryDate
    })

    const excerptLength = Math.min(320, content.length)
    snippets.push({
      id: `snip-${document.id}-${chunkIndex}`,
      workspaceId: document.workspaceId,
      documentId: document.id,
      chunkId,
      excerpt: content.slice(0, excerptLength),
      charStart: 0,
      charEnd: excerptLength,
      approved: true
    })

    if (end >= words.length) break
    start = Math.max(0, end - TOKEN_OVERLAP)
    chunkIndex += 1
  }

  return { chunks, snippets }
}

function buildAnswerText(question: NormalizedQuestion, candidates: ScoredSnippet[]) {
  if (!candidates.length) {
    return 'Cannot confirm from current evidence; needs input.'
  }

  const primary = candidates[0]
  const secondary = candidates[1]
  const evidenceSummary = primary.snippet.excerpt.slice(0, 180).replace(/\s+/g, ' ')
  const secondarySummary = secondary?.snippet.excerpt.slice(0, 140).replace(/\s+/g, ' ')

  if (question.responseType === 'yes_no') {
    return `Yes, based on current documented controls. Evidence indicates ${evidenceSummary}.`
  }

  if (question.responseType === 'long_text' && secondarySummary) {
    return `Based on current approved evidence, ${evidenceSummary}. Supporting documentation also notes ${secondarySummary}.`
  }

  return `Based on current approved evidence, ${evidenceSummary}.`
}

function computeAnswerLibraryAlignment(prompt: string) {
  const normalized = normalize(prompt)
  if (normalized.includes('encrypt')) return 0.85
  if (normalized.includes('access control')) return 0.8
  if (normalized.includes('incident')) return 0.72
  return 0.6
}

function buildIssues(
  answerText: string,
  citations: CitationLink[],
  questionId: string,
  responseType: NormalizedQuestion['responseType']
) {
  const issues: ClaimValidationIssue[] = []
  const sentences = sentenceSplit(answerText)
  const bannedTerms = ['guarantee', 'always', 'fully compliant', 'certified compliant']

  for (let sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex += 1) {
    const sentence = sentences[sentenceIndex]
    const hasCitation = citations.some((citation) => citation.sentenceIndex === sentenceIndex)
    const material = sentence.length > 25 && !sentence.toLowerCase().includes('needs input')
    if (material && !hasCitation) {
      issues.push({
        id: `issue-${questionId}-missing-citation-${sentenceIndex}`,
        questionId,
        type: 'missing_citation',
        severity: 'error',
        message: 'Material claim sentence is missing citation coverage.',
        sentenceIndex
      })
    }
  }

  const text = normalize(answerText)
  for (const term of bannedTerms) {
    if (text.includes(term)) {
      issues.push({
        id: `issue-${questionId}-tone-${term.replace(/\s+/g, '-')}`,
        questionId,
        type: 'tone_violation',
        severity: 'error',
        message: `Tone includes prohibited guarantee phrase: "${term}".`
      })
    }
  }

  if ((responseType === 'long_text' || responseType === 'multi_select') && citations.length < 2) {
    issues.push({
      id: `issue-${questionId}-citation-minimum`,
      questionId,
      type: 'missing_citation',
      severity: 'error',
      message: 'Long-form answers require at least two independent citations.'
    })
  } else if ((responseType === 'yes_no' || responseType === 'short_text') && citations.length < 1) {
    issues.push({
      id: `issue-${questionId}-citation-minimum`,
      questionId,
      type: 'missing_citation',
      severity: 'error',
      message: 'Answer requires at least one citation.'
    })
  }

  return issues
}

function createModelRoute(flow: ModelRouteDecision['flow'], reasons: string[], escalated: boolean): ModelRouteDecision {
  const selectedModel = flow === 'verify' ? MODEL_IDS.verifierPrimary : escalated ? MODEL_IDS.draftEscalation : MODEL_IDS.draftPrimary
  return {
    flow,
    selectedModel,
    escalationModel: flow === 'verify' ? undefined : MODEL_IDS.draftEscalation,
    escalated,
    reasons,
    temperature: 0.1,
    store: STORE_POLICY.customerContentStore
  }
}

function hashRequest(input: string) {
  return createHash('sha256').update(input).digest('hex')
}

export async function draftAnswer(
  question: NormalizedQuestion,
  snippets: RagSnippet[],
  chunksById: Map<string, RagChunk>,
  questionEmbedding?: number[]
): Promise<DraftComputationResult> {
  const scored: ScoredSnippet[] = []
  for (const snippet of snippets) {
    if (!snippet.approved || snippet.workspaceId !== question.workspaceId) continue
    const chunk = chunksById.get(snippet.chunkId)
    if (!chunk) continue

    const lexicalScore = lexicalSimilarity(question.prompt, snippet.excerpt)
    const vectorScore = questionEmbedding ? cosineSimilarity(questionEmbedding, chunk.embedding) : lexicalScore
    const freshness = freshnessScore(chunk.lastUpdated, chunk.expiryDate)
    const score = 0.55 * lexicalScore + 0.35 * Math.max(0, vectorScore) + 0.1 * freshness
    scored.push({
      snippet,
      chunk,
      score,
      lexicalScore,
      vectorScore,
      freshnessScore: freshness
    })
  }

  scored.sort((left, right) => right.score - left.score)
  const candidatePool = scored.slice(0, 30)
  const topCandidates = candidatePool.slice(0, 8)

  const requiredCitationCount = question.responseType === 'long_text' ? 2 : 1
  const selected: ScoredSnippet[] = []
  for (const candidate of topCandidates) {
    if (selected.length >= requiredCitationCount) break
    if (selected.length === 0) {
      selected.push(candidate)
      continue
    }

    const duplicateDocument = selected.some((item) => item.snippet.documentId === candidate.snippet.documentId)
    if (!duplicateDocument || topCandidates.every((item) => item.snippet.documentId === selected[0].snippet.documentId)) {
      selected.push(candidate)
    }
  }
  const text = buildAnswerText(question, selected)
  const noEvidenceFound = selected.length === 0

  const citations: CitationLink[] = selected.map((candidate, index) => ({
    snippetId: candidate.snippet.id,
    documentId: candidate.snippet.documentId,
    chunkId: candidate.snippet.chunkId,
    excerpt: candidate.snippet.excerpt,
    charStart: candidate.snippet.charStart,
    charEnd: candidate.snippet.charEnd,
    sentenceIndex: Math.min(index, Math.max(0, sentenceSplit(text).length - 1)),
    relevanceScore: Number(candidate.score.toFixed(3))
  }))

  const retrievalRelevance = topCandidates.length
    ? topCandidates.reduce((sum, item) => sum + item.score, 0) / topCandidates.length
    : 0
  const evidenceCoverage = noEvidenceFound ? 0 : Math.min(1, selected.length / requiredCitationCount)
  const evidenceRecency = selected.length
    ? selected.reduce((sum, item) => sum + item.freshnessScore, 0) / selected.length
    : 0
  const answerLibraryAlignment = computeAnswerLibraryAlignment(question.prompt)

  const issues = buildIssues(text, citations, question.id, question.responseType)
  const verifierPass = issues.some((issue) => issue.severity === 'error') ? 0 : 1

  const confidenceBreakdown: ConfidenceBreakdown = {
    evidenceCoverage: Number(evidenceCoverage.toFixed(3)),
    retrievalRelevance: Number(retrievalRelevance.toFixed(3)),
    evidenceRecency: Number(evidenceRecency.toFixed(3)),
    verifierPass,
    answerLibraryAlignment: Number(answerLibraryAlignment.toFixed(3)),
    total: 0
  }

  const confidenceScore = Number(
    (
      0.4 * confidenceBreakdown.evidenceCoverage +
      0.2 * confidenceBreakdown.retrievalRelevance +
      0.15 * confidenceBreakdown.evidenceRecency +
      0.15 * confidenceBreakdown.verifierPass +
      0.1 * confidenceBreakdown.answerLibraryAlignment
    ).toFixed(3)
  )
  confidenceBreakdown.total = confidenceScore

  const confidenceBand = fitConfidenceBand(confidenceScore)
  const escalated =
    confidenceScore < CONFIDENCE_THRESHOLDS.high ||
    confidenceBand === 'low' ||
    issues.some((issue) => issue.type === 'conflicting_evidence' || issue.severity === 'error')

  const reasons: string[] = []
  if (confidenceScore < CONFIDENCE_THRESHOLDS.high) reasons.push('confidence_below_high_threshold')
  if (noEvidenceFound) reasons.push('low_retrieval_coverage')
  if (issues.some((issue) => issue.severity === 'error')) reasons.push('verifier_failure')
  if (!reasons.length) reasons.push('balanced_cost_quality_path')
  const routeDecision = createModelRoute('draft', reasons, escalated)

  const missingInfo: MissingInfoItem[] = noEvidenceFound
    ? [
        {
          field: 'supporting_evidence',
          reason: 'No approved evidence snippets matched this prompt with sufficient relevance.',
          ownerRole: 'client_approver'
        }
      ]
    : []

  const trace: DraftGenerationTrace = {
    traceId: `trace-${randomUUID()}`,
    questionId: question.id,
    routeDecision,
    latencyMs: Math.max(5, Math.round(60 + topCandidates.length * 9)),
    requestHash: hashRequest(`${question.id}:${question.prompt}:${nowIso()}`),
    at: nowIso()
  }

  return {
    text,
    citations,
    confidenceScore,
    confidenceBand,
    confidenceBreakdown,
    noEvidenceFound,
    missingInfo,
    issues,
    routeDecision,
    trace
  }
}
