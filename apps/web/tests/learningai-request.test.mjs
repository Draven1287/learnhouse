import { afterEach, expect, test } from 'bun:test'
import { learningAIRequest } from '../services/courses/learningai.ts'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const state = { answers: { reflection: 'Practice reasoning' }, page: 0, revision: 1, completed: false }

test('saves through authenticated API and omits client completion claims', async () => {
  let request
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return Response.json({ state }) }
  expect(await learningAIRequest('activity/a', 'session-token', 'PUT', state)).toEqual({ state })
  expect(request.url).toContain('learningai/activity%2Fa/state')
  expect(request.headers.Authorization).toBe('Bearer session-token')
  expect(JSON.parse(request.body)).toEqual({ answers: state.answers, page: 0, revision: 1 })
})
test('network outage never confirms a save', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await expect(learningAIRequest('a', 't', 'PUT', state)).rejects.toThrow('not confirmed saved')
})
test('load outage describes loading saved work, not a failed save', async () => {
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  await expect(learningAIRequest('a', 't', 'GET')).rejects.toThrow('Could not load your saved work')
})
test('HTML proxy outage gets a recoverable message', async () => {
  globalThis.fetch = async () => new Response('<html>Bad Gateway</html>', { status: 502 })
  await expect(learningAIRequest('a', 't', 'PUT', state)).rejects.toThrow('not confirmed saved')
})
test('conflict and expired session remain actionable even with non-JSON bodies', async () => {
  for (const [status, message] of [[409, 'Reload to resume'], [401, 'Sign in again']]) {
    globalThis.fetch = async () => new Response('', { status })
    await expect(learningAIRequest('a', 't', 'PUT', state)).rejects.toThrow(message)
  }
})
test('malformed successful response cannot be treated as saved work', async () => {
  for (const body of [{}, { state: { ...state, answers: [] } }, { state: { ...state, revision: '1' } }, { state: { ...state, page: -1 } }]) {
    globalThis.fetch = async () => Response.json(body)
    await expect(learningAIRequest('a', 't', 'PUT', state)).rejects.toThrow('not confirmed saved')
  }
})
test('session cancellation keeps its abort error and signal', async () => {
  const controller = new AbortController()
  const error = new DOMException('Cancelled', 'AbortError')
  globalThis.fetch = async (_, options) => { expect(options.signal).toBe(controller.signal); throw error }
  await expect(learningAIRequest('a', 't', 'GET', undefined, controller.signal)).rejects.toBe(error)
})
