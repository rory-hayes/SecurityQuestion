-- Security Questionnaire Copilot schema (MVP)
-- Postgres 16 + pgvector, with workspace-level row isolation.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE app_role AS ENUM ('org_admin', 'analyst', 'client_approver', 'viewer');
CREATE TYPE question_state AS ENUM ('drafted', 'in_review', 'needs_client_input', 'approved', 'exported');
CREATE TYPE confidence_band AS ENUM ('high', 'medium', 'low');

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  review_cadence TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  owner TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  last_updated DATE,
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE text_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE evidence_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_id UUID NOT NULL REFERENCES text_chunks(id) ON DELETE CASCADE,
  excerpt TEXT NOT NULL,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE answer_library_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  short_answer TEXT,
  medium_answer TEXT,
  long_answer TEXT,
  allowed_boundaries TEXT,
  last_reviewed_by UUID REFERENCES users(id),
  last_reviewed_at TIMESTAMPTZ,
  stale BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE entry_snippet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES answer_library_entries(id) ON DELETE CASCADE,
  snippet_id UUID NOT NULL REFERENCES evidence_snippets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE global_template_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  short_answer TEXT,
  medium_answer TEXT,
  long_answer TEXT,
  approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  source_filename TEXT NOT NULL,
  source_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  stable_key TEXT NOT NULL,
  section_path TEXT[] NOT NULL DEFAULT '{}',
  prompt TEXT NOT NULL,
  response_type TEXT NOT NULL,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  state question_state NOT NULL DEFAULT 'drafted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (questionnaire_id, stable_key)
);

CREATE TABLE answer_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  confidence_band confidence_band NOT NULL,
  no_evidence_found BOOLEAN NOT NULL DEFAULT FALSE,
  missing_info JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_trace_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE approval_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL REFERENCES users(id),
  comment TEXT,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE export_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL REFERENCES questionnaires(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  evidence_pack_key TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_log_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL DEFAULT 'Security Questionnaire Copilot',
  logo_url TEXT,
  accent_hex TEXT NOT NULL DEFAULT '#365EEA',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public_site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT NOT NULL,
  payload JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (section_key, version)
);

CREATE TABLE metric_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-level security helpers.
CREATE SCHEMA IF NOT EXISTS app;
CREATE OR REPLACE FUNCTION app.current_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.workspace_id', true), '')::uuid;
$$;

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_snippets ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_library_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_snippet_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE metric_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation_workspaces ON workspaces
  USING (id = app.current_workspace_id());

CREATE POLICY workspace_isolation_documents ON documents
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_text_chunks ON text_chunks
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_snippets ON evidence_snippets
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_answers ON answer_library_entries
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_entry_links ON entry_snippet_links
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_questionnaires ON questionnaires
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_questions ON questions
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_drafts ON answer_drafts
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_comments ON review_comments
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_assignments ON assignments
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_approvals ON approval_records
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_exports ON export_artifacts
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_audit ON audit_log_events
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_metrics ON metric_events
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

-- RAG orchestration and traceability tables.
CREATE TABLE IF NOT EXISTS document_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  parser_version TEXT NOT NULL,
  failure_reason TEXT,
  chunk_count INTEGER NOT NULL DEFAULT 0,
  snippet_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questionnaire_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  questionnaire_id UUID NOT NULL UNIQUE REFERENCES questionnaires(id) ON DELETE CASCADE,
  suggestion_json JSONB NOT NULL,
  confirmed_mapping_json JSONB,
  confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  confidence NUMERIC(4,3) NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL REFERENCES answer_drafts(id) ON DELETE CASCADE,
  snippet_id UUID NOT NULL REFERENCES evidence_snippets(id) ON DELETE CASCADE,
  sentence_index INTEGER NOT NULL DEFAULT 0,
  relevance_score NUMERIC(5,4) NOT NULL DEFAULT 0,
  char_start INTEGER NOT NULL,
  char_end INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS draft_confidence_breakdowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL UNIQUE REFERENCES answer_drafts(id) ON DELETE CASCADE,
  evidence_coverage NUMERIC(5,4) NOT NULL,
  retrieval_relevance NUMERIC(5,4) NOT NULL,
  evidence_recency NUMERIC(5,4) NOT NULL,
  verifier_pass NUMERIC(5,4) NOT NULL,
  answer_library_alignment NUMERIC(5,4) NOT NULL,
  total_score NUMERIC(5,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  flow TEXT NOT NULL,
  selected_model TEXT NOT NULL,
  escalation_model TEXT,
  escalated BOOLEAN NOT NULL DEFAULT FALSE,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  temperature NUMERIC(4,3) NOT NULL DEFAULT 0.1,
  store BOOLEAN NOT NULL DEFAULT FALSE,
  latency_ms INTEGER NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  request_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS claim_validation_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  draft_id UUID NOT NULL REFERENCES answer_drafts(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  sentence_index INTEGER,
  citation_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE document_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questionnaire_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_confidence_breakdowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_validation_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspace_isolation_document_extractions ON document_extractions
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_questionnaire_mappings ON questionnaire_mappings
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_draft_citations ON draft_citations
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_draft_confidence ON draft_confidence_breakdowns
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_model_traces ON model_traces
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE POLICY workspace_isolation_validation_issues ON claim_validation_issues
  USING (workspace_id = app.current_workspace_id())
  WITH CHECK (workspace_id = app.current_workspace_id());

CREATE INDEX IF NOT EXISTS idx_text_chunks_workspace_document ON text_chunks(workspace_id, document_id);
CREATE INDEX IF NOT EXISTS idx_questions_workspace_questionnaire_stable ON questions(workspace_id, questionnaire_id, stable_key);
CREATE INDEX IF NOT EXISTS idx_draft_citations_question_draft ON draft_citations(question_id, draft_id);
CREATE INDEX IF NOT EXISTS idx_text_chunks_embedding_hnsw ON text_chunks USING hnsw (embedding vector_cosine_ops);
