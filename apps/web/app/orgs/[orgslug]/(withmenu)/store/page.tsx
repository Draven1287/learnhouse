import { fetchInstanceMode } from '@lib/eeGate'
import { paymentsUnavailable } from '@services/payments/availability'
import { PaymentsUnavailable } from '@components/LearningAI/CockpitWorkspace'
import { Metadata } from 'next'
import { getOrganizationContextInfo } from '@services/organizations/orgs'
import { getOrgThumbnailMediaDirectory, getOrgOgImageMediaDirectory } from '@services/media/media'
import { getOrgSeoConfig, buildPageTitle, buildBreadcrumbJsonLd } from '@/lib/seo/utils'
import { getServerCanonicalUrl } from '@/lib/seo/utils.server'
import { JsonLd } from '@components/SEO/JsonLd'
import { getPublicOffers } from '@services/payments/offers'
import Store from './store'

type PageParams = Promise<{ orgslug: string }>

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { orgslug } = await params
  const org = await getOrganizationContextInfo(orgslug, { revalidate: 120, tags: ['organizations'] })
  const seoConfig = getOrgSeoConfig(org)
  const ogImageUrl = seoConfig.default_og_image
    ? getOrgOgImageMediaDirectory(org?.org_uuid, seoConfig.default_og_image)
    : null
  const imageUrl = ogImageUrl || (org ? getOrgThumbnailMediaDirectory(org.org_uuid, org.thumbnail_image) : undefined)
  const title = buildPageTitle('Store', org?.name || 'Organization', seoConfig)
  const description = `Browse offers and subscriptions from ${org?.name || 'this organization'}`
  const canonical = await getServerCanonicalUrl(orgslug, '/store')

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      ...(imageUrl && { images: [{ url: imageUrl, width: 800, height: 600, alt: org?.name || 'Store' }] }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  }
}

export default async function StorePage({ params }: { params: PageParams }) {
  const { orgslug } = await params
  const org = await getOrganizationContextInfo(orgslug, { revalidate: 120, tags: ['organizations'] })

  if (paymentsUnavailable(await fetchInstanceMode(), org?.config?.config)) return <PaymentsUnavailable orgslug={orgslug} />

  let offers: any[] = []
  let failed = false
  try {
    const result = await getPublicOffers(org.id)
    failed = !result?.success
    offers = Array.isArray(result.data) ? result.data : []
  } catch {
    failed = true
  }
  if (failed) return <PaymentsUnavailable orgslug={orgslug} failed />

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'Home', url: await getServerCanonicalUrl(orgslug, '/') },
    { name: 'Store', url: await getServerCanonicalUrl(orgslug, '/store') },
  ])

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <Store orgslug={orgslug} offers={offers} />
    </>
  )
}
