import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { stripeEvents, profileUnlocks } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import type Stripe from 'stripe'

/**
 * Stripe webhook handler for payment events.
 *
 * Security:
 *   - Verifies Stripe signature before processing any event
 *   - Uses raw request body (request.text()) for signature verification
 *   - Deduplicates events via stripeEvents table
 *
 * Flow:
 *   1. Verify webhook signature
 *   2. Check for duplicate event (idempotency)
 *   3. Record event in stripeEvents table
 *   4. Handle checkout.session.completed: insert profileUnlock
 *   5. Return 200 to acknowledge receipt
 */
export async function POST(request: Request) {
  let event: Stripe.Event

  try {
    // IMPORTANT: Use request.text() for raw body -- DO NOT use request.json()
    // Stripe signature verification requires the raw request body string
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Stripe webhook signature verification failed:', message)
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  try {
    // Idempotency check: skip already-processed events
    const [existing] = await db
      .select({ id: stripeEvents.id })
      .from(stripeEvents)
      .where(eq(stripeEvents.stripeEventId, event.id))
      .limit(1)

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Record event BEFORE processing (prevents concurrent duplicates via unique constraint)
    try {
      await db.insert(stripeEvents).values({
        stripeEventId: event.id,
        eventType: event.type,
      })
    } catch (insertErr) {
      // Unique constraint violation = concurrent duplicate, safe to skip
      console.warn('Duplicate Stripe event (concurrent):', event.id)
      return NextResponse.json({ received: true, duplicate: true })
    }

    // Handle specific event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Only process paid sessions
        if (session.payment_status !== 'paid') {
          console.warn(
            'Checkout session not paid, skipping:',
            session.id,
            session.payment_status
          )
          break
        }

        const { employerUserId, profileId } = session.metadata ?? {}

        if (!employerUserId || !profileId) {
          console.error(
            'Missing metadata on checkout session:',
            session.id,
            session.metadata
          )
          break
        }

        // Insert profile unlock -- onConflictDoNothing prevents double-unlock
        // (e.g., if webhook is retried after a partial failure)
        await db
          .insert(profileUnlocks)
          .values({
            employerUserId,
            profileId,
            stripeSessionId: session.id,
            amountPaid: session.amount_total ?? 0,
            currency: session.currency ?? 'usd',
          })
          .onConflictDoNothing()

        console.log(
          'Profile unlocked:',
          `employer=${employerUserId}`,
          `profile=${profileId}`,
          `session=${session.id}`
        )
        break
      }

      default:
        // Log unhandled event types for debugging, but still acknowledge
        console.log('Unhandled Stripe event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Stripe webhook processing error:', err)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
