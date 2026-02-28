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

export default function EvidencePage() {
  const [records, setRecords] = useState<ReturnType<typeof listEvidence>>([])
  const [activeWorkspace, setActiveWorkspace] = useState<ReturnType<typeof getActiveWorkspace>>(null)
  const [status, setStatus] = useState<string | null>(null)
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

    const owner = String(form.get('owner') ?? '').trim()
    const docType = String(form.get('docType') ?? 'Policy')
    if (!owner) {
      setStatus('Owner is required.')
      return
    }

    setStatus('Uploading evidence metadata...')

    for (const file of Array.from(files)) {
      const response = await apiRequest<{ documentId: string; createdAt: string; extractedStatus: string }>(
        `/v1/workspaces/${activeWorkspace.id}/documents`,
        {
          method: 'POST',
          workspaceId: activeWorkspace.id,
          body: {
            docType,
            frameworkTags: ['SOC2', 'ISO27001'],
            owner,
            lastUpdated: new Date().toISOString().slice(0, 10)
          }
        }
      )

      if (!response.ok) {
        setStatus(response.error ?? `Upload failed for ${file.name}.`)
        return
      }

      addEvidence({
        workspaceId: activeWorkspace.id,
        name: file.name,
        docType,
        owner,
        status: 'queued',
        reviewCadenceMonths: activeWorkspace.reviewCadenceMonths
      })
    }

    event.currentTarget.reset()
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
                <Input ref={fileRef} type="file" name="files" multiple />
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
