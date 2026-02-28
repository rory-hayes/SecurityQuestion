# Security Controls (MVP Baseline)

## Data isolation
- Workspace scoping is enforced at API layer (workspace header + route checks).
- SQL schema enforces row-level security policies keyed by `app.workspace_id`.
- Cross-workspace evidence attachment requires explicit confirmation and audit intent.

## Access controls
- Role model: `org_admin`, `analyst`, `client_approver`, `viewer`.
- Route guards restrict mutation endpoints by role.

## AI safety and governance
- Drafting contract supports citation-first responses and confidence bands.
- Low-confidence and no-evidence states are explicit workflow states.
- Approval endpoint and export gate are modeled for human-in-the-loop governance.

## Auditability
- Immutable event model represented in `audit_log_events`.
- Export and approval records are distinct persisted entities.

## Data handling stance
- No customer training stance documented in landing FAQ and trust style guide.
- Retention/deletion controls are represented in schema and intended as workspace-scoped operations.
