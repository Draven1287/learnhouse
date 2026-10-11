'use client'
import { LearningAITheme } from './CockpitAccountFrame'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useAuth } from '@components/Contexts/AuthContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { OrgMFAPolicyGate } from '@components/Objects/Banners/OrgMFAPolicyGate'
import { getAPIUrl, getConfig, getUriWithOrg } from '@services/config/config'
import { learningAIRequest, LessonState } from '@services/courses/learningai'
import LearningAIActivity from '@components/Objects/Activities/LearningAIActivity/LearningAIActivity'
import CockpitDial, { CockpitMiniDial } from './CockpitDial'
import coursePlan from './course-catalog.json'
import './cockpit.css'

type CourseActivity = {
  activity_uuid: string
  name: string
  is_locked?: boolean
  content?: { learningai?: { lesson_id?: string } }
}
type Course = {
  name: string
  description: string
  org_id: number
  chapters: {
    name: string
    is_locked?: boolean
    activities: CourseActivity[]
  }[]
}
type Catalog = { course: Course; activities: Record<string, CourseActivity> }
const steps = ['Learn', 'First choice', 'Your judgment', 'Make it yours']

export default function LearningAICockpit({
  orgslug,
  screen,
  lessonNumber,
}: {
  orgslug: string
  screen: string
  lessonNumber?: number
}) {
  const session = useLHSession()
  // Drop all account-derived content immediately, including during a session change.
  return (
    <CockpitSession
      key={`${orgslug}:${screen}:${lessonNumber ?? 0}:${session?.data?.user?.id ?? 'guest'}:${session?.data?.tokens?.access_token ?? ''}`}
      orgslug={orgslug}
      screen={screen}
      lessonNumber={lessonNumber}
    />
  )
}

