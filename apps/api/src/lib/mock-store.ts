import { randomUUID } from 'node:crypto'
import type {
  BrandingSettings,
  ClaimValidationIssue,
  ConfidenceBreakdown,
  DraftGenerationTrace,
  NormalizedQuestion,
  PublicFaqItem,
  PublicPricingTier,
  QuestionMappingSuggestion
} from '@sqc/shared'
import { MODEL_IDS } from './rag-config'
import { embedText, generateJsonOutput } from './openai-gateway'
import {
  normalizeQuestionsFromMapping,
  suggestColumnMapping,
  type ColumnMapping,
  type QuestionnaireParseInput,
  type QuestionnaireSourceType
} from './questionnaire-parser'
import {
  chunkDocument,
  draftAnswer,
  type DraftComputationResult,
  type DocumentForRag,
  type RagChunk,
  type RagSnippet
} from './rag-engine'

export const publicPricing: PublicPricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceEurRange: 'EUR 199-399',
    includedClientWorkspaces: '1-3 workspaces',
    notes: 'Best for solo vCISO operators.'
  },
  {
    id: 'agency',
    name: 'Agency',
    monthlyPriceEurRange: 'EUR 799-1499',
    includedClientWorkspaces: 'Up to 15 workspaces',
    notes: 'For firms managing multiple active clients.'
  },
  {
    id: 'scale',
    name: 'Scale',
    monthlyPriceEurRange: 'Custom',
    includedClientWorkspaces: 'High volume',
    notes: 'For advanced controls and throughput requirements.'
  }
]

export const publicFaq: PublicFaqItem[] = [
  {
    id: 'f1',
    question: 'How are AI answers controlled?',
    answer:
      'Drafts are retrieval grounded and require citations. If evidence is missing, the system marks the question for client input.'
  },
  {
    id: 'f2',
    question: 'Is approval mandatory before export?',
    answer: 'Yes. Low-confidence and final exports require explicit approval with audit records.'
  },
  {
    id: 'f3',
    question: 'How is client isolation enforced?',
    answer: 'Workspace scoping is enforced in API, storage keys, and retrieval filters, with auditable access logs.'
  }
]

export const brandingByOrg = new Map<string, BrandingSettings>([
  [
    'org-default',
    {
      orgId: 'org-default',
      productName: 'Security Questionnaire Copilot',
      logoUrl: null,
      accentHex: '#365EEA',
      updatedAt: new Date().toISOString()
    }
  ]
])

export const globalTemplates = [
  {
    id: 'gt-1',
    title: 'Encryption at Rest and In Transit',
    shortAnswer: 'Data is encrypted in transit and at rest.',
    nonClientSpecific: true
  },
  {
    id: 'gt-2',
    title: 'Access Control Principles',
    shortAnswer: 'Access is role-based and reviewed regularly.',
    nonClientSpecific: true
  }
]

export type ProgressStage = 'import' | 'mapping' | 'normalise' | 'retrieval' | 'draft' | 'verify' | 'export'

export type StageStatus = 'pending' | 'queued' | 'in_progress' | 'completed' | 'failed'

export interface StageProgress {
  status: StageStatus
  percent: number
  updatedAt: string
  error?: string
}

export interface QuestionnaireProgressRecord {
  percent: number
  status: string
  resumed: boolean
  stages: Record<ProgressStage, StageProgress>
}

export const questionnaireProgress = new Map<string, QuestionnaireProgressRecord>()

interface StoredDocument {
  id: string
  workspaceId: string
  name: string
  docType: string
  owner: string
  frameworkTags: string[]
  systemTag?: string
  lastUpdated?: string
  expiryDate?: string
  storageKey: string
  text: string
  createdAt: string
}

interface DocumentExtractionRecord {
  documentId: string
  workspaceId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  parserVersion: string
  chunks: number
  snippets: number
  failureReason?: string
  updatedAt: string
}

interface QuestionnaireRecord {
  id: string
  workspaceId: string
  sourceFilename: string
  sourceType: QuestionnaireSourceType
  sourceRows?: string[][]
  csvText?: string
  workbookBase64?: string
  extractionMode: 'deterministic' | 'hybrid'
  status: string
  version: number
  createdAt: string
}

