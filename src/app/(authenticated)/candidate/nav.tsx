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
