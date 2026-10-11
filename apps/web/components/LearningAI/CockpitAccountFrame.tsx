'use client'
import Link from 'next/link'
import { useEffect, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import LanguageSwitcher from '@components/Utils/LanguageSwitcher'
import { AuthFooter, CopyrightFooter } from '@components/Footers/LegalFooters'
import { AuthPresentation, isLearningAIOrg } from './authPresentation'
import './cockpit.css'
import './account.css'

let themeUsers = 0

export function LearningAITheme() {
  useEffect(() => {
    themeUsers += 1
    document.documentElement.classList.add('learningai-theme')
    return () => {
      themeUsers -= 1
      if (themeUsers === 0) document.documentElement.classList.remove('learningai-theme')
    }
  }, [])
  return null
}

export default function CockpitAccountFrame({ children, account = false }: { children: ReactNode; account?: boolean }) {
  const path = usePathname() || ''
  const kind = path.includes('signup') ? 'signup' : /forgot|reset/.test(path) ? 'recovery' : /verify|magic|callback|token-exchange/.test(path) ? 'verification' : 'login'
  const copy = {
    login: ['Your place, kept.', 'Welcome\nback.', 'Sign in to save your work and pick up where you left off.'],
    signup: ['A place to begin.', 'Make it\nyours.', 'Create your account. Keep your ideas, your practice and your progress together.'],
    recovery: ['A way back in.', 'Let’s get\nyou back.', 'Recover access to your account. Your saved learning stays in place.'],
    verification: ['One more step.', 'Your account.\nYour access.', 'Follow the secure steps below to continue.'],
  }[kind]
  return <div className={`lai lai-account-frame ${account ? 'lai-account' : 'lai-auth'}`}>
    <LearningAITheme />
    <a className="skip" href="#learningai-account-main">Skip to content</a>
    <header className="account-nav">
      <Link href="/learningai" className="account-back">Home</Link>
      <Link href="/learningai" className="mark" aria-label="LearningAI home">LearningAI</Link>
      <div className="account-nav-end"><LanguageSwitcher /><Link href={account ? '/learningai/settings' : '/learningai/course'}>{account ? 'Settings' : 'The course'}</Link></div>
    </header>
    {account ? <main id="learningai-account-main" className="account-content">{children}</main> : <main id="learningai-account-main" className="account-grid">
      <aside className="account-intro"><p className="cap">{copy[0]}</p><p className="account-headline">{copy[1]}</p><p className="account-summary">{copy[2]}</p><Link href="/learningai/course" className="account-return">Explore the course →</Link></aside>
      <section className="account-form" aria-label="Account access">{children}</section>
    </main>}
    <footer className="account-footer">{account ? <CopyrightFooter year={new Date().getFullYear()} tone="dark" /> : <AuthFooter />}<a href="https://learnhouse.app" target="_blank" rel="noreferrer">Powered by LearnHouse</a></footer>
  </div>
}

export function LearningAIAuthBoundary({ children, orgslug, googleConfigured }: { children: ReactNode; orgslug: string | null; googleConfigured: boolean }) {
  const cockpit = isLearningAIOrg(orgslug)
  return <AuthPresentation.Provider value={{ googleConfigured, cockpit }}>{cockpit ? <CockpitAccountFrame>{children}</CockpitAccountFrame> : children}</AuthPresentation.Provider>
}
