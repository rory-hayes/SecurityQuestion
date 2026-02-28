'use client'

import {
  Button,
  Field,
  FieldGroup,
  Fieldset,
  Heading,
  Input,
  Label,
  Select,
  Subheading,
  Text,
  Textarea
} from '@sqc/ui-catalyst'
import { FormEvent, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { addEvidence, addWorkspace } from '@/lib/app-store'
import { apiRequest } from '@/lib/api-client'

function toApiCadence(months: number): 'monthly' | 'quarterly' | 'custom' {
  if (months === 3) return 'quarterly'
  if (months === 1) return 'monthly'
  return 'custom'
}

export default function WorkspaceOnboardingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    const clientName = String(form.get('clientName') ?? '').trim()
    const approverEmail = String(form.get('approverEmail') ?? '').trim()
    const reviewCadenceMonths = Number(form.get('reviewCadenceMonths') ?? 3) as 3 | 6 | 9 | 12
    const evidenceNotes = String(form.get('evidenceNotes') ?? '').trim()

    if (!clientName || !approverEmail) {
      setStatus('Client name and primary approver email are required.')
      return
    }

    setIsSubmitting(true)
    setStatus('Creating workspace...')

    const createResult = await apiRequest<{ id: string; createdAt: string }>(`/v1/workspaces`, {
      method: 'POST',
      body: {
        name: clientName,
        ownerEmail: approverEmail,
        reviewCadence: toApiCadence(reviewCadenceMonths)
      }
    })

    if (!createResult.ok || !createResult.data) {
      setStatus(createResult.error ?? 'Workspace creation failed.')
      setIsSubmitting(false)
      return
    }

    const workspace = addWorkspace({
      id: createResult.data.id,
      name: clientName,
      ownerEmail: approverEmail,
      reviewCadenceMonths
    })

    const files = fileRef.current?.files
    if (files && files.length > 0) {
      setStatus('Uploading knowledge base metadata...')
      for (const file of Array.from(files)) {
        const docResult = await apiRequest<{ documentId: string }>(`/v1/workspaces/${workspace.id}/documents`, {
          method: 'POST',
          workspaceId: workspace.id,
          body: {
            docType: 'Policy',
            frameworkTags: ['SOC2'],
            owner: approverEmail,
            lastUpdated: new Date().toISOString().slice(0, 10)
          }
        })

        if (!docResult.ok) {
          setStatus(docResult.error ?? `Failed to upload ${file.name}.`)
          setIsSubmitting(false)
          return
        }

        addEvidence({
          workspaceId: workspace.id,
          name: file.name,
          docType: 'Policy',
          owner: approverEmail,
          status: 'queued',
          reviewCadenceMonths
        })
      }
    }

    setStatus(
      `Workspace created. Document review reminders will run every ${reviewCadenceMonths} months.${
        evidenceNotes ? ` Notes saved: ${evidenceNotes}` : ''
      }`
    )
    setIsSubmitting(false)
    router.push('/app/workspaces')
  }

  return (
    <div className="space-y-8">
      <header>
        <Heading>Create Client Workspace</Heading>
        <Text className="mt-2">Set up an isolated vault, upload initial knowledge base files, and define review cadence.</Text>
      </header>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-6">
        <Subheading>Workspace and onboarding configuration</Subheading>
        <form className="mt-4 space-y-6" onSubmit={onSubmit}>
          <Fieldset>
            <FieldGroup>
              <Field>
                <Label>Client name</Label>
                <Input name="clientName" required />
              </Field>
              <Field>
                <Label>Primary approver email</Label>
                <Input name="approverEmail" type="email" required />
              </Field>
              <Field>
                <Label>Document review reminder cadence</Label>
                <Select name="reviewCadenceMonths" defaultValue="3">
                  <option value="3">Every 3 months</option>
                  <option value="6">Every 6 months</option>
                  <option value="9">Every 9 months</option>
                  <option value="12">Every 12 months</option>
                </Select>
              </Field>
              <Field>
                <Label>Knowledge base files</Label>
                <Input ref={fileRef} name="knowledgeBase" type="file" multiple />
              </Field>
              <Field>
                <Label>Initial evidence notes</Label>
                <Textarea name="evidenceNotes" defaultValue="Upload core policies and latest attestations first." />
              </Field>
            </FieldGroup>
          </Fieldset>
          <div className="flex flex-wrap gap-3">
            <Button color="blue" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
            </Button>
            <Button outline href="/app/workspaces">
              Cancel
            </Button>
          </div>
          {status ? <Text className="text-zinc-700">{status}</Text> : null}
        </form>
      </section>
    </div>
  )
}
