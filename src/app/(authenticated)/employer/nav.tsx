'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Briefcase, Heart, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/employer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/employer/browse', label: 'Browse', icon: Search, exact: false },
  { href: '/employer/jobs', label: 'Jobs', icon: Briefcase, exact: false },
  { href: '/employer/saved', label: 'Saved', icon: Heart, exact: true },
  { href: '/employer/purchases', label: 'Purchases', icon: CreditCard, exact: true },
] as const

/**
 * Employer navigation bar -- client component for active link highlighting.
 * Light gray bar with subtle active state and gold dot indicator.
 */
export function EmployerNav() {
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
