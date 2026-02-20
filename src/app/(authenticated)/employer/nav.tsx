'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, Heart, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/employer', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/employer/browse', label: 'Browse', icon: Search, exact: false },
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
    <nav className="border-b bg-background px-6">
      <div className="flex h-10 items-center gap-6">
        {navLinks.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 text-sm transition-colors hover:text-foreground',
                isActive
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
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
