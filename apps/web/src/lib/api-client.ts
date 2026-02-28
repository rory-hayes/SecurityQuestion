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
  payload: Record<string, unknown> | null
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://security-questionnaire-api.onrender.com'

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<ApiResult<T>> {
  const method = options.method ?? 'GET'
  const hasBody = options.body !== undefined
  try {
    const headers: Record<string, string> = {
      'x-user-id': options.userId ?? 'user-1',
      'x-org-id': options.orgId ?? 'org-default',
      'x-roles': options.roles ?? 'org_admin,analyst',
      ...(options.workspaceId ? { 'x-workspace-id': options.workspaceId } : {})
    }
    if (hasBody) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: hasBody ? JSON.stringify(options.body) : undefined
    })

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>
    const data = (payload.data as T | undefined) ?? null
    const message = typeof payload.message === 'string' ? payload.message : null

    return {
      ok: response.ok,
      status: response.status,
      data,
      error: response.ok ? null : message ?? `Request failed with status ${response.status}`,
      payload
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected request error',
      payload: null
    }
  }
}
