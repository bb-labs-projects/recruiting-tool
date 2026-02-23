import 'server-only'
import Stripe from 'stripe'

let _stripe: Stripe

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    _stripe ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
      typescript: true,
    })
    return _stripe[prop as keyof Stripe]
  },
})
