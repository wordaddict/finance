import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'
import { sendEmail, generateUserDeniedEmail } from '@/lib/email'

const denyUserSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1, 'Reason is required for denial'),
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
    const { userId, reason } = denyUserSchema.parse(body)

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

    // Send email notification before deleting the user
    try {
      const emailTemplate = generateUserDeniedEmail(
        userToDeny.name || 'User',
        userToDeny.email,
        reason
      )
      await sendEmail(emailTemplate)
    } catch (emailError) {
      console.error('Failed to send denial email:', emailError)
      // Don't fail the request if email fails
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
