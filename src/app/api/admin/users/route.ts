import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { requireAdmin } from '@/lib/auth/require-admin'

export async function GET() {
  try {
    await requireAdmin()

    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)

    return NextResponse.json(allUsers)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin()

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'userId and role are required' }, { status: 400 })
    }

    if (!['candidate', 'employer', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const [updated] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, role: users.role })

    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
}