interface MappingRecord {
  questionnaireId: string
  workspaceId: string
  suggestion: QuestionMappingSuggestion
  confirmed: boolean
  confirmedMapping?: ColumnMapping
  confirmedAt?: string
}

interface StoredDraft {
  questionId: string
  questionnaireId: string
  workspaceId: string
  text: string
  citations: DraftComputationResult['citations']
  confidenceScore: number
  confidenceBand: DraftComputationResult['confidenceBand']
  confidenceBreakdown: ConfidenceBreakdown
  missingInfo: DraftComputationResult['missingInfo']
  noEvidenceFound: boolean
  issues: ClaimValidationIssue[]
  verifierPassed: boolean
  routeDecision: DraftComputationResult['routeDecision']
  trace: DraftGenerationTrace
  createdAt: string
}

interface ApprovalRecord {
  questionId: string
  approvedBy: string
  comment?: string
  acknowledgeLowConfidence: boolean
  approvedAt: string
}

interface QuestionStateRecord {
  state: 'drafted' | 'in_review' | 'needs_client_input' | 'approved' | 'exported'
  note?: string
  changedBy: string
  changedAt: string
  lowConfidenceAcknowledged: boolean
}

const documentsById = new Map<string, StoredDocument>()
const documentExtractionsById = new Map<string, DocumentExtractionRecord>()
const chunksByWorkspace = new Map<string, RagChunk[]>()
const snippetsByWorkspace = new Map<string, RagSnippet[]>()

const questionnairesById = new Map<string, QuestionnaireRecord>()
const mappingsByQuestionnaire = new Map<string, MappingRecord>()
const questionsByQuestionnaire = new Map<string, NormalizedQuestion[]>()
const questionIndex = new Map<string, NormalizedQuestion>()
const draftsByQuestionId = new Map<string, StoredDraft>()
const approvalsByQuestionId = new Map<string, ApprovalRecord[]>()
const stateByQuestionId = new Map<string, QuestionStateRecord>()
const tracesByQuestionId = new Map<string, DraftGenerationTrace[]>()

function nowIso() {
  return new Date().toISOString()
}

function createDefaultStages(): QuestionnaireProgressRecord['stages'] {
  const stamp = nowIso()
  return {
    import: { status: 'pending', percent: 0, updatedAt: stamp },
    mapping: { status: 'pending', percent: 0, updatedAt: stamp },
    normalise: { status: 'pending', percent: 0, updatedAt: stamp },
    retrieval: { status: 'pending', percent: 0, updatedAt: stamp },
    draft: { status: 'pending', percent: 0, updatedAt: stamp },
    verify: { status: 'pending', percent: 0, updatedAt: stamp },
    export: { status: 'pending', percent: 0, updatedAt: stamp }
  }
}

function computeStageStatus(stages: QuestionnaireProgressRecord['stages']) {
  const entries = Object.values(stages)
  const percent = Math.round(entries.reduce((sum, stage) => sum + stage.percent, 0) / entries.length)
  const failed = entries.find((entry) => entry.status === 'failed')
  if (failed) return { status: 'failed', percent }

  const pending = entries.find((entry) => entry.status !== 'completed')
  if (!pending) return { status: 'completed', percent: 100 }

  if (entries.some((entry) => entry.status === 'in_progress')) return { status: 'in_progress', percent }
  if (entries.some((entry) => entry.status === 'queued')) return { status: 'queued', percent }
  return { status: 'pending', percent }
}

export function setProgressStage(
  questionnaireId: string,
  stage: ProgressStage,
  status: StageStatus,
  percent: number,
  error?: string
) {
  const current = questionnaireProgress.get(questionnaireId) ?? {
    percent: 0,
    status: 'pending',
    resumed: false,
    stages: createDefaultStages()
  }

  current.stages[stage] = {
    status,
    percent: Math.max(0, Math.min(100, Math.round(percent))),
    updatedAt: nowIso(),
    ...(error ? { error } : {})
  }

  const summary = computeStageStatus(current.stages)
  current.percent = summary.percent
  current.status = summary.status
  questionnaireProgress.set(questionnaireId, current)
  return current
}

