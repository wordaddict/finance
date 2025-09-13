import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'

const suspendUserSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to suspend users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = suspendUserSchema.parse(body)

    // Get the user to suspend
    const userToSuspend = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToSuspend) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToSuspend.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot suspend your own account' },
        { status: 400 }
      )
    }

    // Update user status to suspended
    await db.user.update({
      where: { id: userId },
      data: {
        status: 'SUSPENDED',
      },
    })

    return NextResponse.json({
      message: 'User suspended successfully',
    })
  } catch (error) {
    console.error('Suspend user error:', error)
    return NextResponse.json(
      { error: 'Failed to suspend user' },
      { status: 500 }
    )
  }
}
