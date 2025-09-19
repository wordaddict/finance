import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'
import { sendEmail, generateUserApprovedEmail } from '@/lib/email'

const approveUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
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
    const { userId, reason } = approveUserSchema.parse(body)

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

    // Send email notification
    try {
      const emailTemplate = generateUserApprovedEmail(
        userToApprove.name || 'User',
        userToApprove.email,
        reason
      )
      await sendEmail(emailTemplate)
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the request if email fails
    }

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
