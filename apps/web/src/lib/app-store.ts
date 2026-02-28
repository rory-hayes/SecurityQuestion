'use client'

export type ReviewCadenceMonths = 3 | 6 | 9 | 12

export type WorkspaceRecord = {
  id: string
  name: string
  ownerEmail: string
  reviewCadenceMonths: ReviewCadenceMonths
  createdAt: string
  nextReviewAt: string
}

export type EvidenceRecord = {
  id: string
  workspaceId: string
  name: string
  docType: string
  owner: string
  createdAt: string
  lastUpdated: string
  nextReviewAt: string
  status: 'queued' | 'ready'
}

export type QuestionnaireRecord = {
  id: string
  workspaceId: string
  fileName: string
  questionColumn: string
  answerColumn: string
  createdAt: string
  status: string
  progress: number
  totalQuestions: number
  needsReviewRows: number
}

export type ReviewRecord = {
  id: string
  question: string
  answer: string
  confidence: 'High' | 'Medium' | 'Low'
  citations: string[]
  state: 'drafted' | 'in_review' | 'needs_client_input' | 'approved'
}

const STORE_EVENT = 'sqc-store-updated'
const WORKSPACES_KEY = 'sqc.workspaces'
const EVIDENCE_KEY = 'sqc.evidence'
const QUESTIONNAIRES_KEY = 'sqc.questionnaires'
const REVIEWS_KEY = 'sqc.reviews'
const ACTIVE_WORKSPACE_KEY = 'sqc.activeWorkspaceId'
const SEEDED_KEY = 'sqc.seeded'

const nowIso = () => new Date().toISOString()

function plusMonths(months: number, from = new Date()) {
  const value = new Date(from)
  value.setMonth(value.getMonth() + months)
  return value.toISOString()
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function emitChange() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(STORE_EVENT))
}

const seedWorkspaces: WorkspaceRecord[] = [
  {
    id: 'ws-acme',
    name: 'Acme Health',
    ownerEmail: 'client.owner@acmehealth.example',
    reviewCadenceMonths: 3,
    createdAt: nowIso(),
    nextReviewAt: plusMonths(3)
  },
  {
    id: 'ws-northwind',
    name: 'Northwind SaaS',
    ownerEmail: 'security@northwind.example',
    reviewCadenceMonths: 6,
    createdAt: nowIso(),
    nextReviewAt: plusMonths(6)
  }
]

const seedEvidence: EvidenceRecord[] = [
  {
    id: 'doc-soc2',
    workspaceId: 'ws-acme',
    name: 'SOC2 Type II Report.pdf',
    docType: 'Audit Report',
    owner: 'Compliance Lead',
    createdAt: nowIso(),
    lastUpdated: nowIso(),
    nextReviewAt: plusMonths(3),
    status: 'ready'
  },
  {
    id: 'doc-irp',
    workspaceId: 'ws-acme',
    name: 'Incident Response Policy.docx',
    docType: 'Policy',
    owner: 'Security Manager',
    createdAt: nowIso(),
    lastUpdated: nowIso(),
    nextReviewAt: plusMonths(3),
    status: 'ready'
  }
]

const seedQuestionnaires: QuestionnaireRecord[] = [
  {
    id: 'Q-8831',
    workspaceId: 'ws-acme',
    fileName: 'Healthcare Buyer RFP.xlsx',
    questionColumn: 'Question',
    answerColumn: 'Answer',
    createdAt: nowIso(),
    status: 'In Review',
    progress: 76,
    totalQuestions: 1184,
    needsReviewRows: 132
  },
  {
    id: 'Q-8826',
    workspaceId: 'ws-northwind',
    fileName: 'Banking Vendor DDQ.xlsx',
    questionColumn: 'Prompt',
    answerColumn: 'Response',
    createdAt: nowIso(),
    status: 'Needs Client Input',
    progress: 63,
    totalQuestions: 920,
    needsReviewRows: 89
  },
  {
    id: 'Q-8809',
    workspaceId: 'ws-acme',
    fileName: 'Procurement Security Form.xlsx',
    questionColumn: 'Security Question',
    answerColumn: 'Supplier Answer',
    createdAt: nowIso(),
    status: 'Approved',
    progress: 100,
    totalQuestions: 611,
    needsReviewRows: 0
  }
]

const seedReviews: ReviewRecord[] = [
  {
    id: 'Q-102',
    question: 'Do you encrypt data at rest and in transit?',
    answer:
      'Data is encrypted in transit using TLS and encrypted at rest using managed key services. Configuration and key rotation are reviewed on a documented cadence.',
    confidence: 'High',
    citations: ['SOC2-3.1', 'POL-ENC-2.4', 'ARCH-SEC-9'],
    state: 'in_review'
  },
  {
    id: 'Q-145',
    question: 'Describe your vulnerability management SLA windows by severity.',
    answer: 'Cannot confirm complete SLA coverage from current evidence. Needs input from client security owner.',
    confidence: 'Low',
    citations: [],
    state: 'needs_client_input'
  }
]

