import type { Activity, AppConfig, ChecksResponse, ErrorTag, Page, PageRating, Run, RunReport, RunSummary } from '../shared/types'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init)
  if (!res.ok) {
    let message = `Error ${res.status}`
    try {
      message = ((await res.json()) as { error?: string }).error ?? message
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message)
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

export interface ReviewPatch {
  editedText?: string
  reviewed?: boolean
  rating?: PageRating | null
  tags?: ErrorTag[]
  notes?: string
  exerciseRefs?: string[]
}

export interface UploadResult {
  added: string[]
  rejected: { filename: string; reason: string }[]
}

export interface ExportCheck {
  formulas: number
  failed: { page: string; latex: string; error: string }[]
}

export const api = {
  config: () => req<AppConfig>('/config'),
  corpus: () => req<{ dir: string; activities: Activity[] }>('/corpus'),
  checks: (text: string, exerciseRefs: string[]) => req<ChecksResponse>('/checks', json('POST', { text, exerciseRefs })),
  listRuns: () => req<RunSummary[]>('/runs'),
  getRun: (id: string) => req<Run>(`/runs/${id}`),
  createRun: (name: string, documentLayout: boolean) => req<Run>('/runs', json('POST', { name, documentLayout })),
  deleteRun: (id: string) => req<void>(`/runs/${id}`, { method: 'DELETE' }),
  upload: (id: string, files: File[]) => {
    const form = new FormData()
    files.forEach((f) => form.append('files', f, f.name))
    return req<UploadResult>(`/runs/${id}/pages`, { method: 'POST', body: form })
  },
  retry: (id: string, pid: string) => req<Page>(`/runs/${id}/pages/${pid}/retry`, { method: 'POST' }),
  deletePage: (id: string, pid: string) => req<void>(`/runs/${id}/pages/${pid}`, { method: 'DELETE' }),
  review: (id: string, pid: string, patch: ReviewPatch) => req<Page>(`/runs/${id}/pages/${pid}/review`, json('PATCH', patch)),
  exportCheck: (id: string, source: 'reviewed' | 'original') => req<ExportCheck>(`/runs/${id}/export-check?source=${source}`),
  report: (id: string) => req<RunReport>(`/runs/${id}/report.json`),
  imageUrl: (id: string, pid: string) => `/api/runs/${id}/pages/${pid}/image`,
  rawUrl: (id: string, pid: string) => `/api/runs/${id}/pages/${pid}/raw`,
  docxUrl: (id: string, source: 'reviewed' | 'original', pages?: string[]) =>
    `/api/runs/${id}/export.docx?source=${source}${pages ? `&pages=${pages.join(',')}` : ''}`,
  reportMdUrl: (id: string) => `/api/runs/${id}/report.md`,
}
