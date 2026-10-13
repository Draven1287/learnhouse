import { afterEach, expect, test } from 'bun:test'
import { ownAccountProfile, saveAccountProfile } from '../services/settings/accountProfile.ts'
const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
test('fills an omitted email only for the authenticated profile owner', () => {
  const self = { id: 4, email: 'fictional@example.com' }
  expect(ownAccountProfile({ id: 4, username: 'fictional' }, self).email).toBe(self.email)
  expect(ownAccountProfile({ id: 5 }, self).email).toBe('')
  expect(ownAccountProfile({ id: 4, email: 'changed@example.com' }, self).email).toBe('changed@example.com')
})
test('rejected profile updates cannot confirm a save', async () => {
  for (const status of [400, 403, 409, 500]) {
    globalThis.fetch = async () => Response.json({ detail: 'Rejected' }, { status })
    await expect(saveAccountProfile({ bio: 'Fictional test' }, 4, 'test-token')).rejects.toThrow('not saved')
  }
})
test('accepted profile update retains the actual authenticated request', async () => {
  let request
  globalThis.fetch = async (url, options) => { request = { url, ...options }; return Response.json({ id: 4 }) }
  expect((await saveAccountProfile({ bio: 'Fictional test' }, 4, 'test-token')).status).toBe(200)
  expect(new Headers(request.headers).get('authorization')).toBe('Bearer test-token')
  expect(JSON.parse(request.body)).toEqual({ bio: 'Fictional test' })
})