export function getProgress(questionnaireId: string) {
  return questionnaireProgress.get(questionnaireId) ?? null
}

function ensureWorkspaceChunks(workspaceId: string) {
  if (!chunksByWorkspace.has(workspaceId)) {
    chunksByWorkspace.set(workspaceId, [])
  }
  return chunksByWorkspace.get(workspaceId) ?? []
}

function ensureWorkspaceSnippets(workspaceId: string) {
  if (!snippetsByWorkspace.has(workspaceId)) {
    snippetsByWorkspace.set(workspaceId, [])
  }
  return snippetsByWorkspace.get(workspaceId) ?? []
}

export function createDocument(params: {
  workspaceId: string
  name?: string
  docType: string
  frameworkTags?: string[]
  systemTag?: string
  owner: string
  lastUpdated?: string
  expiryDate?: string
  storageKey?: string
  text?: string
}) {
  const id = `doc-${Date.now()}-${randomUUID().slice(0, 8)}`
  const createdAt = nowIso()
  const document: StoredDocument = {
    id,
    workspaceId: params.workspaceId,
    name: params.name ?? `Document ${id}`,
    docType: params.docType,
    owner: params.owner,
    frameworkTags: params.frameworkTags ?? [],
    systemTag: params.systemTag,
    lastUpdated: params.lastUpdated,
    expiryDate: params.expiryDate,
    storageKey: params.storageKey ?? `workspaces/${params.workspaceId}/documents/${id}`,
    text: params.text ?? '',
    createdAt
  }
  documentsById.set(id, document)

  documentExtractionsById.set(id, {
    documentId: id,
    workspaceId: params.workspaceId,
    status: 'queued',
    parserVersion: 'v1.0',
    chunks: 0,
    snippets: 0,
    updatedAt: createdAt
  })

  return document
}

export function createDocumentUploadUrl(params: { workspaceId: string; fileName: string; contentType?: string }) {
  const documentId = `doc-${Date.now()}-${randomUUID().slice(0, 8)}`
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')
  const storageKey = `workspaces/${params.workspaceId}/documents/${documentId}/${safeName}`
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15).toISOString()

  return {
    documentId,
    uploadUrl: `https://example-upload.local/${storageKey}?signature=mocked`,
    storageKey,
    expiresAt,
    contentType: params.contentType ?? 'application/octet-stream'
  }
}

export function getDocument(documentId: string) {
  return documentsById.get(documentId) ?? null
}

export function updateDocumentText(documentId: string, text: string) {
  const document = documentsById.get(documentId)
  if (!document) return null
  document.text = text
  return document
}

export async function processDocumentExtraction(documentId: string) {
  const document = documentsById.get(documentId)
  if (!document) return null

  const extraction = documentExtractionsById.get(documentId)
  if (!extraction) return null

  extraction.status = 'processing'
  extraction.updatedAt = nowIso()

  try {
    const ragDocument: DocumentForRag = {
      id: document.id,
      workspaceId: document.workspaceId,
      name: document.name,
      text: document.text,
      lastUpdated: document.lastUpdated,
      expiryDate: document.expiryDate
    }

    const { chunks, snippets } = await chunkDocument(ragDocument)
    const workspaceChunks = ensureWorkspaceChunks(document.workspaceId)
    const workspaceSnippets = ensureWorkspaceSnippets(document.workspaceId)

    const filteredChunks = workspaceChunks.filter((chunk) => chunk.documentId !== document.id)
    const filteredSnippets = workspaceSnippets.filter((snippet) => snippet.documentId !== document.id)
    chunksByWorkspace.set(document.workspaceId, [...filteredChunks, ...chunks])
    snippetsByWorkspace.set(document.workspaceId, [...filteredSnippets, ...snippets])

    extraction.status = 'completed'
    extraction.chunks = chunks.length
    extraction.snippets = snippets.length
    extraction.updatedAt = nowIso()
  } catch (error) {
    extraction.status = 'failed'
    extraction.failureReason = error instanceof Error ? error.message : 'Unknown extraction error'
    extraction.updatedAt = nowIso()
  }

  return extraction
}

