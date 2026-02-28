export type EntityType =
  | 'workspace'
  | 'document'
  | 'questionnaire'
  | 'question'
  | 'answer_draft'
  | 'approval'
  | 'export'

export interface AuditLogEvent {
  id: string
  workspaceId: string
  actorId: string
  entityType: EntityType
  entityId: string
  action: string
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
  at: string
}
