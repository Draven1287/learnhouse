import Link from 'next/link'
import { useEffect, useRef } from 'react'
import type {
  Lesson,
  ChoiceActivity,
} from '@components/Objects/Activities/LearningAIActivity/LearningAIActivity'
import type { LessonState } from '@services/courses/learningai'

const stepNames = ['Learn', 'First choice', 'Your judgment', 'Make it yours']
type Props = {
  lesson: Lesson
  state: LessonState
  busy: boolean
  status: string
  required: boolean
  homeHref: string
  answer: (_id: string, _value: string) => void
  persist: (_submit?: boolean, _page?: number) => Promise<void>
  reload: () => void
}

export default function CockpitLesson({
  lesson,
  state,
  busy,
  status,
  required,
  homeHref,
  answer,
  persist,
  reload,
}: Props) {
  const heading = useRef<HTMLHeadingElement>(null)
  const initial = useRef(true)
  useEffect(() => {
    if (initial.current) {
      initial.current = false
      return
    }
    heading.current?.focus()
  }, [state.page, state.completed])
  const branch = lesson.branchActivity
  const branchVisible =
    state.answers[branch.visibleIfActivity!] !== undefined &&
    state.answers[branch.visibleIfActivity!] !== branch.visibleIfNotEqual
  const page = state.page
  function choice(check: ChoiceActivity) {
    return (
      <fieldset disabled={busy || state.completed} key={check.id}>
        <legend>{check.prompt}</legend>
        <div className="answers">
          {check.choices.map((option) => (
            <label className="answer" key={option.value}>
              <input
                type="radio"
                name={check.id}
                value={option.value}
                checked={state.answers[check.id] === option.value}
                onChange={() => answer(check.id, option.value)}
              />
              <span>{option.text}</span>
            </label>
          ))}
        </div>
        {state.answers[check.id] && (
          <div className="outcome" role="status">
            <span className="cap">Consider this</span>
            <p>
              {
                check.choices.find((c) => c.value === state.answers[check.id])
                  ?.feedback
              }
            </p>
          </div>
        )}
      </fieldset>
    )
  }
  return (
    <section className="lesson" aria-label={lesson.title}>
      <p className="cap">Lesson 01 · Understand</p>
      <h1 ref={heading} tabIndex={-1}>
        {state.completed
          ? 'Your first result. Kept.'
          : page === 0
            ? lesson.title
            : stepNames[page]}
      </h1>
      {state.completed ? (
        <>
          <div className="body">
            <p>
              Your lesson is complete and saved to your account. Completion
              records submission, not mastery. Review your reasoning yourself or
              with an educator.
            </p>
          </div>
          <dl className="readback">
            {[...lesson.activities, ...(branchVisible ? [branch] : [])].map(
              (check) => (
                <div key={check.id}>
                  <dt>{check.prompt}</dt>
                  <dd>
                    {
                      check.choices.find(
                        (c) => c.value === state.answers[check.id]
                      )?.text
                    }
                  </dd>
                </div>
              )
            )}
            <dt>Your reflection</dt>
            <dd>{state.answers[lesson.transfer.id]}</dd>
          </dl>
          <p className="integration-status">
            Submitted work stays unchanged in this release. Lessons 02–15 are
            not available yet.
          </p>
          <div className="integration-actions">
            <Link className="btn white" href={homeHref}>
              Back to your cockpit
            </Link>
            <Link className="btn" href={`${homeHref}/toolkit`}>
              Your toolkit
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="integration-status">
            Step {page + 1} of 4 · {stepNames[page]}
          </p>
          <nav className="step-nav" aria-label="Lesson steps">
            {stepNames.map((name, i) => (
              <button
                key={name}
                disabled={busy || page === i}
                aria-current={page === i ? 'step' : undefined}
                onClick={() => persist(false, i)}
              >
                {String(i + 1).padStart(2, '0')} {name}
              </button>
            ))}
          </nav>
          {page === 0 && (
            <div className="body">
              <p>{lesson.explanation}</p>
              <aside className="case">
                <span className="cap">The situation</span>
                <p>{lesson.scenario}</p>
              </aside>
              <p className="muted">
                Read the brief. Make two choices, consider the feedback, then
                write a plan of your own.
              </p>
            </div>
          )}
          {(page === 1 || page === 2) && (
            <>
              <aside className="case">
                <span className="cap">The situation</span>
                <p>{lesson.scenario}</p>
              </aside>
              <div className="body">
                {choice(lesson.activities[page - 1])}
                {page === 2 && branchVisible && (
                  <div className="rubric">
                    <p className="cap">One more check</p>
                    {choice(branch)}
                  </div>
                )}
              </div>
            </>
          )}
          {page === 3 && (
            <fieldset disabled={busy}>
              <label className="field-lbl" htmlFor="lai-reflection">
                {lesson.transfer.prompt}
              </label>
              <textarea
                id="lai-reflection"
                required
                minLength={30}
                maxLength={2000}
                rows={7}
                aria-describedby="lai-requirements lai-privacy"
                value={state.answers[lesson.transfer.id] || ''}
                onChange={(e) => answer(lesson.transfer.id, e.target.value)}
              />
              <p className="count">
                {(state.answers[lesson.transfer.id] || '').trim().length} / 30
                characters minimum · 2,000 maximum
              </p>
              <p id="lai-requirements" className="integration-status">
                Answer every visible choice and write at least 30 characters of
                reasoning before submitting. You can save unfinished work.
              </p>
              {!required && (
                <p className="integration-status">
                  Still needed:{' '}
                  {[...lesson.activities, ...(branchVisible ? [branch] : [])]
                    .filter((c) => !state.answers[c.id])
                    .map((c) =>
                      c === branch
                        ? 'extra check'
                        : `choice ${lesson.activities.indexOf(c) + 1}`
                    )
                    .concat(
                      (state.answers[lesson.transfer.id] || '').trim().length <
                        30
                        ? ['reflection']
                        : []
                    )
                    .join(', ')}
                  .
                </p>
              )}
              <p id="lai-privacy" className="integration-status">
                Use fictional practice details. Do not include names, contact
                details, or other personal information. Use a role such as club
                organizer.
              </p>
              <div className="rubric">
                <span className="cap">Self-check</span>
                <ul>
                  {lesson.transfer.rubric.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <p>{lesson.uncertainty}</p>
              </div>
              <p className="integration-status">
                Saving sends your answers to the server and stores them with
                your account. Review before submitting: submitted work cannot be
                edited. It is not AI graded.
              </p>
            </fieldset>
          )}
          <div className="lfoot">
            <button
              className="ulink"
              disabled={busy || page === 0}
              onClick={() => persist(false, page - 1)}
            >
              ← Back
            </button>
            <button className="btn" disabled={busy} onClick={() => persist()}>
              Save progress
            </button>
            {page < 3 ? (
              <button
                className="btn white"
                disabled={busy}
                onClick={() => persist(false, page + 1)}
              >
                Save & continue <span aria-hidden="true">›</span>
              </button>
            ) : (
              <button
                className="btn white"
                disabled={busy || !required}
                onClick={() => persist(true)}
              >
                Submit lesson <span aria-hidden="true">›</span>
              </button>
            )}
          </div>
        </>
      )}
      <p className="save-status" role="status" aria-live="polite">
        {status}
      </p>
      {/changed|failed|expired/i.test(status) && (
        <div className="integration-actions">
          <button className="btn" disabled={busy} onClick={reload}>
            Reload account work
          </button>
          {/expired/i.test(status) && (
            <Link className="btn" href={`${homeHref}/signin`}>
              Sign in again
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
