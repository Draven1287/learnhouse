import { expect, test } from 'bun:test'
import { authDestination, authRoute } from '../components/LearningAI/authPresentation.tsx'

test('every supported entry parameter preserves a learner return destination', () => {
  for (const key of ['next', 'redirect', 'redirect_to', 'callbackUrl']) {
    const params = new URLSearchParams({ [key]: '/learningai/lesson/02?review=1' })
    expect(authDestination(params, true)).toBe('/learningai/lesson/02?review=1')
    const recovery = new URL(authRoute('/forgot', params, true), 'https://learn.example')
    expect(recovery.pathname).toBe('/forgot')
    const login = new URL(authRoute('/login', recovery.searchParams, true), recovery.origin)
    expect(authDestination(login.searchParams, true)).toBe('/learningai/lesson/02?review=1')
  }
})
test('external and ambiguous redirects fail closed to the org landing page', () => {
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'relative']) {
    expect(authDestination(new URLSearchParams({ next }), true)).toBe('/learningai')
    expect(authDestination(new URLSearchParams({ next }), false)).toBe('/home')
  }
})
test('auth links do not carry reset codes, emails or pending MFA tokens', () => {
  const params = new URLSearchParams({ next: '/learningai', email: 'fictional@example.com', resetCode: 'private', mfa_token: 'private' })
  expect(authRoute('/signup', params, true)).toBe('/signup?next=%2Flearningai')
})
test('non-Cockpit organizations retain the standard default', () => {
  expect(authDestination(new URLSearchParams(), false)).toBe('/home')
  expect(authDestination(new URLSearchParams(), true)).toBe('/learningai')
})
