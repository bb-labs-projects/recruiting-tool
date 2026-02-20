'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const SPECIALIZATIONS = [
  'Patent Prosecution',
  'Trademark',
  'Copyright',
  'Trade Secrets',
  'IP Litigation',
  'Licensing',
]

const EXPERIENCE_RANGES = [
  { value: '<2', label: '< 2 years' },
  { value: '2-5', label: '2-5 years' },
  { value: '5-10', label: '5-10 years' },
  { value: '10-15', label: '10-15 years' },
  { value: '15-20', label: '15-20 years' },
  { value: '20+', label: '20+ years' },
]

/**
 * Filter bar for employer browse page.
 * Specialization and experience range dropdowns that update URL params.
 * Resets page to 1 on filter change.
 */
export function FilterBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (value === 'all') {
      params.delete(key)
    } else {
      params.set(key, value)
    }

    router.replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex gap-3">
      <Select
        defaultValue={searchParams.get('spec') ?? 'all'}
        onValueChange={(value) => updateFilter('spec', value)}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="All Specializations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Specializations</SelectItem>
          {SPECIALIZATIONS.map((spec) => (
            <SelectItem key={spec} value={spec}>
              {spec}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        defaultValue={searchParams.get('experience') ?? 'all'}
        onValueChange={(value) => updateFilter('experience', value)}
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
  )
}
