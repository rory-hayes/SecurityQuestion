'use client'

import {
  Badge,
  Button,
  Heading,
  Subheading,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Text
} from '@sqc/ui-catalyst'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '@/lib/api-client'
import { ensureSeeded, getActiveWorkspaceId, listWorkspaces, onStoreUpdate, setActiveWorkspaceId } from '@/lib/app-store'

function cadenceLabel(months: number) {
  return `${months} months`
}

export default function WorkspacesPage() {
  const [rows, setRows] = useState<ReturnType<typeof listWorkspaces>>([])
  const [activeId, setActiveId] = useState('')
  const [importResult, setImportResult] = useState<string | null>(null)

  useEffect(() => {
    ensureSeeded()
    const refresh = () => {
      setRows(listWorkspaces())
      setActiveId(getActiveWorkspaceId())
    }
    refresh()
    return onStoreUpdate(refresh)
  }, [])

  const activeName = useMemo(() => rows.find((row) => row.id === activeId)?.name ?? 'Active workspace', [rows, activeId])

  async function importTemplate(templateId: string) {
    setImportResult('Importing template...')
    const result = await apiRequest<{
      importedTemplateId: string
      workspaceId: string
      importedAt: string
      auditAction: string
    }>(`/v1/workspaces/${activeId}/templates/global/import`, {
      method: 'POST',
      workspaceId: activeId,
      body: { templateId, explicitConfirmation: true }
    })

    if (!result.ok) {
      setImportResult(result.error ?? 'Template import failed.')
      return
    }

    setImportResult(
      `Template imported to ${activeName} at ${new Date(result.data?.importedAt ?? new Date().toISOString()).toLocaleString()}.`
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Client Workspaces</Heading>
          <Text className="mt-2">Strictly isolated vaults with per-workspace ownership and review cycles.</Text>
        </div>
        <Button href="/app/onboarding/workspace" color="blue">
          New workspace
        </Button>
      </header>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-5">
        <Subheading>Workspace inventory</Subheading>
        <div className="mt-4 overflow-x-auto">
          <Table dense>
            <TableHead>
              <TableRow>
                <TableHeader>Workspace</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Review cadence</TableHeader>
                <TableHeader>Next doc review</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{row.name}</span>
                      {activeId === row.id ? <Badge color="blue">Active</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>{row.ownerEmail}</TableCell>
                  <TableCell>{cadenceLabel(row.reviewCadenceMonths)}</TableCell>
                  <TableCell>{new Date(row.nextReviewAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      outline
                      onClick={() => {
                        setActiveWorkspaceId(row.id)
                        setImportResult(`Active workspace set to ${row.name}.`)
                      }}
                    >
                      Set active
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-950/10 bg-white p-5">
        <Subheading>Global Templates Library</Subheading>
        <Text className="mt-2">
          Templates are marked generic and non-client-specific. Import requires explicit confirmation and is logged.
        </Text>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button outline onClick={() => importTemplate('gt-1')}>
            Import Encryption Template
          </Button>
          <Button color="blue" onClick={() => importTemplate('gt-2')}>
            Import Access Control Template
          </Button>
        </div>
        {importResult ? <Text className="mt-3 text-zinc-700">{importResult}</Text> : null}
      </section>
    </div>
  )
}
