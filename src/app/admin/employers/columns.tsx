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
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-teal-50 text-teal-700 border-teal-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
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
          employerStatusStyles[row.original.status]
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
