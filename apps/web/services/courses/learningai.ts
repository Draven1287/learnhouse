import { getAPIUrl } from '@services/config/config'

export type LessonState = { answers: Record<string, string>; page: number; revision: number; completed: boolean }
export async function learningAIRequest(activity: string, token: string, method: 'GET' | 'PUT' | 'POST', state?: LessonState, signal?: AbortSignal) {
  const unconfirmed = method === 'GET'
    ? 'Could not load your saved work. Reload when the connection is restored.'
    : 'Saving failed. Your changes are not confirmed saved. Try again when the connection is restored.'
  let response: Response
  try {
    response = await fetch(`${getAPIUrl()}learningai/${encodeURIComponent(activity)}/${method === 'POST' ? 'submit' : 'state'}`, {
      method, signal, cache: 'no-store', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: state ? JSON.stringify({ answers: state.answers, page: state.page, revision: state.revision }) : undefined,
    })
  } catch (error) {
    if (signal?.aborted || (error as Error).name === 'AbortError') throw error
    throw new Error(unconfirmed)
  }
  if (response.status === 409) throw new Error('Your saved work changed. Reload to resume the latest version.')
  if (response.status === 401) throw new Error('Your session expired. Sign in again before saving.')
  let data
  try { data = await response.json() } catch (error) {
    if (signal?.aborted || (error as Error).name === 'AbortError') throw error
    throw new Error(unconfirmed)
  }
  if (!response.ok) throw new Error(typeof data?.detail === 'string' ? data.detail : unconfirmed)
  const saved = data?.state
  if (!saved || typeof saved.answers !== 'object' || saved.answers === null || Array.isArray(saved.answers)
    || !Object.values(saved.answers).every(value => typeof value === 'string')
    || !Number.isInteger(saved.page) || saved.page < 0 || !Number.isInteger(saved.revision) || saved.revision < 0 || typeof saved.completed !== 'boolean') {
    throw new Error(unconfirmed)
  }
  return data
}