export function ensureSeeded() {
  if (typeof window === 'undefined') return
  if (window.localStorage.getItem(SEEDED_KEY) === 'true') return
  write(WORKSPACES_KEY, seedWorkspaces)
  write(EVIDENCE_KEY, seedEvidence)
  write(QUESTIONNAIRES_KEY, seedQuestionnaires)
  write(REVIEWS_KEY, seedReviews)
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, 'ws-acme')
  window.localStorage.setItem(SEEDED_KEY, 'true')
  emitChange()
}

export function onStoreUpdate(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(STORE_EVENT, callback)
  return () => window.removeEventListener(STORE_EVENT, callback)
}

export function listWorkspaces() {
  return read<WorkspaceRecord[]>(WORKSPACES_KEY, [])
}

export function addWorkspace(workspace: Omit<WorkspaceRecord, 'id' | 'createdAt' | 'nextReviewAt'> & { id?: string }) {
  const record: WorkspaceRecord = {
    id: workspace.id ?? uid('ws'),
    name: workspace.name,
    ownerEmail: workspace.ownerEmail,
    reviewCadenceMonths: workspace.reviewCadenceMonths,
    createdAt: nowIso(),
    nextReviewAt: plusMonths(workspace.reviewCadenceMonths)
  }
  const next = [record, ...listWorkspaces()]
  write(WORKSPACES_KEY, next)
  setActiveWorkspaceId(record.id)
  emitChange()
  return record
}

export function getActiveWorkspaceId() {
  if (typeof window === 'undefined') return 'ws-acme'
  return window.localStorage.getItem(ACTIVE_WORKSPACE_KEY) ?? 'ws-acme'
}

export function setActiveWorkspaceId(id: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  emitChange()
}

export function getActiveWorkspace() {
  const workspaces = listWorkspaces()
  const activeId = getActiveWorkspaceId()
  return workspaces.find((item) => item.id === activeId) ?? workspaces[0] ?? null
}

export function listEvidence(workspaceId = getActiveWorkspaceId()) {
  return read<EvidenceRecord[]>(EVIDENCE_KEY, []).filter((item) => item.workspaceId === workspaceId)
}

export function addEvidence(
  input: Omit<EvidenceRecord, 'id' | 'createdAt' | 'lastUpdated' | 'nextReviewAt'> & { reviewCadenceMonths: number }
) {
  const nextRecord: EvidenceRecord = {
    id: uid('doc'),
    workspaceId: input.workspaceId,
    name: input.name,
    docType: input.docType,
    owner: input.owner,
    status: input.status,
    createdAt: nowIso(),
    lastUpdated: nowIso(),
    nextReviewAt: plusMonths(input.reviewCadenceMonths)
  }
  const next = [nextRecord, ...read<EvidenceRecord[]>(EVIDENCE_KEY, [])]
  write(EVIDENCE_KEY, next)
  emitChange()
  return nextRecord
}

export function markEvidenceReviewed(documentId: string, cadenceMonths: number) {
  const next = read<EvidenceRecord[]>(EVIDENCE_KEY, []).map((item) =>
    item.id === documentId ? { ...item, lastUpdated: nowIso(), nextReviewAt: plusMonths(cadenceMonths) } : item
  )
  write(EVIDENCE_KEY, next)
  emitChange()
}

export function listQuestionnaires(workspaceId = getActiveWorkspaceId()) {
  return read<QuestionnaireRecord[]>(QUESTIONNAIRES_KEY, []).filter((item) => item.workspaceId === workspaceId)
}

export function getQuestionnaireById(id: string) {
  return read<QuestionnaireRecord[]>(QUESTIONNAIRES_KEY, []).find((item) => item.id === id) ?? null
}

export function addQuestionnaire(
  record: Omit<QuestionnaireRecord, 'createdAt' | 'id'> & { id?: string; createdAt?: string }
) {
  const nextRecord: QuestionnaireRecord = {
    ...record,
    id: record.id ?? uid('qnr'),
    createdAt: record.createdAt ?? nowIso()
  }
  const next = [nextRecord, ...read<QuestionnaireRecord[]>(QUESTIONNAIRES_KEY, [])]
  write(QUESTIONNAIRES_KEY, next)
  emitChange()
  return nextRecord
}

export function updateQuestionnaire(id: string, patch: Partial<QuestionnaireRecord>) {
  const next = read<QuestionnaireRecord[]>(QUESTIONNAIRES_KEY, []).map((item) =>
    item.id === id ? { ...item, ...patch } : item
  )
  write(QUESTIONNAIRES_KEY, next)
  emitChange()
}

export function listReviewItems() {
  return read<ReviewRecord[]>(REVIEWS_KEY, [])
}

export function updateReviewItem(id: string, patch: Partial<ReviewRecord>) {
  const next = read<ReviewRecord[]>(REVIEWS_KEY, []).map((item) => (item.id === id ? { ...item, ...patch } : item))
  write(REVIEWS_KEY, next)
  emitChange()
}
