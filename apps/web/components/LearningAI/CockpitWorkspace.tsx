'use client'

import { useEffect, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getConfig, getUriWithOrg } from '@services/config/config'
import { isLearningAIOrg } from './authPresentation'
import { LearningAITheme } from './CockpitAccountFrame'
import './workspace.css'

let nativeThemeUsers = 0

/** Presentation only. Session, organization, feature and editor gates remain in their native layouts. */
export default function CockpitWorkspace({ children, orgslug }: { children: ReactNode; orgslug?: string }) {
  const path = usePathname() || ''
  const active = isLearningAIOrg(orgslug ?? (getConfig('NEXT_PUBLIC_LEARNINGAI_ORG_SLUG') || getConfig('NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG') || 'default'))
  const native = active && !/(?:^|\/)(learningai|account)(?:\/|$)/.test(path)
  useEffect(() => {
    if (!native) return
    nativeThemeUsers += 1
    document.documentElement.classList.add('cockpit-native-portals')
    return () => {
      nativeThemeUsers -= 1
      if (nativeThemeUsers === 0) document.documentElement.classList.remove('cockpit-native-portals')
    }
  }, [native])
  if (!active) return <>{children}</>
  return <div className={native ? 'cockpit-native' : 'cockpit-boundary'}>
    <LearningAITheme />{children}
  </div>
}

export function CockpitWorkspaceHeading({ orgslug }: { orgslug: string }) {
  if (!isLearningAIOrg(orgslug)) return null
  return <header className="cockpit-workspace-heading">
    <Link href={getUriWithOrg(orgslug, '/learningai')} className="cockpit-wordmark">LearningAI</Link>
    <span>Teaching workspace</span>
    <Link href={getUriWithOrg(orgslug, '/learningai/course')}>View course →</Link>
  </header>
}

export function PaymentsUnavailable({ orgslug, failed = false }: { orgslug: string; failed?: boolean }) {
  return <section className="cockpit-unavailable" aria-labelledby="payments-status-title">
    <p className="cockpit-eyebrow">Account & access</p>
    <h1 id="payments-status-title">{failed ? 'Store temporarily unavailable.' : 'Payments aren’t available here.'}</h1>
    <p>{failed ? 'We couldn’t load the store. Please try again later. Your existing access has not changed.' : 'This workspace does not currently support purchases or billing. Your existing course access has not changed.'}</p>
    <Link href={getUriWithOrg(orgslug, isLearningAIOrg(orgslug) ? '/learningai/course' : '/courses')}>Return to learning →</Link>
  </section>
}

export function CockpitNotFound({ children, orgslug }: { children: ReactNode; orgslug: string }) {
  if (!isLearningAIOrg(orgslug)) return <>{children}</>
  return <CockpitWorkspace orgslug={orgslug}><main className="cockpit-unavailable">
    <p className="cockpit-eyebrow">LearningAI / 404</p>
    <h1>That page isn’t here.</h1>
    <p>The link may be out of date, or the page may have moved. Your saved learning stays with your account.</p>
    <Link href={getUriWithOrg(orgslug, '/learningai')}>Return home →</Link>
  </main></CockpitWorkspace>
}
