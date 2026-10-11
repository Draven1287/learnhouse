import type { ReactNode } from 'react'
import { LearningAIAuthBoundary } from '@components/LearningAI/CockpitAccountFrame'
import { OrgProvider } from '@components/Contexts/OrgContext'
import OrgLanguageSync from '@components/Contexts/OrgLanguageSync'
import { getAuthOrgSlug } from '@services/org/orgResolution'

export default async function AuthLayout({
    children,
}: {
    children: ReactNode
}) {
    const orgslug = await getAuthOrgSlug()
    const content = <LearningAIAuthBoundary orgslug={orgslug} googleConfigured={Boolean(process.env.LEARNHOUSE_GOOGLE_CLIENT_ID && process.env.LEARNHOUSE_GOOGLE_CLIENT_SECRET)}>{children}</LearningAIAuthBoundary>

    // No org slug → bare apex (learn.io) → generic, org-less auth pages. No
    // OrgProvider; the page renders generic LearnHouse branding.
    if (!orgslug) {
        return <>{content}</>
    }

    return (
        <OrgProvider orgslug={orgslug}>
            <OrgLanguageSync />
            {content}
        </OrgProvider>
    )
}
