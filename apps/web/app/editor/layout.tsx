import type { ReactNode } from 'react'
import CockpitWorkspace from '@components/LearningAI/CockpitWorkspace'
import { getAuthOrgSlug } from '@services/org/orgResolution'

export default async function Layout({ children }: { children: ReactNode }) {
  return <CockpitWorkspace orgslug={(await getAuthOrgSlug()) || ''}>{children}</CockpitWorkspace>
}
