'use client'

import { Badge } from '@sqc/ui-catalyst'

export function WorkspaceBadge({ workspaceName }: { workspaceName: string }) {
  return (
    <Badge color="blue" className="shrink-0">
      Active Workspace: {workspaceName}
    </Badge>
  )
}
