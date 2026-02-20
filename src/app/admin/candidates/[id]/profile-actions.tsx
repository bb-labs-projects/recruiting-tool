'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { approveProfile, rejectProfile } from '@/actions/profiles'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ProfileActionsProps {
  profileId: string
  status: 'pending_review' | 'active' | 'rejected'
  rejectionNotes: string | null
}

export function ProfileActions({
  profileId,
  status,
  rejectionNotes,
}: ProfileActionsProps) {
  const [approveError, setApproveError] = useState<string | null>(null)
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [approvePending, startApproveTransition] = useTransition()
  const [rejectPending, startRejectTransition] = useTransition()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)

  function handleApprove() {
    setApproveError(null)
    startApproveTransition(async () => {
      const formData = new FormData()
      formData.set('profileId', profileId)
      const result = await approveProfile(formData)
      if (result.error) {
        setApproveError(result.error)
      }
    })
  }

  function handleReject(formData: FormData) {
    setRejectError(null)
    startRejectTransition(async () => {
      const result = await rejectProfile(formData)
      if (result.error) {
        setRejectError(result.error)
      } else {
        setRejectDialogOpen(false)
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {/* Approve Button */}
      {status !== 'active' && (
        <div>
          <Button
            onClick={handleApprove}
            disabled={approvePending}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="mr-1.5 size-4" />
            {approvePending ? 'Approving...' : 'Approve'}
          </Button>
          {approveError && (
            <p className="text-destructive text-xs mt-1">{approveError}</p>
          )}
        </div>
      )}

      {/* Reject Button with Dialog */}
      {status !== 'rejected' && (
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <XCircle className="mr-1.5 size-4" />
              Reject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Profile</DialogTitle>
              <DialogDescription>
                Provide a reason for rejecting this profile. This is required.
              </DialogDescription>
            </DialogHeader>
            <form action={handleReject}>
              <input type="hidden" name="profileId" value={profileId} />
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="rejectionNotes">Rejection Notes</Label>
                  <Textarea
                    id="rejectionNotes"
                    name="rejectionNotes"
                    placeholder="Explain why this profile is being rejected..."
                    defaultValue={rejectionNotes ?? ''}
                    required
                    rows={4}
                  />
                </div>
                {rejectError && (
                  <p className="text-destructive text-sm">{rejectError}</p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={rejectPending}>
                  {rejectPending ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
