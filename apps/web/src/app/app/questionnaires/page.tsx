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
import {
  addQuestionnaire,
  ensureSeeded,
  getActiveWorkspace,
  listQuestionnaires,
  onStoreUpdate,
  updateQuestionnaire
} from '@/lib/app-store'

function suggestColumn(headers: string[], patterns: RegExp[], fallbackIndex: number) {
  for (const header of headers) {
    if (patterns.some((pattern) => pattern.test(header))) return header
  }
  return headers[fallbackIndex] ?? headers[0] ?? ''
}

async function parseHeaders(file: File): Promise<string[]> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  if (extension === 'csv') {
    const text = await file.text()
    const firstLine = text
      .split(/\r?\n/)
      .find((line) => line.trim().length > 0)
      ?.trim()
    if (!firstLine) return []
    return firstLine.split(',').map((value) => value.trim()).filter(Boolean)
  }

  if (extension === 'xlsx' || extension === 'xls') {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(firstSheet, {
      header: 1,
      defval: ''
    })
    const headerRow = rows.find((row) => row.some((cell) => String(cell).trim().length > 0)) ?? []
    return headerRow.map((cell) => String(cell).trim()).filter(Boolean)
  }

  return []
}

export default function QuestionnairesPage() {
  const [workspace, setWorkspace] = useState<ReturnType<typeof getActiveWorkspace>>(null)
  const [batches, setBatches] = useState<ReturnType<typeof listQuestionnaires>>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [selectedQuestionColumn, setSelectedQuestionColumn] = useState('')
  const [selectedAnswerColumn, setSelectedAnswerColumn] = useState('')
  const [mappingApproved, setMappingApproved] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
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
    () => Boolean(workspace && selectedFileName && selectedQuestionColumn && selectedAnswerColumn && mappingApproved),
    [workspace, selectedFileName, selectedQuestionColumn, selectedAnswerColumn, mappingApproved]
  )

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setMappingApproved(false)
    setStatus(null)
    const file = event.target.files?.[0]
    if (!file) {
      setHeaders([])
      setSelectedFileName('')
      setSelectedQuestionColumn('')
      setSelectedAnswerColumn('')
      return
    }

    setSelectedFileName(file.name)
    setStatus('Scanning spreadsheet headers...')

    const nextHeaders = await parseHeaders(file)
    setHeaders(nextHeaders)

    if (!nextHeaders.length) {
      setStatus('Could not detect headers. Use a spreadsheet with a visible header row.')
      setSelectedQuestionColumn('')
      setSelectedAnswerColumn('')
      return
    }

    const suggestedQuestion = suggestColumn(nextHeaders, [/question/i, /prompt/i, /requirement/i], 0)
    const suggestedAnswer = suggestColumn(nextHeaders, [/answer/i, /response/i, /supplier/i, /details/i], 1)

    setSelectedQuestionColumn(suggestedQuestion)
    setSelectedAnswerColumn(suggestedAnswer)
    setStatus(`Detected ${nextHeaders.length} columns. Review and approve mapping.`)
  }

  async function normaliseQuestions(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!workspace || !canNormalise) {
      setStatus('Select file, confirm mapping, and ensure an active workspace exists.')
      return
    }

    setStatus('Queueing questionnaire import...')

    const importResult = await apiRequest<{ questionnaireId: string; status: string }>(
      `/v1/workspaces/${workspace.id}/questionnaires/import`,
      {
        method: 'POST',
        workspaceId: workspace.id,
        body: {}
      }
    )

    if (!importResult.ok || !importResult.data) {
      setStatus(importResult.error ?? 'Import failed.')
      return
    }

    addQuestionnaire({
      id: importResult.data.questionnaireId,
      workspaceId: workspace.id,
      fileName: selectedFileName,
      questionColumn: selectedQuestionColumn,
      answerColumn: selectedAnswerColumn,
      status: 'Queued',
      progress: 5,
      totalQuestions: 0,
      needsReviewRows: 0
    })

    setStatus(`Questionnaire queued as ${importResult.data.questionnaireId}.`)

    if (fileRef.current) fileRef.current.value = ''
    setSelectedFileName('')
    setHeaders([])
    setSelectedQuestionColumn('')
    setSelectedAnswerColumn('')
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
                <Input ref={fileRef} type="file" name="questionnaire" onChange={onFileChange} />
              </Field>
              <Field>
                <Label>Question column (suggested)</Label>
                <Select
                  name="questionColumn"
                  value={selectedQuestionColumn}
                  onChange={(event) => setSelectedQuestionColumn(event.currentTarget.value)}
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
                  onChange={(event) => setSelectedAnswerColumn(event.currentTarget.value)}
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
            <Button color="blue" type="submit" disabled={!canNormalise}>
              Normalise questions
            </Button>
            {mappingApproved ? <Badge color="green">Mapping approved</Badge> : <Badge color="amber">Awaiting mapping approval</Badge>}
          </div>
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
