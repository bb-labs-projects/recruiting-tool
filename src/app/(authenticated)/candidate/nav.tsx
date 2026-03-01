'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, User, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/candidate', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/candidate/profile', label: 'My Profile', icon: User, exact: true },
  { href: '/candidate/upload', label: 'Upload CV', icon: Upload, exact: true },
] as const

/**
 * Candidate navigation bar -- client component for active link highlighting.
 * Light gray bar with subtle active state and gold dot indicator.
 */
export function CandidateNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-secondary/50 px-6">
      <div className="inline-flex items-center gap-1 py-2">
        {navLinks.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'relative flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
