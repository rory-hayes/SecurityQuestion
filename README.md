# Security Questionnaire Copilot

Catalyst-first, trust-centric MVP scaffold for multi-client security questionnaire operations.

## What this repository includes
- `apps/web`: Next.js app with Catalyst-based landing page, signup, and core operations screens.
- `apps/api`: Fastify API with public content, branding, workspace, document, questionnaire, approval, template import, and progress endpoints.
- `apps/worker`: BullMQ workers for import, drafting, and export pipelines.
- `packages/ui-catalyst`: Vendored Catalyst UI components from `/Users/rory/Downloads/catalyst-ui-kit`.
- `packages/shared`: Shared domain types for questions, drafts, citations, branding, and audit events.
- `apps/api/db/schema.sql`: Postgres + pgvector schema with workspace RLS policies.
- `docs/TRUST-STYLE-GUIDE.md`: enforced trust copy and UI standards.

## Guardrails implemented
- UI governance check (`scripts/check-ui-imports.mjs`) blocks non-Catalyst UI imports.
- Trust copy lint (`scripts/lint-trust-copy.mjs`) blocks banned high-risk claim phrases.
- API includes workspace scoping checks and explicit confirmation for cross-workspace evidence/template operations.

## Prerequisites
- Node.js 20+
- pnpm 9+
- Redis 7+
- Postgres 16+ with `pgvector`

## Local setup
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm --filter @sqc/web dev
pnpm --filter @sqc/api dev
pnpm --filter @sqc/worker dev
```

Optional environment flags:
- `OPENAI_API_KEY`: enables OpenAI-backed mapping fallback and embeddings.
- `SQC_DISABLE_OPENAI=true`: forces deterministic local fallback behavior.
- `DISABLE_QUEUES=true`: runs API flows without Redis queue usage.

## Key routes
- Web: `/`, `/signup`, `/app`, `/app/workspaces`, `/app/evidence`, `/app/questionnaires`, `/app/review`, `/app/approvals`, `/app/exports`
- API: `/health`, `/v1/auth/magic-link`, `/v1/auth/magic-link/verify`, `/v1/public/pricing`, `/v1/public/faq`, `/v1/orgs/:id/branding`, `/v1/workspaces`, `/v1/workspaces/:id/documents/upload-url`, `/v1/workspaces/:id/documents`, `/v1/workspaces/:id/documents/:documentId/process`, `/v1/workspaces/:id/documents/:documentId/status`, `/v1/workspaces/:id/questions/changed-since-last`, `/v1/workspaces/:id/questionnaires/import`, `/v1/workspaces/:id/questionnaires/parse`, `/v1/workspaces/:id/questionnaires/:questionnaireId/mapping/suggest`, `/v1/workspaces/:id/questionnaires/:questionnaireId/mapping/confirm`, `/v1/questionnaires/:id/questions`, `/v1/questionnaires/:id/draft`, `/v1/questions/:id/regenerate`, `/v1/questions/:id/draft-detail`, `/v1/questions/:id/state`, `/v1/questions/:id/approve`, `/v1/questions/:id/evidence/attach`, `/v1/templates/global`, `/v1/workspaces/:id/templates/global/import`, `/v1/questionnaires/:id/export`, `/v1/questionnaires/:id/progress`

## Tests
- `pnpm lint`: UI governance + trust copy policy checks.
- `pnpm --filter @sqc/api test`: API contract tests for public endpoints and isolation gates.
- `pnpm --filter @sqc/web test`: Playwright visual regression scaffolding.

## Notes
- DOCX/PDF questionnaire ingestion is intentionally not implemented in this MVP scaffold.
- Tailwind Plus/Catalyst commercial license verification is required before production launch.
