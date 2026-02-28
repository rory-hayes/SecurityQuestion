import { createHash } from 'node:crypto'
import type { NormalizedQuestion, QuestionConstraint, QuestionMappingSuggestion, ResponseType } from '@sqc/shared'
import * as XLSX from 'xlsx'

const QUESTION_HEADER_TOKENS = ['question', 'prompt', 'control', 'requirement', 'security question']
const ANSWER_HEADER_TOKENS = ['answer', 'response', 'supplier response', 'our answer', 'comment']
const EVIDENCE_HEADER_TOKENS = ['evidence', 'artifact', 'proof', 'reference']

export type QuestionnaireSourceType = 'csv' | 'xlsx' | 'xls'

export interface QuestionnaireParseInput {
  questionnaireId: string
  workspaceId: string
  sourceType: QuestionnaireSourceType
  csvText?: string
  workbookBase64?: string
  rows?: string[][]
}

export interface ColumnMapping {
  headerRowIndex: number
  questionColumn: string
  answerColumn: string
  evidenceColumn?: string
}

export interface ParsedQuestionnaire {
  rows: string[][]
  headerRowIndex: number
  headers: string[]
  suggestion: QuestionMappingSuggestion
}

function normalizeCell(value: unknown) {
  if (value == null) return ''
  return String(value).trim()
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function parseCsvRow(row: string) {
  const values: string[] = []
  let current = ''
  let inQuote = false

  for (let index = 0; index < row.length; index += 1) {
    const char = row[index]
    const next = row[index + 1]

    if (char === '"') {
      if (inQuote && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuote = !inQuote
      }
      continue
    }

    if (char === ',' && !inQuote) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseCsvText(text: string) {
  return text
    .split(/\r?\n/)
    .filter((row) => row.trim().length > 0)
    .map(parseCsvRow)
}

function parseWorkbookBase64(base64: string) {
  const workbook = XLSX.read(base64, { type: 'base64' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  const firstSheet = workbook.Sheets[firstSheetName]
  return XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' }) as string[][]
}

export function parseQuestionnaireRows(input: QuestionnaireParseInput): string[][] {
  if (input.rows?.length) {
    return input.rows.map((row) => row.map(normalizeCell))
  }

  if (input.sourceType === 'csv') {
    if (!input.csvText) return []
    return parseCsvText(input.csvText).map((row) => row.map(normalizeCell))
  }

  if ((input.sourceType === 'xlsx' || input.sourceType === 'xls') && input.workbookBase64) {
    return parseWorkbookBase64(input.workbookBase64).map((row) => row.map(normalizeCell))
  }

  return []
}

function lexicalHitScore(value: string, tokens: string[]) {
  const normalized = normalizeText(value)
  return tokens.reduce((score, token) => (normalized.includes(token) ? score + 1 : score), 0)
}

function rowHeaderLikelihood(row: string[]) {
  return row.reduce((score, cell) => {
    const normalized = normalizeText(cell)
    if (!normalized) return score
    return (
      score +
      lexicalHitScore(normalized, QUESTION_HEADER_TOKENS) +
      lexicalHitScore(normalized, ANSWER_HEADER_TOKENS) +
      lexicalHitScore(normalized, EVIDENCE_HEADER_TOKENS)
    )
  }, 0)
}

function detectHeaderRow(rows: string[][]) {
  const maxRows = Math.min(12, rows.length)
  let bestRow = 0
  let bestScore = -1

  for (let index = 0; index < maxRows; index += 1) {
    const score = rowHeaderLikelihood(rows[index] ?? [])
    if (score > bestScore) {
      bestScore = score
      bestRow = index
    }
  }

  return bestRow
}

function averageQuestionSignal(values: string[]) {
  if (!values.length) return 0
  const nonEmpty = values.filter(Boolean)
  if (!nonEmpty.length) return 0
  const interrogativeCount = nonEmpty.filter((value) => /\?$/.test(value.trim())).length
  const longFormCount = nonEmpty.filter((value) => value.length > 48).length
  return interrogativeCount / nonEmpty.length + 0.4 * (longFormCount / nonEmpty.length)
}

function averageAnswerSignal(values: string[]) {
  if (!values.length) return 0
  const nonEmpty = values.filter(Boolean)
  const blankRatio = 1 - nonEmpty.length / values.length
  const shortAnswers = nonEmpty.filter((value) => value.length > 0 && value.length < 80).length
  return 0.6 * blankRatio + 0.4 * (nonEmpty.length ? shortAnswers / nonEmpty.length : 0)
}

function toColumnName(index: number) {
  let column = ''
  let value = index + 1
  while (value > 0) {
    const remainder = (value - 1) % 26
    column = String.fromCharCode(65 + remainder) + column
    value = Math.floor((value - 1) / 26)
  }
  return column
}

function scoreColumns(headers: string[], dataRows: string[][]) {
  const width = headers.length
  let questionBest = { index: 0, score: -1 }
  let answerBest = { index: Math.min(1, Math.max(0, width - 1)), score: -1 }
  let evidenceBest = { index: -1, score: -1 }

  for (let column = 0; column < width; column += 1) {
    const header = headers[column] ?? ''
    const columnValues = dataRows.map((row) => normalizeCell(row[column] ?? ''))

    const questionScore =
      1.2 * lexicalHitScore(header, QUESTION_HEADER_TOKENS) + averageQuestionSignal(columnValues)
    if (questionScore > questionBest.score) {
      questionBest = { index: column, score: questionScore }
    }

    const answerScore = 1.2 * lexicalHitScore(header, ANSWER_HEADER_TOKENS) + averageAnswerSignal(columnValues)
    if (answerScore > answerBest.score) {
      answerBest = { index: column, score: answerScore }
    }

    const evidenceScore = lexicalHitScore(header, EVIDENCE_HEADER_TOKENS)
    if (evidenceScore > evidenceBest.score) {
      evidenceBest = { index: column, score: evidenceScore }
    }
  }

  if (answerBest.index === questionBest.index) {
    answerBest = {
      index: headers.findIndex((_, idx) => idx !== questionBest.index && idx >= 0),
      score: answerBest.score * 0.6
    }
    if (answerBest.index < 0) {
      answerBest = { index: questionBest.index, score: answerBest.score * 0.5 }
    }
  }

  const combined = Math.max(0.35, Math.min(0.96, 0.5 + 0.12 * (questionBest.score + answerBest.score)))
  return {
    questionIndex: questionBest.index,
    answerIndex: answerBest.index,
    evidenceIndex: evidenceBest.score > 0 ? evidenceBest.index : undefined,
    confidence: Number(combined.toFixed(3))
  }
}

export function suggestColumnMapping(input: QuestionnaireParseInput): ParsedQuestionnaire {
  const rows = parseQuestionnaireRows(input)
  if (!rows.length) {
    return {
      rows: [],
      headerRowIndex: 0,
      headers: [],
      suggestion: {
        questionnaireId: input.questionnaireId,
        headerRowIndex: 0,
        questionColumn: 'A',
        answerColumn: 'B',
        confidence: 0.1,
        source: 'deterministic',
        reasoningSummary: 'No parseable rows were found; fallback mapping defaults to columns A/B.'
      }
    }
  }

  const headerRowIndex = detectHeaderRow(rows)
  const headerRow = rows[headerRowIndex] ?? []
  const headers = headerRow.map((cell, index) => cell || toColumnName(index))
  const dataRows = rows.slice(headerRowIndex + 1).filter((row) => row.some((cell) => cell.trim().length > 0))
  const scored = scoreColumns(headers, dataRows)

  const suggestion: QuestionMappingSuggestion = {
    questionnaireId: input.questionnaireId,
    headerRowIndex,
    questionColumn: headers[scored.questionIndex] ?? toColumnName(scored.questionIndex),
    answerColumn: headers[scored.answerIndex] ?? toColumnName(scored.answerIndex),
    evidenceColumn:
      scored.evidenceIndex != null ? headers[scored.evidenceIndex] ?? toColumnName(scored.evidenceIndex) : undefined,
    confidence: scored.confidence,
    source: 'deterministic',
    reasoningSummary: `Header row ${headerRowIndex + 1} selected by lexical signal; question/answer columns ranked by header semantics and row-pattern heuristics.`
  }

  return {
    rows,
    headerRowIndex,
    headers,
    suggestion
  }
}

function detectResponseType(prompt: string): ResponseType {
  const value = normalizeText(prompt)
  if (!value) return 'unknown'
  if (/\b(yes\/no|yes or no|true\/false)\b/.test(value)) return 'yes_no'
  if (/\b(select|choose|tick all|multi-select|check all)\b/.test(value)) return 'multi_select'
  if (/\b(describe|explain|details|detail)\b/.test(value) || value.length > 240) return 'long_text'
  if (value.length <= 40) return 'short_text'
  return 'short_text'
}

function detectConstraints(prompt: string): QuestionConstraint {
  const value = prompt.trim()
  const wordLimitMatch = value.match(/\b(\d{2,4})\s*(words?|chars?|characters?)\b/i)
  const constraints: QuestionConstraint = {}
  if (wordLimitMatch) {
    constraints.wordLimit = Number(wordLimitMatch[1])
  }

  if (/\b(evidence|required|attach|artifact|reference)\b/i.test(value)) {
    constraints.requiresEvidence = true
  }

  if (/\b(yes\/no|yes or no|true\/false)\b/i.test(value)) {
    constraints.allowedOptions = ['Yes', 'No']
    constraints.formatHint = 'yes_no'
  }

  return constraints
}

function stableKey(prompt: string, sectionPath: string[], responseType: ResponseType) {
  return createHash('sha1').update(`${prompt}::${sectionPath.join('>')}::${responseType}`).digest('hex').slice(0, 24)
}

function columnIndexByName(headers: string[], name: string) {
  const normalizedName = normalizeText(name)
  const direct = headers.findIndex((header) => normalizeText(header) === normalizedName)
  if (direct >= 0) return direct
  const fallback = headers.findIndex((header) => normalizeText(header).includes(normalizedName))
  if (fallback >= 0) return fallback
  const byColumnLetters = name.match(/^[A-Z]+$/i)
  if (!byColumnLetters) return -1
  let value = 0
  for (const char of name.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64)
  }
  return value - 1
}

export function normalizeQuestionsFromMapping(
  rows: string[][],
  mapping: ColumnMapping,
  questionnaireId: string,
  workspaceId: string
): NormalizedQuestion[] {
  const headerRow = rows[mapping.headerRowIndex] ?? []
  const headers = headerRow.map((cell, index) => cell || toColumnName(index))
  const questionColumnIndex = columnIndexByName(headers, mapping.questionColumn)
  const answerColumnIndex = columnIndexByName(headers, mapping.answerColumn)
  const bodyRows = rows.slice(mapping.headerRowIndex + 1)
  const normalized: NormalizedQuestion[] = []

  for (let rowIndex = 0; rowIndex < bodyRows.length; rowIndex += 1) {
    const row = bodyRows[rowIndex]
    const prompt = normalizeCell(row[questionColumnIndex] ?? '')
    if (!prompt || prompt.length < 4) continue

    const responseType = detectResponseType(prompt)
    const constraints = detectConstraints(prompt)
    const stable = stableKey(prompt, [], responseType)

    normalized.push({
      id: `q-${questionnaireId}-${rowIndex + 1}`,
      questionnaireId,
      workspaceId,
      sectionPath: [],
      prompt,
      responseType,
      constraints,
      stableKey: stable
    })

    if (answerColumnIndex >= 0) {
      // Intentionally reading answer column for parser confidence parity; stored answer import is out of scope in v1.
      normalizeCell(row[answerColumnIndex] ?? '')
    }
  }

  return normalized
}
