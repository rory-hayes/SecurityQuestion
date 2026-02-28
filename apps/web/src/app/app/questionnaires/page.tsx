import { Button, Field, FieldGroup, Fieldset, Heading, Input, Label, Select, Subheading, Text } from '@sqc/ui-catalyst'

export default function QuestionnairesPage() {
  return (
    <div className="space-y-8">
      <header>
        <Heading>Questionnaire Ingestion</Heading>
        <Text className="mt-2">
          Upload Excel or CSV templates, map question and answer columns, and generate normalized question IDs.
        </Text>
      </header>
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <Subheading>Import and map columns</Subheading>
        <Fieldset className="mt-4">
          <FieldGroup>
            <Field>
              <Label>Questionnaire file</Label>
              <Input type="file" name="questionnaire" />
            </Field>
            <Field>
              <Label>Question column</Label>
              <Select name="questionColumn" defaultValue="Question">
                <option>Question</option>
                <option>Prompt</option>
                <option>Security Question</option>
              </Select>
            </Field>
            <Field>
              <Label>Answer column</Label>
              <Select name="answerColumn" defaultValue="Answer">
                <option>Answer</option>
                <option>Response</option>
                <option>Supplier Answer</option>
              </Select>
            </Field>
          </FieldGroup>
        </Fieldset>
        <div className="mt-5 flex gap-3">
          <Button color="blue">Normalize Questions</Button>
          <Button outline>Save Mapping Template</Button>
        </div>
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-6">
        <Subheading>Current batch status</Subheading>
        <ul className="mt-4 space-y-2 text-sm text-zinc-700">
          <li>Rows scanned: 1,184</li>
          <li>Normalized questions: 1,147</li>
          <li>Rows requiring manual review: 37</li>
        </ul>
      </section>
    </div>
  )
}