export function getDocumentExtractionStatus(workspaceId: string, documentId: string) {
  const extraction = documentExtractionsById.get(documentId)
  if (!extraction || extraction.workspaceId !== workspaceId) return null
  return extraction
}

export function createQuestionnaire(params: {
  workspaceId: string
  sourceFilename: string
  sourceType: QuestionnaireSourceType
  extractionMode?: 'deterministic' | 'hybrid'
  csvText?: string
  workbookBase64?: string
  rows?: string[][]
}) {
  const id = `qnr-${Date.now()}-${randomUUID().slice(0, 8)}`
  const questionnaire: QuestionnaireRecord = {
    id,
    workspaceId: params.workspaceId,
    sourceFilename: params.sourceFilename,
    sourceType: params.sourceType,
    extractionMode: params.extractionMode ?? 'hybrid',
    csvText: params.csvText,
    workbookBase64: params.workbookBase64,
    sourceRows: params.rows,
    status: 'queued_import',
    version: 1,
    createdAt: nowIso()
  }
  questionnairesById.set(id, questionnaire)

  setProgressStage(id, 'import', 'queued', 5)
  return questionnaire
}

export function getQuestionnaire(questionnaireId: string) {
  return questionnairesById.get(questionnaireId) ?? null
}

function toParseInput(questionnaire: QuestionnaireRecord): QuestionnaireParseInput {
  return {
    questionnaireId: questionnaire.id,
    workspaceId: questionnaire.workspaceId,
    sourceType: questionnaire.sourceType,
    csvText: questionnaire.csvText,
    workbookBase64: questionnaire.workbookBase64,
    rows: questionnaire.sourceRows
  }
}

function fallbackRowsForQuestionnaire(questionnaire: QuestionnaireRecord) {
  if (questionnaire.sourceRows?.length) return questionnaire.sourceRows
  return [
    ['Question', 'Answer', 'Evidence'],
    ['Do you encrypt data at rest and in transit?', '', 'SOC2 3.1'],
    ['Describe vulnerability remediation timelines (maximum 150 words).', '', 'VULN-Policy'],
    ['Is MFA required for privileged access?', '', 'Access Policy']
  ]
}

export async function suggestQuestionnaireMapping(questionnaireId: string) {
  const questionnaire = questionnairesById.get(questionnaireId)
  if (!questionnaire) return null

  setProgressStage(questionnaireId, 'mapping', 'in_progress', 30)
  const deterministic = suggestColumnMapping(toParseInput(questionnaire))

  let suggestion = deterministic.suggestion
  let routeModel: string = MODEL_IDS.mappingPrimary
  let escalated = false

  if (suggestion.confidence < 0.62) {
    const aiSuggestion = await generateJsonOutput<{
      headerRowIndex: number
      questionColumn: string
      answerColumn: string
      evidenceColumn?: string
      confidence: number
      reasoningSummary: string
    }>({
      model: MODEL_IDS.mappingPrimary,
      instructions:
        'Return JSON with the best mapping suggestion for questionnaire columns. Keep confidence between 0 and 1. Use concise reasoning.',
      input: JSON.stringify({
        headers: deterministic.headers,
        firstRows: deterministic.rows.slice(0, 10)
      })
    })

    if (aiSuggestion && aiSuggestion.questionColumn && aiSuggestion.answerColumn) {
      suggestion = {
        questionnaireId,
        headerRowIndex: aiSuggestion.headerRowIndex ?? deterministic.headerRowIndex,
        questionColumn: aiSuggestion.questionColumn,
        answerColumn: aiSuggestion.answerColumn,
        evidenceColumn: aiSuggestion.evidenceColumn,
        confidence: Math.max(0, Math.min(1, aiSuggestion.confidence ?? 0.55)),
        source: 'ai_fallback',
        reasoningSummary: aiSuggestion.reasoningSummary ?? 'AI fallback mapping suggestion generated from header/context rows.'
      }
    } else if (suggestion.confidence < 0.5) {
      routeModel = MODEL_IDS.mappingEscalation
      escalated = true
      suggestion = {
        ...suggestion,
        source: 'ai_fallback',
        confidence: Math.max(suggestion.confidence, 0.52),
        reasoningSummary:
          'Deterministic confidence was low; escalation route selected conservative fallback mapping for manual confirmation.'
      }
    }
  }

  mappingsByQuestionnaire.set(questionnaireId, {
    questionnaireId,
    workspaceId: questionnaire.workspaceId,
    suggestion,
    confirmed: false
  })

  setProgressStage(questionnaireId, 'mapping', 'completed', 100)

  return {
    suggestion,
    parserSummary: {
      rowsParsed: deterministic.rows.length,
      headerRowIndex: deterministic.headerRowIndex,
      parserVersion: 'v1.0'
    },
    modelRoute: {
      flow: 'mapping',
      selectedModel: routeModel,
      escalationModel: MODEL_IDS.mappingEscalation,
      escalated,
      store: false,
      temperature: 0.1
    }
  }
}

