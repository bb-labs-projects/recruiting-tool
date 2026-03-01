'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const EMPLOYER_LINKS = [
  { href: '/employer/browse', label: 'Browse', exact: false },
  { href: '/employer/jobs', label: 'Jobs', exact: false },
  { href: '/employer/saved', label: 'Saved', exact: true },
  { href: '/employer/purchases', label: 'Purchases', exact: true },
] as const

const CANDIDATE_LINKS = [
  { href: '/candidate', label: 'Dashboard', exact: true },
  { href: '/candidate/profile', label: 'Profile', exact: true },
  { href: '/candidate/upload', label: 'Upload CV', exact: true },
] as const

export function HeaderNav({ role }: { role: string }) {
  const pathname = usePathname()
  const links = role === 'employer' ? EMPLOYER_LINKS : CANDIDATE_LINKS

  return (
    <nav className="flex flex-1 justify-center">
      <div className="flex items-center gap-8">
        {links.map(({ href, label, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative text-[13px] transition-custom',
                isActive
                  ? 'text-white active-nav-dot'
                  : 'text-[oklch(0.60_0_0)] hover:text-white'
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
