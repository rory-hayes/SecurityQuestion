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

export default function WorkspaceOnboardingPage() {
  return (
    <div className="space-y-8">
      <header>
        <Heading>Create Client Workspace</Heading>
        <Text className="mt-2">Set up an isolated client vault, assign ownership, and define review cadence.</Text>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <Subheading>Workspace configuration</Subheading>
        <Fieldset className="mt-4">
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
              <Label>Review cadence</Label>
              <Select name="reviewCadence" defaultValue="quarterly">
                <option value="quarterly">Quarterly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field>
              <Label>Initial evidence notes</Label>
              <Textarea name="evidenceNotes" />
            </Field>
          </FieldGroup>
        </Fieldset>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button color="blue">Create workspace</Button>
          <Button outline href="/app/workspaces">
            Cancel
          </Button>
        </div>
      </section>
    </div>
  )
}
