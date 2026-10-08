import { getAPIUrl } from '@services/config/config'

export type LessonState = { answers: Record<string, string>; page: number; revision: number; completed: boolean }
export async function learningAIRequest(activity: string, token: string, method: 'GET' | 'PUT' | 'POST', state?: LessonState, signal?: AbortSignal) {
  const response = await fetch(`${getAPIUrl()}learningai/${encodeURIComponent(activity)}/${method === 'POST' ? 'submit' : 'state'}`, {
    method, signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: state ? JSON.stringify({ answers: state.answers, page: state.page, revision: state.revision }) : undefined,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(response.status === 409 ? 'Your saved work changed. Reload to resume the latest version.' : response.status === 401 ? 'Your session expired. Sign in again before saving.' : data.detail || 'Saving failed. Your changes are not confirmed saved.')
  return data
}
