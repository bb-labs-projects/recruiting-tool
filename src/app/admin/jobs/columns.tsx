'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AdminJobListDTO } from '@/lib/dal/jobs'

type JobRow = {
  id: string
  title: string
  status: AdminJobListDTO['status']
  matchingStatus: AdminJobListDTO['matchingStatus']
  employerCompanyName: string | null
  matchCount: number
  createdAt: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-amber-50 text-amber-700 border-amber-200',
  open: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-stone-100 text-stone-600 border-stone-200',
  archived: 'bg-stone-100 text-stone-600 border-stone-200',
}

const matchingStatusColors: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  running: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-teal-50 text-teal-700 border-teal-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
}

export type { JobRow }

export const columns: ColumnDef<JobRow>[] = [
  {
    accessorKey: 'title',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Title
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <a
        href={`/admin/jobs/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.title}
      </a>
    ),
  },
  {
    accessorKey: 'employerCompanyName',
    header: 'Employer',
    cell: ({ row }) =>
      row.original.employerCompanyName ?? (
        <span className="text-muted-foreground">Unknown</span>
      ),
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge className={statusColors[row.original.status] ?? ''}>
        {row.original.status}
      </Badge>
    ),
    filterFn: 'equals',
  },
  {
    accessorKey: 'matchingStatus',
    header: 'Matching',
    cell: ({ row }) => (
      <Badge className={matchingStatusColors[row.original.matchingStatus] ?? ''}>
        {row.original.matchingStatus}
      </Badge>
    ),
  },
  {
    accessorKey: 'matchCount',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Matches
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => <span>{row.original.matchCount}</span>,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Created
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return <span>{date.toLocaleDateString()}</span>
    },
  },
]
