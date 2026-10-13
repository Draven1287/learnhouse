'use client'
import { createContext, useContext } from 'react'
import { getConfig } from '@services/config/config'
import { safeInternalPath } from '@services/security/url'

export const AuthPresentation = createContext({ googleConfigured: false, cockpit: false })
export const useAuthPresentation = () => useContext(AuthPresentation)

export function isLearningAIOrg(slug?: string | null) {
  const target = getConfig('NEXT_PUBLIC_LEARNINGAI_ORG_SLUG') || getConfig('NEXT_PUBLIC_LEARNHOUSE_DEFAULT_ORG') || 'default'
  return !!getConfig('NEXT_PUBLIC_LEARNINGAI_COURSE_UUID') && slug === target
}

export function authDestination(params: URLSearchParams, cockpit: boolean) {
  return safeInternalPath(params.get('next') ?? params.get('redirect') ?? params.get('redirect_to') ?? params.get('callbackUrl'), cockpit ? '/learningai' : '/home')
}

export function authRoute(path: string, params: URLSearchParams, cockpit: boolean) {
  return `${path}?next=${encodeURIComponent(authDestination(params, cockpit))}`
}
