import { Button, Heading, Subheading, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Text } from '@sqc/ui-catalyst'

const workspaceRows = [
  { name: 'Acme Health', owner: 'CISO Team', docs: 48, status: 'Active' },
  { name: 'Northwind SaaS', owner: 'Risk Ops', docs: 31, status: 'Quarterly Review' },
  { name: 'Delta Payments', owner: 'Security Team', docs: 56, status: 'Onboarding' }
]

export default function WorkspacesPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading>Client Workspaces</Heading>
          <Text className="mt-2">Strictly isolated client vaults with per-workspace ownership and review cycles.</Text>
        </div>
        <Button href="/app/onboarding/workspace" color="blue">
          New workspace
        </Button>
      </header>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <Subheading>Workspace inventory</Subheading>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Workspace</TableHeader>
                <TableHeader>Owner</TableHeader>
                <TableHeader>Artifacts</TableHeader>
                <TableHeader>Status</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {workspaceRows.map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.owner}</TableCell>
                  <TableCell>{row.docs}</TableCell>
                  <TableCell>{row.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <Subheading>Global Templates Library</Subheading>
        <Text className="mt-2">
          Templates in this library are marked generic and non-client-specific. Import requires explicit confirmation and
          is logged for audit.
        </Text>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button outline>Review Template Scope</Button>
          <Button color="blue">Import with Confirmation</Button>
        </div>
      </section>
    </div>
  )
}
