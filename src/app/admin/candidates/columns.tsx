'use client'

import { type ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/admin/status-badge'
import { ConfidenceBadge } from '@/components/admin/confidence-badge'

export type CandidateRow = {
  id: string
  name: string
  email: string | null
  status: 'pending_review' | 'active' | 'rejected'
  specializations: string[]
  lowestConfidence: 'high' | 'medium' | 'low'
  createdAt: string
}

const confidenceRank: Record<string, number> = {
  low: 0,
  medium: 1,
  high: 2,
}

export const columns: ColumnDef<CandidateRow>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Name
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <a
        href={`/admin/candidates/${row.original.id}`}
        className="font-medium hover:underline"
      >
        {row.original.name}
      </a>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: 'equals',
  },
  {
    accessorKey: 'lowestConfidence',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Attention
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => (
      <ConfidenceBadge level={row.original.lowestConfidence} />
    ),
    sortingFn: (rowA, rowB, columnId) => {
      const a = confidenceRank[rowA.getValue<string>(columnId)] ?? 2
      const b = confidenceRank[rowB.getValue<string>(columnId)] ?? 2
      return a - b
    },
  },
  {
    accessorKey: 'specializations',
    header: 'Specializations',
    cell: ({ row }) => {
      const specs = row.original.specializations
      if (specs.length === 0) {
        return <span className="text-muted-foreground">None</span>
      }
      if (specs.length <= 3) {
        return <span>{specs.join(', ')}</span>
      }
      return (
        <span title={specs.join(', ')}>
          {specs.slice(0, 3).join(', ')} +{specs.length - 3} more
        </span>
      )
    },
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Added
        <ArrowUpDown className="ml-1 size-3.5" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt)
      return <span>{date.toLocaleDateString()}</span>
    },
  },
]
