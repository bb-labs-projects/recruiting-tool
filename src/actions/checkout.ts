'use server'

import { redirect } from 'next/navigation'
import { getUser } from '@/lib/dal'
import { getEmployerProfile } from '@/lib/dal/admin-employers'
import { isProfileUnlocked } from '@/lib/dal/employer-unlocks'
import { stripe } from '@/lib/stripe'

/**
 * Create a Stripe Checkout Session for a profile unlock.
 *
 * Pre-checks:
 *   1. User must be authenticated and have role 'employer'
 *   2. Employer profile must exist and be approved
 *   3. Profile must not already be unlocked (prevents double-charge)
 *
 * On success, redirects to Stripe Checkout.
 * The actual unlock is recorded only after webhook confirmation.
 */
export async function createCheckoutSession(profileId: string) {
  const user = await getUser()
  if (!user || user.role !== 'employer') {
    throw new Error('Unauthorized: employer role required')
  }

  const employerProfile = await getEmployerProfile(user.id)
  if (!employerProfile || employerProfile.status !== 'approved') {
    throw new Error('Employer profile must be approved to unlock profiles')
  }

  // Prevent double-charge: if already unlocked, redirect to profile
  const alreadyUnlocked = await isProfileUnlocked(user.id, profileId)
  if (alreadyUnlocked) {
    redirect(`/employer/browse/${profileId}`)
  }

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_URL ||
    'http://localhost:3000'

  const priceAmount = parseInt(process.env.STRIPE_PRICE_AMOUNT || '9900', 10)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: user.email,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: priceAmount,
          product_data: {
            name: 'Profile Unlock',
            description:
              'Unlock full candidate profile including contact details and work history',
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      employerUserId: user.id,
      profileId,
      employerProfileId: employerProfile.id,
    },
    success_url: `${baseUrl}/employer/browse/${profileId}?unlocked=pending`,
    cancel_url: `${baseUrl}/employer/browse/${profileId}`,
  })

  if (!session.url) {
    throw new Error('Failed to create checkout session')
  }

  redirect(session.url)
}