export function confirmQuestionnaireMapping(questionnaireId: string, mapping: ColumnMapping) {
  const questionnaire = questionnairesById.get(questionnaireId)
  if (!questionnaire) return null

  const rows = fallbackRowsForQuestionnaire(questionnaire)
  const normalized = normalizeQuestionsFromMapping(rows, mapping, questionnaireId, questionnaire.workspaceId)
  questionsByQuestionnaire.set(questionnaireId, normalized)

  for (const question of normalized) {
    questionIndex.set(question.id, question)
    stateByQuestionId.set(question.id, {
      state: 'drafted',
      changedBy: 'system',
      changedAt: nowIso(),
      lowConfidenceAcknowledged: false
    })
  }

  mappingsByQuestionnaire.set(questionnaireId, {
    questionnaireId,
    workspaceId: questionnaire.workspaceId,
    suggestion: mappingsByQuestionnaire.get(questionnaireId)?.suggestion ?? {
      questionnaireId,
      headerRowIndex: mapping.headerRowIndex,
      questionColumn: mapping.questionColumn,
      answerColumn: mapping.answerColumn,
      confidence: 0.8,
      source: 'deterministic',
      reasoningSummary: 'Mapping manually confirmed by reviewer.'
    },
    confirmed: true,
    confirmedAt: nowIso(),
    confirmedMapping: mapping
  })

  setProgressStage(questionnaireId, 'normalise', 'completed', 100)
  const questionnaireRecord = questionnairesById.get(questionnaireId)
  if (questionnaireRecord) {
    questionnaireRecord.status = 'normalized'
  }

  return {
    questionnaireId,
    normalizedCount: normalized.length,
    mapping
  }
}

export function listQuestionsForQuestionnaire(questionnaireId: string) {
  return questionsByQuestionnaire.get(questionnaireId) ?? []
}

export function getQuestionById(questionId: string) {
  return questionIndex.get(questionId) ?? null
}

function mapChunksForWorkspace(workspaceId: string) {
  const workspaceChunks = chunksByWorkspace.get(workspaceId) ?? []
  return new Map(workspaceChunks.map((chunk) => [chunk.id, chunk]))
}

export async function draftQuestion(question: NormalizedQuestion) {
  const workspaceSnippets = snippetsByWorkspace.get(question.workspaceId) ?? []
  const chunkMap = mapChunksForWorkspace(question.workspaceId)
  const questionEmbedding = await embedText(question.prompt)
  const result = await draftAnswer(question, workspaceSnippets, chunkMap, questionEmbedding)
  const stored: StoredDraft = {
    questionId: question.id,
    questionnaireId: question.questionnaireId,
    workspaceId: question.workspaceId,
    text: result.text,
    citations: result.citations,
    confidenceScore: result.confidenceScore,
    confidenceBand: result.confidenceBand,
    confidenceBreakdown: result.confidenceBreakdown,
    missingInfo: result.missingInfo,
    noEvidenceFound: result.noEvidenceFound,
    issues: result.issues,
    verifierPassed: !result.issues.some((issue) => issue.severity === 'error'),
    routeDecision: result.routeDecision,
    trace: result.trace,
    createdAt: nowIso()
  }

  draftsByQuestionId.set(question.id, stored)
  const currentTraces = tracesByQuestionId.get(question.id) ?? []
  currentTraces.push(result.trace)
  tracesByQuestionId.set(question.id, currentTraces)

  return stored
}

