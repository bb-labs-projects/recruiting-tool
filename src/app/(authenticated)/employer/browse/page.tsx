import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getAnonymizedProfiles } from '@/lib/dal/employer-profiles'
import { getSavedProfileIds } from '@/lib/dal/employer-saved'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SearchInput } from './search'
import { FilterBar } from './filters'
import { ProfileCard } from '@/components/employer/profile-card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'

/**
 * Normalize a search param that may be string, string[], or undefined
 * into a string array. Handles Next.js repeated param serialization.
 */
function toArray(param: string | string[] | undefined): string[] {
  if (!param) return []
  return Array.isArray(param) ? param : [param]
}

/**
 * Employer browse page -- displays anonymized candidate profile cards
 * in a responsive grid with search, multi-dimensional filters, and pagination.
 *
 * APPROVAL GATE: Page-level check ensures only approved employers
 * can access browse. Layout only checks role, not approval status.
 *
 * SECURITY: Uses getAnonymizedProfiles DAL which NEVER selects PII
 * fields from the database (column inclusion mode).
 *
 * FILTERS: Specializations (multi-select), technical domains (multi-select),
 * patent bar (toggle), location (text), experience (dropdown).
 * All state in URL params for bookmarkable/shareable searches.
 */
export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    spec?: string | string[]
    tech?: string | string[]
    experience?: string
    patent_bar?: string
    location?: string
    page?: string
  }>
}) {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  // ToB gate -- must accept Terms of Business before browsing
  if (!employerProfile.tobAcceptedAt) {
    redirect('/employer/terms')
  }

  // Read search params (Next.js 16: searchParams is a Promise)
  const params = await searchParams

  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const pageSize = 12

  // Normalize multi-value params to arrays
  const specArray = toArray(params.spec)
  const techArray = toArray(params.tech)

  // Fetch anonymized profiles with all filters + candidate suppression
  const { profiles, total } = await getAnonymizedProfiles(
    {
      search: params.q,
      specializations: specArray.length > 0 ? specArray : undefined,
      technicalDomains: techArray.length > 0 ? techArray : undefined,
      experienceRange: params.experience,
      patentBar: params.patent_bar === 'true',
      location: params.location,
      page,
      pageSize,
    },
    user.id,
  )

  // Load saved profile IDs for the current page (batch lookup)
  const profileIds = profiles.map((p) => p.id)
  const savedIds = await getSavedProfileIds(user.id, profileIds)

  const totalPages = Math.ceil(total / pageSize)

  // Check if any filters are active
  const hasActiveFilters =
    specArray.length > 0 ||
    techArray.length > 0 ||
    !!params.experience ||
    params.patent_bar === 'true' ||
    !!params.location ||
    !!params.q

  // Build pagination URL helper -- preserves ALL filter params
  function buildPageUrl(targetPage: number) {
    const urlParams = new URLSearchParams()
    if (params.q) urlParams.set('q', params.q)
    for (const spec of specArray) {
      urlParams.append('spec', spec)
    }
    for (const tech of techArray) {
      urlParams.append('tech', tech)
    }
    if (params.experience) urlParams.set('experience', params.experience)
    if (params.patent_bar) urlParams.set('patent_bar', params.patent_bar)
    if (params.location) urlParams.set('location', params.location)
    urlParams.set('page', String(targetPage))
    return `/employer/browse?${urlParams.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-[family-name:var(--font-outfit)] text-2xl font-bold tracking-tight">
          Browse Candidates
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover qualified IP professionals
        </p>
      </div>

      {/* Search */}
      <SearchInput />

      {/* Filters */}
      <FilterBar />

      {/* Results Count */}
      <p className="text-muted-foreground text-sm">
        {total} candidate{total !== 1 ? 's' : ''} found
      </p>

      {/* Profile Cards Grid */}
      {profiles.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isSaved={savedIds.has(profile.id)}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl py-20">
          <Users className="text-teal-400 mb-4 size-12" />
          <h3 className="font-[family-name:var(--font-outfit)] text-lg font-semibold">No candidates found</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
            {hasActiveFilters
              ? 'Try broadening your filters or clearing some to see more candidates.'
              : 'No candidate profiles are available yet. Check back soon.'}
          </p>
          {hasActiveFilters && (
            <Button asChild variant="link" className="mt-2">
              <Link href="/employer/browse">Clear all filters</Link>
            </Button>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-lg transition-all"
            asChild={page > 1}
            disabled={page <= 1}
          >
            {page > 1 ? (
              <Link href={buildPageUrl(page - 1)}>
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <>
                <ChevronLeft className="size-4" />
                Previous
              </>
            )}
          </Button>

          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            className="rounded-lg transition-all"
            asChild={page < totalPages}
            disabled={page >= totalPages}
          >
            {page < totalPages ? (
              <Link href={buildPageUrl(page + 1)}>
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <>
                Next
                <ChevronRight className="size-4" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
