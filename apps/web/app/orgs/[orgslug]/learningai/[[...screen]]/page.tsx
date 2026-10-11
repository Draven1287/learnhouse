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
  const numbered = ['intro', 'lesson', 'signin'].includes(selected)
  const lessonNumber = screen[1] ? Number(screen[1]) : undefined
  if (
    screen.length > 2 ||
    (screen.length === 2 &&
      (!numbered || !/^(0[1-9]|1[0-5])$/.test(screen[1]))) ||
    !screens.includes(selected as (typeof screens)[number])
  )
    notFound()
  return (
    <LearningAICockpit
      orgslug={orgslug}
      screen={selected}
      lessonNumber={lessonNumber}
    />
  )
}