export async function draftQuestionnaire(questionnaireId: string, questionIds?: string[]) {
  const questionnaire = questionnairesById.get(questionnaireId)
  if (!questionnaire) return null

  const questions = (questionsByQuestionnaire.get(questionnaireId) ?? []).filter((question) =>
    questionIds?.length ? questionIds.includes(question.id) : true
  )

  setProgressStage(questionnaireId, 'retrieval', 'in_progress', 25)
  setProgressStage(questionnaireId, 'draft', 'in_progress', 10)

  let high = 0
  let medium = 0
  let low = 0

  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]
    const draft = await draftQuestion(question)

    if (draft.confidenceBand === 'high') high += 1
    else if (draft.confidenceBand === 'medium') medium += 1
    else low += 1

    const progress = Math.round(((index + 1) / Math.max(1, questions.length)) * 100)
    setProgressStage(questionnaireId, 'draft', 'in_progress', progress)
  }

  setProgressStage(questionnaireId, 'retrieval', 'completed', 100)
  setProgressStage(questionnaireId, 'draft', 'completed', 100)

  const verifierFailures = questions
    .map((question) => draftsByQuestionId.get(question.id))
    .filter((draft): draft is StoredDraft => Boolean(draft))
    .filter((draft) => !draft.verifierPassed).length

  setProgressStage(questionnaireId, 'verify', verifierFailures ? 'failed' : 'completed', 100)

  return {
    questionnaireId,
    draftedCount: questions.length,
    confidenceBands: {
      high,
      medium,
      low
    },
    verifierFailures
  }
}

export async function regenerateQuestion(questionId: string) {
  const question = questionIndex.get(questionId)
  if (!question) return null

  const draft = await draftQuestion(question)
  return {
    questionId,
    confidenceBand: draft.confidenceBand,
    confidenceScore: draft.confidenceScore,
    routeDecision: draft.routeDecision
  }
}

export function getDraftByQuestionId(questionId: string) {
  return draftsByQuestionId.get(questionId) ?? null
}

export function getQuestionState(questionId: string) {
  return stateByQuestionId.get(questionId) ?? null
}

export function getDraftDetail(questionId: string) {
  const draft = draftsByQuestionId.get(questionId)
  if (!draft) return null

  return {
    questionId,
    text: draft.text,
    citations: draft.citations,
    confidenceScore: draft.confidenceScore,
    confidenceBand: draft.confidenceBand,
    confidenceBreakdown: draft.confidenceBreakdown,
    verifier: {
      passed: draft.verifierPassed,
      issues: draft.issues
    },
    missingInfo: draft.missingInfo,
    routeDecision: draft.routeDecision,
    trace: draft.trace
  }
}

export function updateQuestionState(params: {
  questionId: string
  state: QuestionStateRecord['state']
  note?: string
  changedBy: string
}) {
  const previous = stateByQuestionId.get(params.questionId)
  const lowConfidenceAcknowledged =
    previous?.lowConfidenceAcknowledged || /acknowledge_low_confidence|ack-low-confidence/i.test(params.note ?? '')

  const next: QuestionStateRecord = {
    state: params.state,
    note: params.note,
    changedBy: params.changedBy,
    changedAt: nowIso(),
    lowConfidenceAcknowledged
  }

  stateByQuestionId.set(params.questionId, next)
  return next
}

export function approveQuestion(params: {
  questionId: string
  approvedBy: string
  comment?: string
  acknowledgeLowConfidence?: boolean
}) {
  const record: ApprovalRecord = {
    questionId: params.questionId,
    approvedBy: params.approvedBy,
    comment: params.comment,
    acknowledgeLowConfidence: params.acknowledgeLowConfidence ?? false,
    approvedAt: nowIso()
  }

  const current = approvalsByQuestionId.get(params.questionId) ?? []
  current.push(record)
  approvalsByQuestionId.set(params.questionId, current)

  return record
}

