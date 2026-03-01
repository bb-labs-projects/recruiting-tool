import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { getEmployerPurchases } from '@/lib/dal/employer-unlocks'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Receipt, ExternalLink, Users } from 'lucide-react'

/**
 * Purchase history page -- shows all profiles the employer has unlocked via Stripe.
 *
 * APPROVAL GATE: Same pattern as browse/saved pages -- only approved employers can access.
 *
 * DATA LOADING: Gets all employer purchases from employer-unlocks DAL, which includes
 * profile specializations joined for display.
 */
export default async function PurchaseHistoryPage() {
  // Approval gate
  const user = await getUser()
  if (!user) redirect('/login')
  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    redirect('/employer')
  }

  const purchases = await getEmployerPurchases(user.id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="font-sans text-2xl font-bold tracking-tight">Purchase History</h1>
        <p className="text-muted-foreground mt-1">
          Profiles you&apos;ve unlocked via payment
        </p>
      </div>

      {/* Count */}
      <p className="text-muted-foreground text-sm">
        {purchases.length} unlocked profile{purchases.length !== 1 ? 's' : ''}
      </p>

      {/* Purchase List */}
      {purchases.length > 0 ? (
        <div className="space-y-3">
          {purchases.map((purchase) => (
            <Card key={purchase.profileId} className="rounded-xl shadow-sm">
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  {/* Specializations */}
                  <div className="flex flex-wrap gap-1.5">
                    {purchase.specializations.length > 0 ? (
                      purchase.specializations.map((spec) => (
                        <Badge key={spec} variant="secondary" className="text-xs">
                          {spec}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        IP Professional
                      </span>
                    )}
                  </div>
                  {/* Date and amount */}
                  <p className="text-muted-foreground text-sm">
                    Unlocked on{' '}
                    {purchase.unlockedAt.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' '}
                    &middot;{' '}
                    ${(purchase.amountPaid / 100).toFixed(2)}{' '}
                    {purchase.currency.toUpperCase()}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-lg transition-all">
                  <Link href={`/employer/browse/${purchase.profileId}`}>
                    <ExternalLink className="size-4" />
                    View Profile
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl py-20">
          <Receipt className="text-teal-400 mb-4 size-12" />
          <h3 className="font-sans text-lg font-semibold">No purchases yet</h3>
          <p className="text-muted-foreground mt-1 max-w-md text-center text-sm">
            Browse candidates and unlock profiles to see their full details.
          </p>
          <Button asChild variant="link" className="mt-2">
            <Link href="/employer/browse">Browse Candidates</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
