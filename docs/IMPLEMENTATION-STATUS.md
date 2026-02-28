# Implementation Status

## Completed in this scaffold
- Monorepo structure with web/api/worker/shared/ui packages.
- Catalyst UI vendored as shared package and exposed as `@sqc/ui-catalyst`.
- Landing page with fixed trust-first section structure and self-serve signup CTA.
- App shell with Catalyst sidebar/nav and active workspace badge.
- Core pages for dashboard, workspaces, evidence, ingestion, review queue, approvals, exports, and onboarding.
- Fastify API routes for public content, branding settings, workspaces, documents, templates, questionnaires, approvals, evidence attach gate, exports, and progress.
- Queue-backed worker stubs for import/draft/export async jobs.
- Postgres schema with workspace-level RLS and required data entities.
- CI workflow and policy scripts for UI component governance and trust copy checks.
- Initial API and visual regression test scaffolding.

## Remaining implementation work
- Real auth integration for production magic-link flows.
- Persistent DB repository layer replacing in-memory mock stores.
- Actual ingestion/parsing engines for Excel/CSV and export writer preserving template formatting.
- Production RAG pipeline integration with model provider, embeddings, and provenance persistence.
- Evidence pack generation with approved-only artifact filtering.
- Full metrics pipeline and dashboard wiring from live events.
