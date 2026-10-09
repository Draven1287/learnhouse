'use client'
import React, { useEffect, useRef, useState } from 'react'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { learningAIRequest, LessonState } from '@services/courses/learningai'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query/keys'
import { useOrg } from '@components/Contexts/OrgContext'
import styles from './lesson.module.css'
import LearningAIReviewVideo, { LearningAIReviewMedia } from './LearningAIReviewVideo'

type Choice = { value: string; text: string; feedback: string }
type Activity = { id: string; prompt: string; choices: Choice[]; visibleIfActivity?: string; visibleIfNotEqual?: string }
type Lesson = { id: string; title: string; explanation: string; scenario: string; activities: Activity[]; branchActivity: Activity; transfer: { id: string; prompt: string; rubric: string[] }; uncertainty: string }
const empty: LessonState = { answers: {}, page: 0, revision: 0, completed: false }

export default function LearningAIActivity({ activity }: { activity: { activity_uuid: string; reviewMedia?: LearningAIReviewMedia } }) {
  const session = useLHSession() as any
  const token = session?.data?.tokens?.access_token
  const actor = session?.data?.user?.id
  if (!token || actor == null) return <section className={styles.lesson}><p role="status">Sign in to save and resume this lesson.</p></section>
  // Remount immediately on identity/activity/session change, clearing prior answers.
  return <AuthenticatedLesson key={`${actor}:${activity.activity_uuid}:${token}`} activity={activity} token={token} />
}

function AuthenticatedLesson({ activity, token }: { activity: { activity_uuid: string; reviewMedia?: LearningAIReviewMedia }; token: string }) {
  const org = useOrg() as any
  const query = useQueryClient()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [state, setState] = useState<LessonState>(empty)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Loading saved work…')
  const [loadFailed, setLoadFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const requestAbort = useRef<AbortController | null>(null)
  const inFlight = useRef(false)
  useEffect(() => {
    const controller = new AbortController()
    requestAbort.current = controller
    learningAIRequest(activity.activity_uuid, token, 'GET', undefined, controller.signal).then(data => {
      if (controller.signal.aborted) return
      setLesson(data.lesson); setState(data.state); setReady(true); setStatus('Saved work loaded from your account.')
    }).catch(error => { if (!controller.signal.aborted) { setStatus(error.message); setLoadFailed(true) } })
    return () => controller.abort()
  }, [activity.activity_uuid, token, loadAttempt])

  async function persist(submit = false) {
    if (!ready || inFlight.current || !requestAbort.current || requestAbort.current.signal.aborted) return
    const controller = requestAbort.current
    inFlight.current = true; setBusy(true); setStatus(submit ? 'Submitting…' : 'Saving…')
    try {
      const result = await learningAIRequest(activity.activity_uuid, token, submit ? 'POST' : 'PUT', state, controller.signal)
      if (controller.signal.aborted) return
      setState(result.state); setStatus(submit ? 'Lesson complete. Saved to your account.' : 'Saved to your account.')
      if (submit) await query.invalidateQueries({ queryKey: queryKeys.trail.org(org?.id) })
    } catch (error) {
      if (!controller.signal.aborted) setStatus((error as Error).message)
    } finally {
      if (!controller.signal.aborted) { inFlight.current = false; setBusy(false) }
    }
  }
  function answer(id: string, value: string) {
    setState(previous => ({ ...previous, answers: { ...previous.answers, [id]: value } }))
    setStatus('Unsaved changes. Choose Save progress or Submit.')
  }
  if (!ready || !lesson) return <section className={styles.lesson}><p role="status">{status}</p>{loadFailed && <button onClick={() => { setLoadFailed(false); setStatus('Loading saved work…'); setLoadAttempt(previous => previous + 1) }}>Retry loading lesson</button>}</section>
  const branch = lesson.branchActivity
  const branchVisible = state.answers[branch.visibleIfActivity!] !== undefined && state.answers[branch.visibleIfActivity!] !== branch.visibleIfNotEqual
  const checks = [...lesson.activities, ...(branchVisible ? [branch] : [])]
  const required = checks.every(check => !!state.answers[check.id]) && (state.answers[lesson.transfer.id] || '').trim().length >= 30
  return <section className={styles.lesson} aria-label={lesson.title}>
    <h1>{lesson.title}</h1><p>{lesson.explanation}</p>
    {process.env.NODE_ENV === 'development' && activity.reviewMedia && <LearningAIReviewVideo media={activity.reviewMedia} />}
    <aside aria-label="The situation">{lesson.scenario}</aside>
    <fieldset disabled={busy || state.completed}>
      <legend>Make a decision and explain it</legend>
      {checks.map(check => <fieldset key={check.id}><legend>{check.prompt}</legend>
        {check.choices.map(choice => <label key={choice.value}><input type="radio" name={check.id} checked={state.answers[check.id] === choice.value} onChange={() => answer(check.id, choice.value)} />{choice.text}</label>)}
        {state.answers[check.id] && <p className={styles.feedback} role="status">{check.choices.find(choice => choice.value === state.answers[check.id])?.feedback}</p>}
      </fieldset>)}
      <label htmlFor="lai-reflection">{lesson.transfer.prompt}</label>
      <textarea id="lai-reflection" required minLength={30} maxLength={2000} aria-describedby="lai-requirements lai-privacy" rows={7} value={state.answers[lesson.transfer.id] || ''} onChange={event => answer(lesson.transfer.id, event.target.value)} />
      <p id="lai-requirements">Answer every visible choice and write at least 30 characters of reasoning before submitting. You can save unfinished work.</p>
      <p id="lai-privacy">Use fictional practice details. Do not include names, contact details, or other personal information. Use a role such as club organizer.</p>
      <p>Save progress or Submit sends your answers to the server and stores them with your account. Review your answers before submitting: submitted work cannot be edited in this pilot. Review the reasoning yourself or with an educator; it is not AI graded.</p>
      <p>Self-check</p><ul>{lesson.transfer.rubric.map(line => <li key={line}>{line}</li>)}</ul><p>{lesson.uncertainty}</p>
    </fieldset>
    {!state.completed && <div className={styles.actions}><button disabled={busy} onClick={() => persist()}>Save progress</button><button disabled={busy || !required} onClick={() => persist(true)}>Submit lesson</button></div>}
    <p role="status" aria-live="polite">{status}</p>
    {state.completed && <p>Completion records submission, not mastery. Review your reasoning with your teacher. This pilot keeps submitted work unchanged.</p>}
  </section>
}
