import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'

const denyUserSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deny users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = denyUserSchema.parse(body)

    // Get the user to deny
    const userToDeny = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToDeny) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToDeny.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'User is not pending approval' },
        { status: 400 }
      )
    }

    // Delete the user (deny their registration)
    await db.user.delete({
      where: { id: userId },
    })

    return NextResponse.json({
      message: 'User registration denied successfully',
    })
  } catch (error) {
    console.error('Deny user error:', error)
    return NextResponse.json(
      { error: 'Failed to deny user' },
      { status: 500 }
    )
  }
}
