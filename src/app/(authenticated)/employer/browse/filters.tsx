'use client'

import { useRef, useState } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover as PopoverPrimitive } from 'radix-ui'
import { ChevronDown, X, MapPin } from 'lucide-react'

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
 * Multi-select dropdown filter using Radix Popover.
 * Renders a compact trigger button with a dropdown of checkboxes.
 */
function MultiSelectFilter({
  label,
  options,
  activeValues,
  onToggle,
}: {
  label: string
  options: string[]
  activeValues: string[]
  onToggle: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const count = activeValues.length

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="border-input flex items-center gap-1.5 rounded-md border bg-transparent px-3 py-1.5 text-xs transition-colors hover:bg-muted/50"
        >
          {label}
          {count > 0 && (
            <span className="bg-brand text-brand-foreground rounded px-1 py-0.5 text-[10px] font-medium leading-none">
              {count}
            </span>
          )}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="bg-popover text-popover-foreground z-50 min-w-[180px] rounded-md border p-2 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="flex flex-col gap-1">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              >
                <Checkbox
                  checked={activeValues.includes(option)}
                  onCheckedChange={() => onToggle(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

/**
 * Comprehensive filter bar for employer browse page.
 * Horizontal row of compact dropdown triggers for multi-select and single-select filters.
 * All filter state lives in URL search params for bookmarkable/shareable searches.
 * Changing any filter resets page to 1.
 */
export function FilterBar() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const locationRef = useRef<HTMLInputElement>(null)

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
    // Reset the location input
    if (locationRef.current) {
      locationRef.current.value = ''
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Specializations -- multi-select dropdown */}
      <MultiSelectFilter
        label="Specialization"
        options={SPECIALIZATIONS}
        activeValues={activeSpecs}
        onToggle={(value) => toggleMultiParam('spec', value, activeSpecs)}
      />

      {/* Technical Domains -- multi-select dropdown */}
      <MultiSelectFilter
        label="Technical Domain"
        options={TECHNICAL_DOMAINS}
        activeValues={activeTechs}
        onToggle={(value) => toggleMultiParam('tech', value, activeTechs)}
      />

      {/* Experience Range -- single-select dropdown */}
      <Select
        value={activeExperience || 'all'}
        onValueChange={(value) => setSingleParam('experience', value)}
      >
        <SelectTrigger className="h-auto gap-1.5 border px-3 py-1.5 text-xs shadow-none">
          <SelectValue placeholder="Experience" />
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

      {/* Patent Bar -- compact toggle button */}
      <button
        type="button"
        onClick={() => setSingleParam('patent_bar', activePatentBar ? '' : 'true')}
        className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs transition-colors ${
          activePatentBar
            ? 'border-brand bg-brand/10 text-foreground'
            : 'border-input bg-transparent hover:bg-muted/50'
        }`}
      >
        Patent Bar
        {activePatentBar && (
          <span className="bg-brand text-brand-foreground rounded px-1 py-0.5 text-[10px] font-medium leading-none">
            On
          </span>
        )}
      </button>

      {/* Location -- compact input with icon */}
      <div className="relative">
        <MapPin className="text-muted-foreground absolute left-2.5 top-1/2 size-3 -translate-y-1/2" />
        <input
          ref={locationRef}
          type="text"
          placeholder="Location..."
          defaultValue={activeLocation}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="border-input bg-transparent placeholder:text-muted-foreground h-auto w-[140px] rounded-md border py-1.5 pl-7 pr-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-[color,box-shadow]"
        />
      </div>

      {/* Clear All Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="text-muted-foreground flex items-center gap-1 px-2 py-1.5 text-xs transition-colors hover:text-foreground"
        >
          <X className="size-3" />
          Clear
        </button>
      )}
    </div>
  )
}
