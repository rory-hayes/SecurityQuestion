'use client'

import {
  Badge,
  Button,
  Field,
  FieldGroup,
  Fieldset,
  Heading,
  Input,
  Label,
  Select,
  Subheading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text
} from '@sqc/ui-catalyst'
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { apiRequest } from '@/lib/api-client'
import { addQuestionnaire, ensureSeeded, getActiveWorkspace, listQuestionnaires, onStoreUpdate, updateQuestionnaire } from '@/lib/app-store'

type SourceType = 'csv' | 'xlsx' | 'xls'

type ParsedSpreadsheet = {
  sourceType: SourceType
  headerRowIndex: number
  headers: string[]
  rows: string[][]
  previewRows: string[][]
}

function suggestColumn(headers: string[], patterns: RegExp[], fallbackIndex: number) {
  for (const header of headers) {
    if (patterns.some((pattern) => pattern.test(header))) return header
  }
  return headers[fallbackIndex] ?? headers[0] ?? ''
}

function toStringRows(rows: Array<Array<string | number | boolean | null | undefined>>) {
  return rows.map((row) => row.map((cell) => String(cell ?? '').trim()))
}

async function parseSpreadsheet(file: File): Promise<ParsedSpreadsheet | null> {
  const extension = file.name.split('.').pop()?.toLowerCase() as SourceType | undefined
  if (!extension || !['csv', 'xlsx', 'xls'].includes(extension)) return null

  if (extension === 'csv') {
    const text = await file.text()
    const parsedRows = text
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => line.split(',').map((cell) => cell.trim()))

    if (!parsedRows.length) return null
    const headerRowIndex = parsedRows.findIndex((row) => row.some((cell) => cell.length > 0))
    const headers = parsedRows[headerRowIndex] ?? []
    const previewRows = parsedRows.slice(headerRowIndex + 1, headerRowIndex + 6)

    return {
      sourceType: extension,
      headerRowIndex: Math.max(headerRowIndex, 0),
      headers,
      rows: parsedRows,
      previewRows
    }
  }

  const data = await file.arrayBuffer()
  const workbook = XLSX.read(data, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Array<string | number | boolean | null | undefined>>(firstSheet, {
    header: 1,
    defval: ''
  })
  const rows = toStringRows(rawRows)
  if (!rows.length) return null

  const headerRowIndex = rows.findIndex((row) => row.some((cell) => cell.length > 0))
  const headers = rows[headerRowIndex] ?? []
  const previewRows = rows.slice(headerRowIndex + 1, headerRowIndex + 6)

  return {
    sourceType: extension,
    headerRowIndex: Math.max(headerRowIndex, 0),
    headers,
    rows,
    previewRows
  }
}

