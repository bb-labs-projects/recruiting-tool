'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Briefcase, Heart, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/employer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/employer/browse', label: 'Browse', icon: Search, exact: false },
  { href: '/employer/jobs', label: 'Jobs', icon: Briefcase, exact: false },
  { href: '/employer/saved', label: 'Saved', icon: Heart, exact: true },
  { href: '/employer/purchases', label: 'Purchases', icon: Receipt, exact: true },
] as const

/**
 * Employer navigation bar -- client component for active link highlighting.
 * Shows Dashboard, Browse, and Saved links with icons.
 * Active link is determined by pathname matching.
 */
export function EmployerNav() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border/60 bg-card px-6">
      <div className="flex h-11 items-center gap-1">
        {navLinks.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
