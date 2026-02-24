'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Shield, ShieldOff } from 'lucide-react'

type User = {
  id: string
  email: string
  role: 'candidate' | 'employer' | 'admin'
  createdAt: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{ user: User; newRole: string } | null>(null)

  async function fetchUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      setUsers(await res.json())
    }
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function changeRole(userId: string, role: string) {
    setUpdating(userId)
    setConfirmTarget(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      })
      if (res.ok) {
        await fetchUsers()
      }
    } finally {
      setUpdating(null)
    }
  }

  function roleBadge(role: string) {
    switch (role) {
      case 'admin':
        return <Badge className="bg-teal-600 text-white hover:bg-teal-600">Admin</Badge>
      case 'employer':
        return <Badge variant="secondary">Employer</Badge>
      case 'candidate':
        return <Badge variant="outline">Candidate</Badge>
      default:
        return <Badge variant="outline">{role}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const admins = users.filter((u) => u.role === 'admin')
  const nonAdmins = users.filter((u) => u.role !== 'admin')

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight font-[family-name:var(--font-outfit)]">Manage Users</h1>
        <p className="text-muted-foreground">
          Promote users to admin or revoke admin access.
        </p>
      </div>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) setConfirmTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmTarget?.newRole === 'admin' ? 'Grant Admin Access' : 'Revoke Admin Access'}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.newRole === 'admin' ? (
                <>
                  Make <span className="font-medium text-foreground">{confirmTarget?.user.email}</span> an admin?
                  They will have full access to all admin features.
                </>
              ) : (
                <>
                  Remove admin access from <span className="font-medium text-foreground">{confirmTarget?.user.email}</span>?
                  They will be changed to a {confirmTarget?.newRole} account.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmTarget?.newRole === 'admin' ? 'default' : 'destructive'}
              disabled={!!updating}
              onClick={() => confirmTarget && changeRole(confirmTarget.user.id, confirmTarget.newRole)}
            >
              {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {confirmTarget?.newRole === 'admin' ? 'Grant Admin' : 'Revoke Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {admins.length > 0 && (
        <Card className="mb-6 rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Admins ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {admins.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <Shield className="size-4 text-teal-600" />
                    <span className="text-sm font-medium">{user.email}</span>
                    {roleBadge(user.role)}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={updating === user.id || admins.length <= 1}
                    title={admins.length <= 1 ? 'Cannot remove the last admin' : 'Revoke admin access'}
                    onClick={() => setConfirmTarget({ user, newRole: 'candidate' })}
                  >
                    <ShieldOff className="mr-1 size-4" />
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>All Users ({nonAdmins.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {nonAdmins.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No non-admin users yet.</p>
          ) : (
            <div className="divide-y">
              {nonAdmins.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{user.email}</span>
                    {roleBadge(user.role)}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updating === user.id}
                    onClick={() => setConfirmTarget({ user, newRole: 'admin' })}
                  >
                    {updating === user.id ? (
                      <Loader2 className="mr-1 size-4 animate-spin" />
                    ) : (
                      <Shield className="mr-1 size-4" />
                    )}
                    Make Admin
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
