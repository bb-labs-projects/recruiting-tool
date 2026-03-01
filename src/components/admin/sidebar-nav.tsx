'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileUp,
  Megaphone,
  Users,
  Building2,
  Briefcase,
  BarChart3,
  Shield,
} from 'lucide-react'

const navItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'CV Upload', href: '/admin/cv-upload', icon: FileUp },
  { name: 'Job Ads', href: '/admin/job-ads', icon: Megaphone },
  { name: 'Candidates', href: '/admin/candidates', icon: Users },
  { name: 'Employers', href: '/admin/employers', icon: Building2 },
  { name: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Users', href: '/admin/users', icon: Shield },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-3 py-4">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
                  isActive
                    ? 'text-white bg-sidebar-accent border-l-[3px] border-brand'
                    : 'text-sidebar-foreground/50 hover:text-sidebar-foreground/80 hover:bg-sidebar-accent/50'
                }`}
              >
                <Icon className="size-4" />
                {item.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
