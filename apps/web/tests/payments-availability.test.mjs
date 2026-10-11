import { expect, test } from 'bun:test'
import { paymentsUnavailable } from '../services/payments/availability.ts'

test('missing OSS payment backend never becomes a fabricated purchase list', () => {
  expect(paymentsUnavailable('oss', { resolved_features: { payments: { enabled: true } } })).toBe(true)
})
test('resolved capability wins over legacy configuration', () => {
  expect(paymentsUnavailable('ee', { resolved_features: { payments: { enabled: false } }, features: { payments: { enabled: true } } })).toBe(true)
  expect(paymentsUnavailable('saas', { resolved_features: { payments: { enabled: true } }, features: { payments: { enabled: false } } })).toBe(false)
})
test('unknown capability preserves the request and its error instead of claiming unavailable', () => {
  expect(paymentsUnavailable(null, undefined)).toBe(false)
  expect(paymentsUnavailable('ee', undefined)).toBe(false)
})
