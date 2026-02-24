'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { href: '/candidate', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/candidate/profile', label: 'My Profile', icon: FileText, exact: true },
  { href: '/candidate/upload', label: 'Upload CV', icon: Upload, exact: true },
] as const

export function CandidateNav() {
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
