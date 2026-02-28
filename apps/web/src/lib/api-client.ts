'use client'

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: unknown
  workspaceId?: string
  roles?: string
  userId?: string
  orgId?: string
}

export type ApiResult<T> = {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://security-questionnaire-api.onrender.com'

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? 'GET'
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': options.userId ?? 'user-1',
        'x-org-id': options.orgId ?? 'org-default',
        'x-roles': options.roles ?? 'org_admin,analyst',
        ...(options.workspaceId ? { 'x-workspace-id': options.workspaceId } : {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    })

    const payload = (await response.json().catch(() => ({}))) as { data?: T; message?: string }
    return {
      ok: response.ok,
      status: response.status,
      data: payload.data ?? null,
      error: response.ok ? null : payload.message ?? `Request failed with status ${response.status}`
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected request error'
    }
  }
}