export default function QuestionnairesPage() {
  const [workspace, setWorkspace] = useState<ReturnType<typeof getActiveWorkspace>>(null)
  const [batches, setBatches] = useState<ReturnType<typeof listQuestionnaires>>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [sheetRows, setSheetRows] = useState<string[][]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [sourceType, setSourceType] = useState<SourceType>('xlsx')
  const [headerRowIndex, setHeaderRowIndex] = useState(0)
  const [selectedQuestionColumn, setSelectedQuestionColumn] = useState('')
  const [selectedAnswerColumn, setSelectedAnswerColumn] = useState('')
  const [suggestedQuestionColumn, setSuggestedQuestionColumn] = useState('')
  const [suggestedAnswerColumn, setSuggestedAnswerColumn] = useState('')
  const [mappingApproved, setMappingApproved] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ensureSeeded()
    const refresh = () => {
      setWorkspace(getActiveWorkspace())
      setBatches(listQuestionnaires())
    }
    refresh()
    return onStoreUpdate(refresh)
  }, [])

  const canNormalise = useMemo(
    () =>
      Boolean(
        workspace &&
          selectedFileName &&
          selectedQuestionColumn &&
          selectedAnswerColumn &&
          mappingApproved &&
          sheetRows.length > 1
      ),
    [workspace, selectedFileName, selectedQuestionColumn, selectedAnswerColumn, mappingApproved, sheetRows]
  )

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMappingApproved(false)
    setStatus(null)
    const file = event.target.files?.[0]
    if (!file) {
      setHeaders([])
      setSheetRows([])
      setPreviewRows([])
      setSelectedFileName('')
      setSelectedQuestionColumn('')
      setSelectedAnswerColumn('')
      setSuggestedQuestionColumn('')
      setSuggestedAnswerColumn('')
      return
    }

    setSelectedFileName(file.name)
    setStatus('Scanning spreadsheet headers...')

    const parsed = await parseSpreadsheet(file)
    if (!parsed || !parsed.headers.length) {
      setStatus('Could not detect headers. Use a spreadsheet with a visible header row and supported type (.xlsx, .xls, .csv).')
      setHeaders([])
      setSheetRows([])
      setPreviewRows([])
      setSelectedQuestionColumn('')
      setSelectedAnswerColumn('')
      setSuggestedQuestionColumn('')
      setSuggestedAnswerColumn('')
      return
    }

    const suggestedQuestion = suggestColumn(parsed.headers, [/question/i, /prompt/i, /requirement/i], 0)
    const suggestedAnswer = suggestColumn(parsed.headers, [/answer/i, /response/i, /supplier/i, /details/i], 1)

    setSourceType(parsed.sourceType)
    setHeaderRowIndex(parsed.headerRowIndex)
    setHeaders(parsed.headers)
    setSheetRows(parsed.rows)
    setPreviewRows(parsed.previewRows)
    setSelectedQuestionColumn(suggestedQuestion)
    setSelectedAnswerColumn(suggestedAnswer)
    setSuggestedQuestionColumn(suggestedQuestion)
    setSuggestedAnswerColumn(suggestedAnswer)
    setStatus(`Detected ${parsed.headers.length} columns. Review mapping and approve before Normalise.`)
  }

  async function normaliseQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !canNormalise) {
      setStatus('Select file, confirm mapping, and ensure an active workspace exists.')
      return
    }
    if (!window.confirm('Normalise this questionnaire now? This will create a new batch and extract questions from the approved mapping.')) {
      return
    }

    setIsSubmitting(true)
    setStatus('Queueing questionnaire import...')

    const importResult = await apiRequest<{ questionnaireId: string; status: string }>(
      `/v1/workspaces/${workspace.id}/questionnaires/import`,
      {
        method: 'POST',
        workspaceId: workspace.id,
        body: {
          sourceFilename: selectedFileName,
          sourceType,
          extractionMode: 'deterministic',
          rows: sheetRows
        }
      }
    )

    if (!importResult.ok || !importResult.data) {
      setStatus(importResult.error ?? 'Import failed.')
      setIsSubmitting(false)
      return
    }

    const mappingResult = await apiRequest<{ questionnaireId: string; normalizedCount: number }>(
      `/v1/workspaces/${workspace.id}/questionnaires/${importResult.data.questionnaireId}/mapping/confirm`,
      {
        method: 'POST',
        workspaceId: workspace.id,
        body: {
          headerRowIndex,
          questionColumn: selectedQuestionColumn,
          answerColumn: selectedAnswerColumn
        }
      }
    )

    if (!mappingResult.ok || !mappingResult.data) {
      setStatus(mappingResult.error ?? 'Mapping confirmation failed.')
      setIsSubmitting(false)
      return
    }

    addQuestionnaire({
      id: importResult.data.questionnaireId,
      workspaceId: workspace.id,
      fileName: selectedFileName,
      questionColumn: selectedQuestionColumn,
      answerColumn: selectedAnswerColumn,
      status: 'Normalized',
      progress: 20,
      totalQuestions: mappingResult.data.normalizedCount,
      needsReviewRows: 0
    })

    setStatus(`Normalised ${mappingResult.data.normalizedCount} questions in batch ${mappingResult.data.questionnaireId}.`)
    setIsSubmitting(false)

    if (fileRef.current) fileRef.current.value = ''
    setSelectedFileName('')
    setHeaders([])
    setSheetRows([])
    setPreviewRows([])
    setSelectedQuestionColumn('')
    setSelectedAnswerColumn('')
    setSuggestedQuestionColumn('')
    setSuggestedAnswerColumn('')
    setMappingApproved(false)
  }

  return (
    <div className="space-y-8">
      <header>
        <Heading>Questionnaire Ingestion</Heading>
        <Text className="mt-2">
          Upload `.xlsx`, `.xls`, or `.csv`, approve suggested column mappings, then run Normalise.
        </Text>
      </header>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Import and mapping approval</Subheading>
        <form className="mt-4 space-y-5" onSubmit={normaliseQuestions}>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label>Questionnaire file</Label>
                <Input ref={fileRef} type="file" name="questionnaire" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
              </Field>
              <Field>
                <Label>Question column (suggested)</Label>
                <Select
                  name="questionColumn"
                  value={selectedQuestionColumn}
                  onChange={(event) => {
                    setSelectedQuestionColumn(event.currentTarget.value)
                    setMappingApproved(false)
                  }}
                  disabled={!headers.length}
                >
                  {headers.length ? (
                    headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))
                  ) : (
                    <option value="">Upload file first</option>
                  )}
                </Select>
              </Field>
              <Field>
                <Label>Answer column (suggested)</Label>
                <Select
                  name="answerColumn"
                  value={selectedAnswerColumn}
                  onChange={(event) => {
                    setSelectedAnswerColumn(event.currentTarget.value)
                    setMappingApproved(false)
                  }}
                  disabled={!headers.length}
                >
                  {headers.length ? (
                    headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))
                  ) : (
                    <option value="">Upload file first</option>
                  )}
                </Select>
              </Field>
            </FieldGroup>
          </Fieldset>

          {headers.length ? (
            <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <Text className="text-sm text-zinc-700">
                Header row: {headerRowIndex + 1}. Suggested mapping: <strong>{suggestedQuestionColumn}</strong> (question) and{' '}
                <strong>{suggestedAnswerColumn}</strong> (answer).
              </Text>
              <div className="overflow-x-auto">
                <Table dense>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader key={header}>{header}</TableHeader>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRows.map((row, rowIndex) => (
                      <TableRow key={`preview-${rowIndex}`}>
                        {headers.map((header, columnIndex) => (
                          <TableCell key={`${header}-${columnIndex}`}>{row[columnIndex] || '-'}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              outline
              type="button"
              disabled={!selectedQuestionColumn || !selectedAnswerColumn}
              onClick={() => {
                setMappingApproved(true)
                setStatus('Mapping approved. You can now run Normalise.')
              }}
            >
              Approve mapping
            </Button>
            <Button
              outline
              type="button"
              disabled={!suggestedQuestionColumn || !suggestedAnswerColumn}
              onClick={() => {
                setSelectedQuestionColumn(suggestedQuestionColumn)
                setSelectedAnswerColumn(suggestedAnswerColumn)
                setMappingApproved(false)
                setStatus('Mapping reset to suggested columns. Re-approve mapping to continue.')
              }}
            >
              Reset to suggestions
            </Button>
            <Button color="blue" type="submit" disabled={!canNormalise || isSubmitting}>
              {isSubmitting ? 'Normalising...' : 'Normalise questions'}
            </Button>
            {mappingApproved ? <Badge color="green">Mapping approved</Badge> : <Badge color="amber">Awaiting mapping approval</Badge>}
          </div>
          <Text className="text-sm text-zinc-600">
            Normalise creates stable question IDs from approved mapping. It does not start drafting automatically.
          </Text>
          {status ? <Text className="text-zinc-700">{status}</Text> : null}
        </form>
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Questionnaire batches</Subheading>
        <div className="mt-4">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Batch ID</TableHeader>
                <TableHeader>File</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Progress</TableHeader>
                <TableHeader>Open</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell>{batch.id}</TableCell>
                  <TableCell>{batch.fileName}</TableCell>
                  <TableCell>{batch.status}</TableCell>
                  <TableCell>{batch.progress}%</TableCell>
                  <TableCell>
                    <Button
                      outline
                      href={`/app/questionnaires/view?questionnaireId=${encodeURIComponent(batch.id)}`}
                      onClick={() => updateQuestionnaire(batch.id, { status: batch.status })}
                    >
                      View details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
