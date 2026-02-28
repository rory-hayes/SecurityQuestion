# API Contracts (MVP)

## Public content
- `GET /v1/public/pricing` -> `{ data: PublicPricingTier[] }`
- `GET /v1/public/faq` -> `{ data: PublicFaqItem[] }`

## Auth
- `POST /v1/auth/magic-link`
  - input: `{ email, organizationName }`
  - output: `{ data: { status, email, organizationName, requestId } }`
- `POST /v1/auth/magic-link/verify`
  - input: `{ token }`
  - output: `{ data: { sessionToken, userId, orgId } }`

## Branding
- `GET /v1/orgs/:id/branding`
- `PATCH /v1/orgs/:id/branding`
  - input: `{ productName?, logoUrl?, accentHex? }`

## Workspaces and evidence
- `POST /v1/workspaces`
  - input: `{ name, ownerEmail, reviewCadence }`
- `POST /v1/workspaces/:id/documents/upload-url`
  - input: `{ fileName, contentType? }`
- `POST /v1/workspaces/:id/documents`
  - input: `{ name?, docType, frameworkTags[], systemTag?, owner, storageKey?, text?, lastUpdated?, expiryDate? }`
- `POST /v1/workspaces/:id/documents/:documentId/process`
  - input: `{ text? }`
- `GET /v1/workspaces/:id/documents/:documentId/status`

## Questionnaire workflow
- `GET /v1/workspaces/:id/questions/changed-since-last`
- `POST /v1/workspaces/:id/questionnaires/import` -> queue import
  - input: `{ sourceFilename, sourceType, extractionMode, csvText?, workbookBase64?, rows? }`
- `POST /v1/workspaces/:id/questionnaires/parse`
  - input: `{ questionnaireId? ...source fields }`
- `POST /v1/workspaces/:id/questionnaires/:questionnaireId/mapping/suggest`
- `POST /v1/workspaces/:id/questionnaires/:questionnaireId/mapping/confirm`
  - input: `{ headerRowIndex, questionColumn, answerColumn, evidenceColumn? }`
- `GET /v1/questionnaires/:id/questions`
- `POST /v1/questionnaires/:id/draft` -> queue drafting + verifier checks
  - input: `{ mode, questionIds?, modelRouteMode }`
- `POST /v1/questions/:id/regenerate`
- `GET /v1/questions/:id/draft-detail`
- `PATCH /v1/questions/:id/state` -> update review state
- `POST /v1/questions/:id/approve` -> approval record
  - input: `{ approvedBy, comment?, acknowledgeLowConfidence }`
- `POST /v1/questions/:id/evidence/attach` -> explicit cross-workspace confirmation required on mismatch
- `POST /v1/questionnaires/:id/export` -> queue export
  - strict gate: blocks low-confidence exports without explicit acknowledgement and unresolved verifier issues
- `GET /v1/questionnaires/:id/progress` -> resumable progress snapshot

## Global templates
- `GET /v1/templates/global`
- `POST /v1/workspaces/:id/templates/global/import`
  - input: `{ templateId, explicitConfirmation }`
  - explicit confirmation is mandatory.
