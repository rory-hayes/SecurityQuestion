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
import { FormEvent, useEffect, useRef, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import {
  addEvidence,
  ensureSeeded,
  getActiveWorkspace,
  listEvidence,
  markEvidenceReviewed,
  onStoreUpdate
} from '@/lib/app-store'

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'xlsx', 'xls', 'png', 'jpg', 'jpeg']

type UploadPreview = {
  name: string
  size: number
  valid: boolean
  reason?: string
}

function isInlineTextSupported(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension === 'txt' || extension === 'md' || extension === 'csv'
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function EvidencePage() {
  const [records, setRecords] = useState<ReturnType<typeof listEvidence>>([])
  const [activeWorkspace, setActiveWorkspace] = useState<ReturnType<typeof getActiveWorkspace>>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<UploadPreview[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    ensureSeeded()
    const refresh = () => {
      setRecords(listEvidence())
      setActiveWorkspace(getActiveWorkspace())
    }
    refresh()
    return onStoreUpdate(refresh)
  }, [])

  function onFilesSelected() {
    const files = fileRef.current?.files
    if (!files || files.length === 0) {
      setUploadPreview([])
      return
    }

    const nextPreview = Array.from(files).map((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        return {
          name: file.name,
          size: file.size,
          valid: false,
          reason: `Unsupported file type .${extension ?? 'unknown'}`
        }
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return {
          name: file.name,
          size: file.size,
          valid: false,
          reason: 'File exceeds 25 MB limit'
        }
      }
      return {
        name: file.name,
        size: file.size,
        valid: true
      }
    })

    setUploadPreview(nextPreview)

    const invalid = nextPreview.filter((item) => !item.valid)
    if (invalid.length) {
      setStatus(`Resolve ${invalid.length} file validation issue(s) before upload.`)
      return
    }
    setStatus(`${nextPreview.length} file(s) ready. Upload will create evidence records and queue extraction.`)
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeWorkspace) {
      setStatus('No active workspace selected.')
      return
    }

    const form = new FormData(event.currentTarget)
    const files = fileRef.current?.files
    if (!files || files.length === 0) {
      setStatus('Select at least one document to upload.')
      return
    }
    if (uploadPreview.some((item) => !item.valid)) {
      setStatus('One or more selected files are invalid. Fix file type/size issues before uploading.')
      return
    }

    const owner = String(form.get('owner') ?? '').trim()
    const docType = String(form.get('docType') ?? 'Policy')
    if (!owner) {
      setStatus('Owner is required.')
      return
    }
    if (!window.confirm(`Upload ${files.length} evidence file(s) to ${activeWorkspace.name}?`)) {
      setStatus('Upload cancelled.')
      return
    }

    setStatus('Uploading evidence metadata...')

    for (const file of Array.from(files)) {
      const inlineText = isInlineTextSupported(file.name) ? await file.text() : undefined
      const response = await apiRequest<{ documentId: string; createdAt: string; extractedStatus: string }>(
        `/v1/workspaces/${activeWorkspace.id}/documents`,
        {
          method: 'POST',
          workspaceId: activeWorkspace.id,
          body: {
            name: file.name,
            docType,
            frameworkTags: ['SOC2', 'ISO27001'],
            owner,
            lastUpdated: new Date().toISOString().slice(0, 10),
            text: inlineText
          }
        }
      )

      if (!response.ok) {
        setStatus(response.error ?? `Upload failed for ${file.name}.`)
        return
      }

      const processResponse = await apiRequest<{ status: 'queued' | 'processing' | 'completed' | 'failed' }>(
        `/v1/workspaces/${activeWorkspace.id}/documents/${response.data.documentId}/process`,
        {
          method: 'POST',
          workspaceId: activeWorkspace.id,
          body: inlineText ? { text: inlineText } : {}
        }
      )

      if (!processResponse.ok || !processResponse.data) {
        setStatus(processResponse.error ?? `Document extraction failed for ${file.name}.`)
        return
      }

      addEvidence({
        workspaceId: activeWorkspace.id,
        name: file.name,
        docType,
        owner,
        status: processResponse.data.status === 'completed' ? 'ready' : 'queued',
        reviewCadenceMonths: activeWorkspace.reviewCadenceMonths
      })
    }

    event.currentTarget.reset()
    setUploadPreview([])
    setStatus('Evidence uploaded and queued for extraction.')
  }

  return (
    <div className="space-y-6">
      <header>
        <Heading>Evidence Library</Heading>
        <Text className="mt-2">Upload documents, maintain freshness cadences, and keep citation sources review-ready.</Text>
      </header>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Upload evidence</Subheading>
        <form className="mt-4 space-y-4" onSubmit={handleUpload}>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label>Files</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  name="files"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={onFilesSelected}
                />
                <Text className="mt-2 text-xs text-zinc-500">
                  Supported: PDF, Office docs, text, spreadsheet, and common image files. Max size 25 MB per file.
                </Text>
              </Field>
              <Field>
                <Label>Document type</Label>
                <Select name="docType" defaultValue="Policy">
                  <option>Policy</option>
                  <option>Audit Report</option>
                  <option>Certificate</option>
                  <option>Diagram</option>
                </Select>
              </Field>
              <Field>
                <Label>Owner</Label>
                <Input name="owner" defaultValue="Security Manager" />
              </Field>
            </FieldGroup>
          </Fieldset>
          <Button color="blue" type="submit">
            Upload evidence
          </Button>
          {uploadPreview.length ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 uppercase">Upload preview</p>
              <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                {uploadPreview.map((item) => (
                  <li key={item.name} className="flex flex-wrap items-center justify-between gap-2">
                    <span>{item.name}</span>
                    <span className={item.valid ? 'text-zinc-500' : 'text-red-700'}>
                      {formatFileSize(item.size)} {item.valid ? 'ready' : `- ${item.reason}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {status ? <Text className="text-zinc-700">{status}</Text> : null}
        </form>
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Document review schedule</Subheading>
        <div className="mt-4">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Document</TableHeader>
                <TableHeader>Type</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Next review</TableHeader>
                <TableHeader>Action</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.docType}</TableCell>
                  <TableCell>{item.owner}</TableCell>
                  <TableCell>
                    <Badge color={item.status === 'ready' ? 'green' : 'amber'}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(item.nextReviewAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      outline
                      onClick={() => {
                        const cadence = activeWorkspace?.reviewCadenceMonths ?? 3
                        markEvidenceReviewed(item.id, cadence)
                        setStatus(`${item.name} marked reviewed.`)
                      }}
                    >
                      Mark reviewed
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
