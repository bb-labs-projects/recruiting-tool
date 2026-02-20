'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'

const SPECIALIZATIONS = [
  'Patent Prosecution',
  'Trademark',
  'Copyright',
  'Trade Secrets',
  'IP Litigation',
  'Licensing',
]

const TECHNICAL_DOMAINS = [
  'Biotechnology',
  'Chemical',
  'Computer Science',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Pharmaceutical',
  'Software',
  'Telecommunications',
]

const EXPERIENCE_RANGES = [
  { value: '< 2 years', label: '< 2 years' },
  { value: '2-5 years', label: '2-5 years' },
  { value: '5-10 years', label: '5-10 years' },
  { value: '10-15 years', label: '10-15 years' },
  { value: '15-20 years', label: '15-20 years' },
  { value: '20+ years', label: '20+ years' },
]

/**
 * Comprehensive filter bar for employer browse page.
 * Multi-select specializations and technical domains via checkboxes,
 * patent bar toggle, location text input with debounce, experience dropdown.
 * All filter state lives in URL search params for bookmarkable/shareable searches.
 * Changing any filter resets page to 1.
 */
export function FilterBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Read current filter state from URL params
  const activeSpecs = searchParams.getAll('spec')
  const activeTechs = searchParams.getAll('tech')
  const activeExperience = searchParams.get('experience') ?? ''
  const activePatentBar = searchParams.get('patent_bar') === 'true'
  const activeLocation = searchParams.get('location') ?? ''

  // Check if any filters are active (excluding search query)
  const hasActiveFilters =
    activeSpecs.length > 0 ||
    activeTechs.length > 0 ||
    activeExperience !== '' ||
    activePatentBar ||
    activeLocation !== ''

  /**
   * Toggle a value in a multi-value param (spec or tech).
   * Uses repeated params: spec=A&spec=B
   */
  function toggleMultiParam(key: string, value: string, currentValues: string[]) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    // Remove all existing values for this key
    params.delete(key)

    // Re-add remaining values (toggle the clicked one)
    const isActive = currentValues.includes(value)
    const newValues = isActive
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value]

    for (const v of newValues) {
      params.append(key, v)
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  /**
   * Set a single-value param (experience, patent_bar).
   */
  function setSingleParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (value === '' || value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  /**
   * Debounced location input handler.
   */
  const handleLocationChange = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (term) {
      params.set('location', term)
    } else {
      params.delete('location')
    }

    router.replace(`${pathname}?${params.toString()}`)
  }, 300)

  /**
   * Clear all filters (keep search query q intact).
   */
  function clearAllFilters() {
    const params = new URLSearchParams()
    const q = searchParams.get('q')
    if (q) params.set('q', q)
    params.set('page', '1')
    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {/* Specializations -- multi-select checkboxes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Specializations</p>
          <div className="flex flex-col gap-1.5">
            {SPECIALIZATIONS.map((spec) => (
              <label
                key={spec}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={activeSpecs.includes(spec)}
                  onCheckedChange={() =>
                    toggleMultiParam('spec', spec, activeSpecs)
                  }
                />
                {spec}
              </label>
            ))}
          </div>
        </div>

        {/* Technical Domains -- multi-select checkboxes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Technical Domains</p>
          <div className="flex flex-col gap-1.5">
            {TECHNICAL_DOMAINS.map((domain) => (
              <label
                key={domain}
                className="flex items-center gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  checked={activeTechs.includes(domain)}
                  onCheckedChange={() =>
                    toggleMultiParam('tech', domain, activeTechs)
                  }
                />
                {domain}
              </label>
            ))}
          </div>
        </div>

        {/* Right-side filters: Experience, Patent Bar, Location */}
        <div className="space-y-4">
          {/* Experience Range -- single-select dropdown */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Experience</p>
            <Select
              value={activeExperience || 'all'}
              onValueChange={(value) => setSingleParam('experience', value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Experience" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Experience</SelectItem>
                {EXPERIENCE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Patent Bar -- toggle checkbox */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Certifications</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={activePatentBar}
                onCheckedChange={(checked) =>
                  setSingleParam('patent_bar', checked ? 'true' : '')
                }
              />
              USPTO Patent Bar
            </label>
          </div>

          {/* Location -- debounced text input */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Location</p>
            <Input
              placeholder="e.g. California, New York..."
              defaultValue={activeLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAllFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 size-4" />
          Clear all filters
        </Button>
      )}
    </div>
  )
}
