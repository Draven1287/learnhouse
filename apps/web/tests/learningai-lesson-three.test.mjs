import { expect, test } from 'bun:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CockpitLesson from '../components/LearningAI/CockpitLesson.tsx'
import lesson from '../../api/src/services/learningai/lesson-03.json'
import catalog from '../components/LearningAI/course-catalog.json'
const render = (page, answers = {}, completed = false) => renderToStaticMarkup(React.createElement(CockpitLesson, {
  lesson, state: {page, answers, completed, revision: 0}, busy: false, status: '', required: false,
  homeHref: '/learningai', answer() {}, async persist() {}, reload() {},
}))
test('original route attempt precedes the worked trace and offers typed ordering', () => {
  const first = render(0)
  expect(first).toContain('no dragging is needed')
  expect(first).toContain('lai.ai-you-can-use.l03.request_trace')
  expect(first).not.toContain('For these cards: C')
  const comparison = render(1, {[lesson.responseFields[0].id]: 'My route draft'})
  expect(comparison).toContain('My route draft')
  expect(comparison).toContain('For these cards: C')
})
test('dated source packet appears before comparison choices, preserving independent analysis', () => {
  const initial = render(2)
  expect(initial).toContain('12 October 2026')
  expect(initial).toContain('<caption>Fictional source packet')
  expect(initial).toContain('scope="col"')
  expect(initial).not.toContain('value="latest"')
  const attempted = render(2, {[lesson.responseFields[1].id]: 'The organizer changed this week’s schedule.'})
  expect(attempted).toContain('value="latest"')
})
test('misleading newest-reply choice opens remediation and submitted work stays visible', () => {
  const answers = {[lesson.responseFields[1].id]: 'My comparison', [lesson.activities[1].id]: 'latest'}
  expect(render(2, answers)).toContain('The reply repeats Friday')
  expect(render(2, {...answers, [lesson.activities[1].id]: 'source'})).not.toContain('The reply repeats Friday')
  const saved = render(3, {...answers, [lesson.transfer.id]: 'Withhold pizza pending organizer confirmation.'}, true)
  expect(saved).toContain('Withhold pizza pending organizer confirmation.')
  expect(saved).toContain('not demonstrated mastery')
  expect(saved).not.toContain('<textarea')
})
test('only the first three pilots are available in the full canonical plan', () => {
  expect(catalog).toHaveLength(15)
  expect(catalog.filter(item => item.pilot).map(item => item.number)).toEqual([1, 2, 3])
})