function CockpitSession({
  orgslug,
  screen,
  lessonNumber,
}: {
  orgslug: string
  screen: string
  lessonNumber?: number
}) {
  const session = useLHSession()
  const org = useOrg() as { id?: number } | null
  const auth = useAuth()
  const router = useRouter()
  const token = session?.data?.tokens?.access_token
  const signedIn = session?.status === 'authenticated'
  const href = (page = '') =>
    getUriWithOrg(orgslug, `/learningai${page ? `/${page}` : ''}`)
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [savedLessons, setSavedLessons] = useState<Record<string, LessonState>>(
    {}
  )
  const [error, setError] = useState('')
  const [progressError, setProgressError] = useState('')
  const [retry, setRetry] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [clock, setClock] = useState('')
  const [greeting, setGreeting] = useState('Welcome')
  const configuredCourse = getConfig('NEXT_PUBLIC_LEARNINGAI_COURSE_UUID')
  useEffect(() => {
    const now = new Date(),
      hour = now.getHours()
    // Browser-local time is intentionally populated after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    )
    setClock(
      `${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}  ·  ${now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}`
    )
  }, [])
  useEffect(() => {
    if (session?.status === 'loading' || !org?.id) return
    const controller = new AbortController()
    async function load() {
      if (!configuredCourse)
        throw new Error(
          'The course is not connected yet. Ask your course organizer to finish setup.'
        )
      const response = await fetch(
        `${getAPIUrl()}courses/${encodeURIComponent(configuredCourse)}/meta?with_unpublished_activities=false`,
        {
          signal: controller.signal,
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      )
      if (!response.ok)
        throw new Error(
          response.status === 403
            ? 'This account does not have access to the course.'
            : 'The course could not be loaded. Please try again.'
        )
      const course: Course = await response.json()
      if (course.org_id !== org?.id || !Array.isArray(course.chapters))
        throw new Error('The course is not available in this organization.')
      const activities = Object.fromEntries(
        course.chapters
          .filter((c) => !c.is_locked)
          .flatMap((c) => c.activities)
          .filter(
            (a) =>
              !a.is_locked &&
              coursePlan.some(
                (l) => l.pilot && l.id === a.content?.learningai?.lesson_id
              )
          )
          .map((a) => [a.content!.learningai!.lesson_id!, a])
      )
      if (controller.signal.aborted) return
      setCatalog({ course, activities })
      if (token) {
        const results = await Promise.all(
          Object.entries(activities).map(async ([id, activity]) => {
            try {
              const data = await learningAIRequest(
                activity.activity_uuid,
                token,
                'GET',
                undefined,
                controller.signal
              )
              return { id, state: data.state as LessonState, error: '' }
            } catch (e) {
              return { id, state: null, error: (e as Error).message }
            }
          })
        )
        if (controller.signal.aborted) return
        setSavedLessons(
          Object.fromEntries(
            results.filter((r) => r.state).map((r) => [r.id, r.state!])
          )
        )
        setProgressError(
          results
            .filter((r) => r.error)
            .map((r) => `Lesson ${r.id.slice(-2)}: ${r.error}`)
            .join(' ')
        )
      }
    }
    load().catch((e) => {
      if (!controller.signal.aborted) setError(e.message)
    })
    return () => controller.abort()
  }, [token, org?.id, session?.status, configuredCourse, retry, screen])
  useEffect(() => {
    if (!menuOpen) return
    const old = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = old
    }
  }, [menuOpen])
  const available = coursePlan.filter((l) => catalog?.activities[l.id])
  const next =
    available.find(
      (l) => savedLessons[l.id] && !savedLessons[l.id].completed
    ) ||
    available[0] ||
    coursePlan[0]
  const plan = coursePlan.find((l) => l.number === lessonNumber) || next
  const number = String(plan.number).padStart(2, '0')
  const saved = savedLessons[plan.id]
  const complete = saved?.completed ?? false
  const activity = catalog?.activities[plan.id]
  const firstName = session?.data?.user?.first_name
  const actionText = !signedIn
    ? 'Sign in to begin'
    : complete
      ? `Review lesson ${number}`
      : saved?.revision
        ? `Resume lesson ${number}`
        : `Start lesson ${number}`
  const target = `${!signedIn ? 'signin' : 'lesson'}/${number}`
  const retryButton = (
    <button
      className="btn"
      onClick={() => {
        setError('')
        setProgressError('')
        setCatalog(null)
        setSavedLessons({})
        setRetry((v) => v + 1)
      }}
    >
      Try again
    </button>
  )
  const unavailable =
    error ||
    (catalog && !activity
      ? `Lesson ${number} is not currently available to this account.`
      : '')
  const courseStatus = unavailable ? (
    <div role="alert" className="integration-status integration-error">
      {unavailable}
      <div className="integration-actions">{retryButton}</div>
    </div>
  ) : !catalog ? (
    <p role="status" className="integration-status">
      Loading course…
    </p>
  ) : null
  const launch = courseStatus || (
    <Link className="btn white" href={href(target)}>
      {actionText} <span aria-hidden="true">›</span>
    </Link>
  )
  const accountProgress = progressError ? (
    <div className="integration-status integration-error" role="alert">
      {progressError}
      <div className="integration-actions">{retryButton}</div>
    </div>
  ) : signedIn && !saved && activity ? (
    <p role="status" className="integration-status">
      Loading account progress…
    </p>
  ) : null

  let content
  if (screen === 'signin')
    content = (
      <SignIn
        orgslug={orgslug}
        home={href()}
        lesson={href(`lesson/${number}`)}
      />
    )
  else if (screen === 'lesson')
    content = (
      <>
        {!signedIn ? (
          <section className="page wrap">
            <header className="ihead">
              <div>
                <span className="cap kick">Your account · your progress</span>
                <h1>Keep your place.</h1>
                <p>
                  Sign in to start this lesson and save your decisions to your
                  account.
                </p>
              </div>
            </header>
            <Link className="btn white" href={href(`signin/${number}`)}>
              Sign in
            </Link>
          </section>
        ) : (
          (courseStatus && (
            <section className="lesson">{courseStatus}</section>
          )) ||
          (activity && (
            <LearningAIActivity
              activity={activity}
              presentation="cockpit"
              homeHref={href()}
              nextLessonHref={
                available.find((l) => l.number === plan.number + 1)
                  ? href(`intro/${String(plan.number + 1).padStart(2, '0')}`)
                  : undefined
              }
            />
          ))
        )}
      </>
    )
  else if (screen === 'home' || screen === 'intro')
    content = (
      <div className="ck">
        <section className="ck-side ck-left" aria-labelledby="cockpit-title">
          <p className="cap ck-clock">
            {screen === 'intro'
              ? `Lesson ${number} · Understand`
              : clock || 'LearningAI'}
          </p>
          <h1 id="cockpit-title">
            {screen === 'intro'
              ? plan.title
              : `${greeting}${signedIn && firstName ? `, ${firstName}` : ''}.`}
          </h1>
          <p className="lead-line">
            {screen === 'intro'
              ? plan.objective
              : complete
                ? 'Your available lessons are submitted. Revisit your reasoning or find your saved work in your toolkit.'
                : signedIn
                  ? 'Use AI without handing over your judgment. Continue your next lesson, then keep your reasoning in your toolkit.'
                  : 'Use AI without handing over your judgment. Your first lesson takes about eight minutes. Sign in to keep your place.'}
          </p>
          {signedIn && saved && !complete && (
            <p className="memory">
              <span className="cap">Your place</span>Step {saved.page + 1} of 4
              · {steps[saved.page]}
            </p>
          )}
          {accountProgress}
          <Link
            className="ulink"
            href={href(
              screen === 'intro' ? 'course' : signedIn ? 'course' : 'signin'
            )}
          >
            {screen === 'intro'
              ? 'Course overview'
              : signedIn
                ? 'Explore the course'
                : 'Sign in to keep your place'}
          </Link>
        </section>
        <div className="ck-gauge">
          <CockpitDial
            page={saved?.page}
            completed={complete}
            lesson={screen === 'intro'}
            lessonNumber={plan.number}
            completedLessons={coursePlan
              .filter((l) => savedLessons[l.id]?.completed)
              .map((l) => l.number)}
          />
          <div className="ck-core">
            <span className="cap">
              {complete
                ? 'Lesson submitted'
                : signedIn
                  ? 'Your next step'
                  : 'Begin with'}
            </span>
            <div className="gear">{number}</div>
            <div className="ttl">{plan.title}</div>
            <p className="q">{plan.question}</p>
          </div>
          <div className="ck-ign">{launch}</div>
        </div>
        <aside className="ck-side ck-right" aria-label="Course details">
          <ul className="ro">
            <Readout
              label="Available"
              value={catalog ? String(available.length).padStart(2, '0') : '—'}
              unit="lessons"
              detail="Two lessons are connected for pilot review."
            />
            <Readout
              label={signedIn ? 'Saved progress' : 'First lesson'}
              value={
                signedIn
                  ? saved
                    ? complete
                      ? '04'
                      : String(saved.page + 1).padStart(2, '0')
                    : '—'
                  : '08'
              }
              unit={signedIn ? '/ 04' : 'min'}
              detail={
                signedIn
                  ? complete
                    ? 'Submitted to your account.'
                    : 'Resume your saved step.'
                  : 'Four short, hands-on steps.'
              }
            />
            <Readout
              label="Course plan"
              value="15"
              unit="lessons"
              detail="Understand. Revise. Judgment. Lessons 03–15 are not released."
            />
          </ul>
        </aside>
      </div>
    )
  else if (screen === 'course')
    content = (
      <section className="page wrap">
        <header className="ihead">
          <div>
            <span className="cap kick">The course</span>
            <h1>{catalog?.course.name || 'AI you can use'}</h1>
            <p>
              {catalog?.course.description ||
                'Practical decisions. Useful results. Your judgment at the center.'}
            </p>
          </div>
          <ul className="ro ro-row">
            <Readout
              label="Available"
              value={catalog ? String(available.length).padStart(2, '0') : '—'}
              unit="lessons"
            />
            <Readout label="Course plan" value="15" unit="lessons" />
            <Readout label="First lesson" value="08" unit="min" />
          </ul>
        </header>
        {courseStatus}
        {accountProgress}
        <div className="rows">
          {coursePlan.map((l) => {
            const num = String(l.number).padStart(2, '0')
            const accessible = !!catalog?.activities[l.id]
            const state = savedLessons[l.id]
            const row = (
              <>
                <span className="no">{num}</span>
                <span className="lt">{l.title}</span>
                <span className="cap state">
                  {accessible
                    ? state?.completed
                      ? 'Submitted · review →'
                      : state?.revision
                        ? 'Resume →'
                        : 'View lesson →'
                    : l.pilot
                      ? 'Unavailable'
                      : 'Not released'}
                </span>
              </>
            )
            const id = [1, 6, 11].includes(l.number)
              ? `part-${l.part}`
              : undefined
            return accessible ? (
              <Link
                key={l.id}
                id={id}
                className="lrow"
                href={href(`intro/${num}`)}
              >
                {row}
              </Link>
            ) : (
              <div key={l.id} id={id} className="lrow">
                {row}
              </div>
            )
          })}
        </div>
        <p className="footnote">
          Both pilot lessons include an explanation, hands-on practice, checks,
          feedback and saved reasoning. Completion records your submission, not
          mastery.
        </p>
      </section>
    )
  else if (screen === 'toolkit')
    content = (
      <section className="page wrap">
        <header className="ihead">
          <div>
            <span className="cap kick">Keep what helps</span>
            <h1>Your toolkit.</h1>
            <p>
              Your saved lesson reflection, brought forward from your account.
            </p>
          </div>
        </header>
        {!signedIn ? (
          <Link className="btn white" href={href('signin')}>
            Sign in to view your toolkit
          </Link>
        ) : (
          <>
            {courseStatus}
            {accountProgress}
            {available.map((l) => {
              const work = savedLessons[l.id]
              if (!work) return null
              return (
                <div className="slot-detail" key={l.id}>
                  <span className="cap">
                    Lesson {String(l.number).padStart(2, '0')} ·{' '}
                    {work.completed ? 'Submitted reflection' : 'Saved draft'}
                  </span>
                  <h2>{l.title}</h2>
                  <p className="toolkit-copy">
                    {work.answers[`${l.id}.transfer`] ||
                      'Your practice response will appear here after you save it in the lesson.'}
                  </p>
                  <div className="integration-actions">
                    <Link
                      className="btn"
                      href={href(`lesson/${String(l.number).padStart(2, '0')}`)}
                    >
                      {work.completed ? 'Review lesson' : 'Continue lesson'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </section>
    )
  else if (screen === 'projects')
    content = (
      <section className="page wrap">
        <header className="ihead">
          <div>
            <span className="cap kick">Put it into practice</span>
            <h1>Your next project.</h1>
            <p>
              One real task, from goal to finished result. Projects are not
              available in this pilot release.
            </p>
          </div>
        </header>
        <div className="stages">
          {['Choose a goal', 'Make a plan', 'Try and revise', 'Reflect'].map(
            (stage, i) => (
              <div key={stage}>
                <span className="cap">0{i + 1}</span>
                <b>{stage}</b>
                <p>Coming with the project release.</p>
              </div>
            )
          )}
        </div>
        <div className="integration-actions">
          <Link className="btn" href={href('course')}>
            Explore the available lessons
          </Link>
        </div>
      </section>
    )
  else
    content = (
      <section className="page wrap">
        <header className="ihead">
          <div>
            <span className="cap kick">Your account</span>
            <h1>Settings.</h1>
            <p>Your profile, your security, your saved learning.</p>
          </div>
        </header>
        {signedIn ? (
          <>
            <div className="set-row">
              <span className="k">Signed in as</span>
              <span className="v">{session?.data?.user?.email}</span>
            </div>
            <div className="set-row">
              <span className="k">Profile & security</span>
              <span className="v">
                Manage your details, sign-in methods and account security.
              </span>
              <Link
                className="btn"
                href={getUriWithOrg(orgslug, '/account/general')}
              >
                Account settings
              </Link>
            </div>
            <div className="set-row">
              <span className="k">Lesson history</span>
              <span className="v">
                Submitted work stays unchanged. Starting over is not available
                in this release.
              </span>
              <Link className="btn" href={href('toolkit')}>
                View saved work
              </Link>
            </div>
            <div className="integration-actions">
              <button
                className="btn"
                onClick={async () => {
                  await auth.signOut({ redirect: false })
                  router.replace(href())
                }}
              >
                Sign out
              </button>
            </div>
          </>
        ) : (
          <Link className="btn white" href={href('signin')}>
            Sign in
          </Link>
        )}
      </section>
    )

  return (
    <div className="lai">
      <LearningAITheme />
      <a className="skip" href="#learningai-main">
        Skip to content
      </a>
      <header className="nav">
        <div className="nav-in wrap">
          <button
            className="menu-trigger"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => {
              dialog.current?.showModal()
              setMenuOpen(true)
            }}
          >
            <i aria-hidden="true" />
            <span>Menu</span>
          </button>
          <Link className="mark" href={href()}>
            LearningAI
          </Link>
          <Link
            className="nav-ctx"
            href={href(signedIn ? 'settings' : 'signin')}
          >
            <span className="t">{signedIn ? 'Account' : 'Sign in'}</span>
            <span aria-hidden="true">↗</span>
            <span className="vh">
              {signedIn ? 'Account settings' : 'Sign in to LearningAI'}
            </span>
          </Link>
        </div>
      </header>
      <OrgMFAPolicyGate />
      <div id="learningai-main" tabIndex={-1}>
        {content}
      </div>
      <dialog
        className={`mx ${menuOpen ? 'open' : ''}`}
        ref={dialog}
        aria-label="LearningAI navigation"
        onClose={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('button, a[href]')
          ).filter((element) => element.getClientRects().length > 0)
          const first = controls[0],
            last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <div className="mx-in wrap">
          <div className="mx-top">
            <button
              className="mx-close"
              aria-label="Close menu"
              onClick={() => dialog.current?.close()}
            >
              <i aria-hidden="true" />
              <span>Close</span>
            </button>
            <span className="mark">LearningAI</span>
          </div>
          <div className="mx-grid">
            <nav className="mx-words" aria-label="Main navigation">
              {[
                ['', 'Home'],
                ['course', 'The course'],
                ['toolkit', 'Toolkit'],
                ['projects', 'Projects'],
                ['settings', 'Settings'],
              ].map(([page, label], i) => (
                <Link
                  style={{ '--d': `${i * 45}ms` } as CSSProperties}
                  key={page}
                  href={href(page)}
                  aria-current={
                    (page || 'home') === screen ? 'page' : undefined
                  }
                  onClick={() => dialog.current?.close()}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="mx-box" aria-label="Course parts">
              {['Understand', 'Revise', 'Judgment'].map((part, index) => (
                <Link
                  key={part}
                  className="mx-card"
                  href={`${href('course')}#part-${index + 1}`}
                  style={{ '--d': `${180 + index * 60}ms` } as CSSProperties}
                  onClick={() => dialog.current?.close()}
                >
                  <span className="art">
                    <CockpitMiniDial
                      number={index + 1}
                      completed={index === 0 && complete}
                    />
                  </span>
                  <span>
                    <span className="cap">
                      Part 0{index + 1} ·{' '}
                      {index === 0 ? 'First lesson available' : 'Not released'}
                    </span>
                    <b>{part}</b>
                  </span>
                  <span className="ar" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
          <div className="mx-foot">
            <span className="cap">LearningAI · powered by LearnHouse</span>
            <Link
              href={href(signedIn ? 'settings' : 'signin')}
              onClick={() => dialog.current?.close()}
            >
              {signedIn ? 'Your account' : 'Sign in'} →
            </Link>
          </div>
        </div>
      </dialog>
    </div>
  )
}

function Readout({
  label,
  value,
  unit,
  detail,
}: {
  label: string
  value: string
  unit?: string
  detail?: string
}) {
  return (
    <li>
      <span className="cap">{label}</span>
      <div className="v">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      {detail && <p className="s">{detail}</p>}
    </li>
  )
}

function SignIn({
  orgslug,
  home,
  lesson,
}: {
  orgslug: string
  home: string
  lesson: string
}) {
  const auth = useAuth(),
    session = useLHSession(),
    router = useRouter()
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [mfa, setMfa] = useState('')
  if (session?.status === 'authenticated')
    return (
      <section className="page wrap">
        <header className="ihead">
          <div>
            <span className="cap kick">Welcome back</span>
            <h1>You’re signed in.</h1>
            <p>Your progress is saved with your account.</p>
          </div>
        </header>
        <Link className="btn white" href={lesson}>
          Continue to lesson
        </Link>
      </section>
    )
  return (
    <div className="auth">
      <section className="auth-l">
        <div>
          <span className="cap">Your place, kept.</span>
          <h1>
            Welcome
            <br />
            back.
          </h1>
          <p>Sign in to save your work and pick up where you left off.</p>
        </div>
        <div
          className="auth-dial"
          style={{ position: 'relative', aspectRatio: 1 }}
        >
          <CockpitDial />
        </div>
      </section>
      <div className="auth-r">
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault()
            if (busy) return
            setBusy(true)
            setError('')
            const data = new FormData(e.currentTarget)
            try {
              const result = mfa
                ? await auth.completeMfaLogin(mfa, String(data.get('code')), {
                    redirect: false,
                  })
                : await auth.signIn('credentials', {
                    email: String(data.get('email')),
                    password: String(data.get('password')),
                    orgSlug: orgslug,
                    redirect: false,
                    callbackUrl: lesson,
                  })
              if (result?.mfa_required && result.mfa_token)
                setMfa(result.mfa_token)
              else if (result?.ok) router.replace(lesson)
              else
                setError(
                  'Sign-in was not completed. Check your details and try again, or use the full sign-in options below.'
                )
            } catch {
              setError(
                'Could not reach sign-in. Check your connection and try again.'
              )
            } finally {
              setBusy(false)
            }
          }}
        >
          <span className="cap">
            {mfa ? 'Two-factor authentication' : 'Sign in to LearningAI'}
          </span>
          {mfa ? (
            <div className="fld">
              <label htmlFor="lai-code">Authentication code</label>
              <input
                className="input"
                id="lai-code"
                name="code"
                autoComplete="one-time-code"
                required
                inputMode="numeric"
                autoFocus
              />
            </div>
          ) : (
            <>
              <div className="fld">
                <label htmlFor="lai-email">Email</label>
                <input
                  className="input"
                  type="email"
                  id="lai-email"
                  name="email"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="fld">
                <label htmlFor="lai-password">Password</label>
                <input
                  className="input"
                  type="password"
                  id="lai-password"
                  name="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </>
          )}
          {error && (
            <p className="err" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn white"
            disabled={busy || session?.status === 'loading'}
          >
            {busy ? 'Signing in…' : mfa ? 'Verify and continue' : 'Sign in'}{' '}
            <span aria-hidden="true">›</span>
          </button>
          <Link
            className="ulink"
            href={getUriWithOrg(
              orgslug,
              `/login?callbackUrl=${encodeURIComponent(lesson)}`
            )}
          >
            More sign-in options
          </Link>
          <Link className="ulink" href={getUriWithOrg(orgslug, '/forgot')}>
            Forgot password
          </Link>
          <Link className="ulink" href={home}>
            Back to home
          </Link>
        </form>
      </div>
    </div>
  )
}
