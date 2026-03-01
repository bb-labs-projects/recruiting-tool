import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getAnonymizedProfiles } from '@/lib/dal/employer-profiles'
import { getSavedProfileIds } from '@/lib/dal/employer-saved'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SearchInput } from './search'
import { FilterBar } from './filters'
import { ProfileCard } from '@/components/employer/profile-card'
import { ChevronLeft, ChevronRight } from 'lucide-react'

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

  // Pagination range display
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

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
      <div className="flex items-baseline gap-3">
        <h1 className="font-sans text-2xl font-semibold">
          Browse Candidates
        </h1>
        <span className="text-muted-foreground font-mono text-xs">
          {total} candidate{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <SearchInput />
        <FilterBar />
      </div>

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
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground font-mono text-[11px] uppercase tracking-widest">
            No Candidates Found
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {hasActiveFilters
              ? 'Try broadening your filters'
              : 'No candidate profiles are available yet. Check back soon.'}
          </p>
          {hasActiveFilters && (
            <Link
              href="/employer/browse"
              className="text-brand mt-2 text-sm hover:underline"
            >
              Clear filters
            </Link>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          {page > 1 ? (
            <Link
              href={buildPageUrl(page - 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Link>
          ) : (
            <span className="text-muted-foreground/40">
              <ChevronLeft className="size-4" />
            </span>
          )}

          <span className="text-muted-foreground font-mono text-xs">
            Showing {start}-{end} of {total}
          </span>

          {page < totalPages ? (
            <Link
              href={buildPageUrl(page + 1)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Link>
          ) : (
            <span className="text-muted-foreground/40">
              <ChevronRight className="size-4" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}
