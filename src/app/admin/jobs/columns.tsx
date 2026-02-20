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
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  open: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

const matchingStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
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
