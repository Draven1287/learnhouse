import { notFound } from 'next/navigation'
import LearningAICockpit from '@components/LearningAI/LearningAICockpit'

export const metadata = { title: 'LearningAI · AI you can use' }
const screens = [
  'home',
  'course',
  'intro',
  'lesson',
  'signin',
  'toolkit',
  'projects',
  'settings',
] as const
export default async function Page({
  params,
}: {
  params: Promise<{ orgslug: string; screen?: string[] }>
}) {
  const { orgslug, screen = [] } = await params
  const selected = screen[0] || 'home'
  if (
    screen.length > 1 ||
    !screens.includes(selected as (typeof screens)[number])
  )
    notFound()
  return <LearningAICockpit orgslug={orgslug} screen={selected} />
}
