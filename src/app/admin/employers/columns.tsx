'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type EmployerRow = {
  id: string
  companyName: string
  contactName: string
  contactTitle: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  reviewedAt: string | null
  userEmail: string
}

const employerStatusStyles = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
} as const

const employerStatusLabels = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
} as const

export const columns: ColumnDef<EmployerRow>[] = [
  {
    accessorKey: 'companyName',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Company
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <a
        href={`/admin/employers/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.companyName}
      </a>
    ),
  },
  {
    accessorKey: 'contactName',
    header: 'Contact',
    cell: ({ row }) => <span>{row.original.contactName}</span>,
  },
  {
    accessorKey: 'userEmail',
    header: 'Email',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.userEmail}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={cn(
          employerStatusStyles[row.original.status],
          'border-transparent'
        )}
      >
        {employerStatusLabels[row.original.status]}
      </Badge>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Applied
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return <span>{date.toLocaleDateString()}</span>
    },
  },
]
