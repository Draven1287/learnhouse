import Link from 'next/link'
import { PracticeResponse, PredictionTable } from './LessonPractice'
import { useEffect, useRef } from 'react'
import type {
  Lesson,
  ChoiceActivity,
} from '@components/Objects/Activities/LearningAIActivity/LearningAIActivity'
import type { LessonState } from '@services/courses/learningai'

const defaultStepNames = [
  'Learn',
  'First choice',
  'Your judgment',
  'Make it yours',
]
type Props = {
  lesson: Lesson
  state: LessonState
  busy: boolean
  status: string
  required: boolean
  homeHref: string
  nextLessonHref?: string
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
  nextLessonHref,
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
  const stepNames = lesson.teaching?.stepNames || defaultStepNames
  const fields = lesson.responseFields || []
  const firstAttempt = fields.find((field) => field.stage === 0)
  const openingReady =
    !firstAttempt || !!(state.answers[firstAttempt.id] || '').trim()
  const analysis = fields.find((field) => field.stage === 2)
  const analysisReady = !analysis || !!(state.answers[analysis.id] || '').trim()
  const responses = (stage: number) =>
    fields
      .filter((field) => field.stage === stage)
      .map((field) => (
        <PracticeResponse
          key={field.id}
          field={field}
          value={state.answers[field.id] || ''}
          disabled={busy || state.completed}
          answer={answer}
        />
      ))
  const teaching = lesson.teaching?.sections.map((section) => (
    <section className="teaching-block" key={section.title}>
      <h2>{section.title}</h2>
      <p>{section.text}</p>
    </section>
  ))
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
      <p className="cap">
        Lesson {String(lesson.number).padStart(2, '0')} · Understand
      </p>
      <h1 ref={heading} tabIndex={-1}>
        {state.completed
          ? 'Your reasoning. Kept.'
          : page === 0
            ? lesson.title
            : stepNames[page]}
      </h1>
      {state.completed ? (
        <>
          <div className="body">
            <p>
              Your responses are submitted and saved to your account. This
              records submission, not demonstrated mastery. Review your
              reasoning yourself or with an educator.
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
                    <p className="integration-status">
                      {
                        check.choices.find(
                          (c) => c.value === state.answers[check.id]
                        )?.feedback
                      }
                    </p>
                  </dd>
                </div>
              )
            )}
            {fields.map((field) => (
              <div key={field.id}>
                <dt>{field.prompt}</dt>
                <dd>{state.answers[field.id]}</dd>
              </div>
            ))}
            <dt>Your transfer response</dt>
            <dd>{state.answers[lesson.transfer.id]}</dd>
          </dl>
          <details className="lesson-references">
            <summary>Revisit the explanation and sources</summary>
            <p>{lesson.explanation}</p>
            {lesson.teaching?.sections.map((section) => (
              <section className="teaching-block" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.text}</p>
              </section>
            ))}
            <PredictionTable lesson={lesson} />
            <p>{lesson.uncertainty}</p>
            <ul>
              {lesson.references?.map((source) => (
                <li key={source.id}>
                  <a href={source.url} target="_blank" rel="noreferrer">
                    {source.title} ↗
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <p className="integration-status">
            Submitted work stays unchanged in this release. Lessons 04–15 are
            not available yet.
          </p>
          <div className="integration-actions">
            {nextLessonHref && (
              <Link className="btn white" href={nextLessonHref}>
                Explore the next lesson →
              </Link>
            )}
            <Link className="btn white" href={homeHref}>
              Back to your cockpit
            </Link>
            <Link className="btn" href={`${homeHref}/toolkit`}>
              Your toolkit
            </Link>
          </div>
          {lesson.teaching && (
            <div className="rubric">
              <h2>Try it independently</h2>
              <p>{lesson.teaching.independentPractice}</p>
              <p className="muted">
                This optional follow-up is for your own practice; it does not
                change your submitted work.
              </p>
            </div>
          )}
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
                disabled={busy || page === i || (i > 0 && !openingReady)}
                aria-current={page === i ? 'step' : undefined}
                onClick={() => persist(false, i)}
              >
                {String(i + 1).padStart(2, '0')} {name}
              </button>
            ))}
          </nav>
          {page === 0 && (
            <div className="body">
              <p className="cap">What you will practice</p>
              <p>{lesson.objective}</p>
              <p>{lesson.explanation}</p>
              {!lesson.teaching?.exampleAfterAttempt && teaching}
              <aside className="case">
                <span className="cap">The situation</span>
                <p>{lesson.scenario}</p>
              </aside>
              {responses(0)}
              <p className="muted">
                Read the brief. Make two choices, consider the feedback, then
                write a plan of your own.
              </p>
              {lesson.teaching && (
                <div className="rubric">
                  <h2>{lesson.teaching.practice.title}</h2>
                  <ol>
                    {lesson.teaching.practice.instructions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                  <p>{lesson.teaching.practice.selfCheck}</p>
                </div>
              )}
              {!!lesson.references?.length && (
                <details className="lesson-references">
                  <summary>Sources and scope</summary>
                  <p>{lesson.uncertainty}</p>
                  <ul>
                    {lesson.references.map((source) => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noreferrer">
                          {source.title} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                  <p>
                    These sources support the concepts; they do not certify this
                    course. The practice scenarios are fictional.
                  </p>
                </details>
              )}
            </div>
          )}
          {(page === 1 || page === 2) && (
            <>
              <aside className="case">
                <span className="cap">The situation</span>
                <p>{lesson.scenario}</p>
              </aside>
              <div className="body">
                {page === 1 && lesson.teaching?.exampleAfterAttempt && (
                  <>
                    <h2>Compare with your first attempt</h2>
                    <p className="saved-response">
                      {state.answers[firstAttempt!.id]}
                    </p>
                    {teaching}
                    <p>
                      What did your response do differently? Use the criteria to
                      compare; matching the example is not the goal.
                    </p>
                  </>
                )}
                {page === 2 && (
                  <>
                    <PredictionTable lesson={lesson} />
                    {responses(2)}
                  </>
                )}
                {page !== 2 || analysisReady ? (
                  choice(lesson.activities[page - 1])
                ) : (
                  <p className="integration-status">
                    Write your own analysis to open the comparison choices.
                  </p>
                )}
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
              {lesson.teaching && (
                <div className="rubric">
                  <h2>{lesson.teaching.practice.title}</h2>
                  <p>Bring forward your own work from the first step.</p>
                  <p>{lesson.teaching.practice.selfCheck}</p>
                  <p>{lesson.teaching.takeaway}</p>
                </div>
              )}
              {firstAttempt && (
                <div className="case">
                  <h2>Your original attempt</h2>
                  <p className="saved-response">
                    {state.answers[firstAttempt.id]}
                  </p>
                </div>
              )}
              <label className="field-lbl" htmlFor="lai-reflection">
                {lesson.transfer.prompt}
              </label>
              <textarea
                id="lai-reflection"
                required
                minLength={lesson.transfer.minLength ?? 30}
                maxLength={2000}
                rows={7}
                aria-describedby="lai-requirements lai-privacy"
                value={state.answers[lesson.transfer.id] || ''}
                onChange={(e) => answer(lesson.transfer.id, e.target.value)}
              />
              <p className="count">
                {(state.answers[lesson.transfer.id] || '').trim().length} /
                2,000 characters ·{' '}
                {lesson.transfer.minLength === 1
                  ? 'required response'
                  : 'at least 30 characters'}
                ; not a quality score
              </p>
              <p id="lai-requirements" className="integration-status">
                Answer every visible choice and complete the written responses
                before submitting. These checks record presence, not quality.
                You can save unfinished work.
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
                        (lesson.transfer.minLength ?? 30)
                        ? ['reflection']
                        : []
                    )
                    .concat(
                      fields
                        .filter(
                          (field) => !(state.answers[field.id] || '').trim()
                        )
                        .map((field) =>
                          field.stage === 0
                            ? 'first attempt'
                            : field.stage === 2
                              ? 'error analysis'
                              : 'self-review'
                        )
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
              {responses(3)}
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
                disabled={
                  busy || !openingReady || (page === 2 && !analysisReady)
                }
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