export function attachCitationToQuestion(params: {
  questionId: string
  snippetId: string
  sentenceIndex?: number
  workspaceId: string
}) {
  const draft = draftsByQuestionId.get(params.questionId)
  if (!draft) return null

  const snippet = (snippetsByWorkspace.get(params.workspaceId) ?? []).find((item) => item.id === params.snippetId)
  if (!snippet) return null

  if (snippet.workspaceId !== draft.workspaceId) {
    return { error: 'workspace_mismatch' as const }
  }

  const nextCitation = {
    snippetId: snippet.id,
    documentId: snippet.documentId,
    chunkId: snippet.chunkId,
    excerpt: snippet.excerpt,
    charStart: snippet.charStart,
    charEnd: snippet.charEnd,
    sentenceIndex: params.sentenceIndex ?? 0,
    relevanceScore: 0.55
  }

  if (!draft.citations.find((citation) => citation.snippetId === nextCitation.snippetId)) {
    draft.citations.push(nextCitation)
  }
  draft.issues = draft.issues.filter((issue) => issue.type !== 'missing_citation')
  draft.verifierPassed = !draft.issues.some((issue) => issue.severity === 'error')

  return { ok: true, citation: nextCitation }
}

export function canExportQuestionnaire(questionnaireId: string) {
  const questions = questionsByQuestionnaire.get(questionnaireId) ?? []
  const blocking: Array<{ questionId: string; reason: string }> = []

  for (const question of questions) {
    const draft = draftsByQuestionId.get(question.id)
    if (!draft) {
      blocking.push({ questionId: question.id, reason: 'No draft exists.' })
      continue
    }

    const state = stateByQuestionId.get(question.id)
    if (!state || state.state !== 'approved') {
      blocking.push({ questionId: question.id, reason: 'Question is not approved.' })
      continue
    }

    if (!draft.verifierPassed) {
      blocking.push({ questionId: question.id, reason: 'Verifier reported unresolved citation/claim issues.' })
      continue
    }

    if (draft.confidenceBand === 'low') {
      const approvals = approvalsByQuestionId.get(question.id) ?? []
      const acknowledged = approvals.some((approval) => approval.acknowledgeLowConfidence)
      if (!acknowledged) {
        blocking.push({ questionId: question.id, reason: 'Low-confidence answer missing explicit acknowledgment.' })
      }
    }
  }

  return {
    ok: blocking.length === 0,
    blocking
  }
}

export function markQuestionnaireExported(questionnaireId: string) {
  const questions = questionsByQuestionnaire.get(questionnaireId) ?? []
  for (const question of questions) {
    updateQuestionState({
      questionId: question.id,
      state: 'exported',
      changedBy: 'system',
      note: 'Exported in final artifact.'
    })
  }

  setProgressStage(questionnaireId, 'export', 'completed', 100)
  const questionnaire = questionnairesById.get(questionnaireId)
  if (questionnaire) {
    questionnaire.status = 'exported'
  }
}

export function listChangedQuestionsSinceLast(_workspaceId: string) {
  return [
    {
      questionId: 'q-102',
      stableKey: 'encryption-at-rest',
      previousUpdatedAt: '2025-11-01T09:20:00Z',
      currentUpdatedAt: '2026-02-14T13:42:00Z',
      changedBy: 'analyst@firm.example'
    }
  ]
}

export function getQuestionWorkspace(questionId: string) {
  const question = questionIndex.get(questionId)
  return question?.workspaceId ?? null
}

export function getQuestionnaireWorkspace(questionnaireId: string) {
  return questionnairesById.get(questionnaireId)?.workspaceId ?? null
}

export function getMapping(questionnaireId: string) {
  return mappingsByQuestionnaire.get(questionnaireId) ?? null
}

export function seedDocumentIfEmpty(workspaceId: string) {
  const hasWorkspaceDocs = [...documentsById.values()].some((doc) => doc.workspaceId === workspaceId)
  if (hasWorkspaceDocs) return

  const seeded = createDocument({
    workspaceId,
    name: 'SOC2 Summary.txt',
    docType: 'Audit Report',
    owner: 'Compliance Lead',
    frameworkTags: ['soc2'],
    text:
      'The organization encrypts data in transit using TLS 1.2+ and at rest using AES-256 controls. Access to production systems requires MFA and role-based controls with quarterly access reviews. Vulnerability remediation is risk-based with documented timelines by severity.'
  })

  void processDocumentExtraction(seeded.id)
}
