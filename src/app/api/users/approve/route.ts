import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'

const approveUserSchema = z.object({
  userId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId } = approveUserSchema.parse(body)

    // Get the user to approve
    const userToApprove = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToApprove) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (userToApprove.status !== 'PENDING_APPROVAL' && userToApprove.status !== 'SUSPENDED') {
      return NextResponse.json(
        { error: 'User is not pending approval or suspended' },
        { status: 400 }
      )
    }

    // Update user status to active
    const updateData: any = {
      status: 'ACTIVE',
    }

    // Only set emailVerifiedAt for pending approval users (not suspended users)
    if (userToApprove.status === 'PENDING_APPROVAL') {
      updateData.emailVerifiedAt = new Date()
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    const action = userToApprove.status === 'PENDING_APPROVAL' ? 'approved' : 'reactivated'
    return NextResponse.json({
      message: `User ${action} successfully`,
    })
  } catch (error) {
    console.error('Approve user error:', error)
    return NextResponse.json(
      { error: 'Failed to approve user' },
      { status: 500 }
    )
  }
}
