'use client'

import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { Search } from 'lucide-react'

export function SearchInput() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')

    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    router.replace(`${pathname}?${params.toString()}`)
  }, 300)

  return (
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[oklch(0.55_0_0)] size-3.5" />
      <input
        type="text"
        placeholder="Search by keywords, law school, or firm..."
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full h-10 pl-9 pr-4 bg-white border border-[oklch(0.90_0_0)] rounded-md text-[14px] outline-none focus:border-[oklch(0.80_0_0)] transition-custom"
      />
    </div>
  )
}
