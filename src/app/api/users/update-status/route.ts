import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'

const updateUserStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update user status' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, status } = updateUserStatusSchema.parse(body)

    const userToUpdate = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Avoid unnecessary writes
    if (userToUpdate.status === status) {
      return NextResponse.json({ message: 'Status already set' })
    }

    const updateData: any = { status }

    // If moving from pending to active, ensure email is marked verified
    if (status === 'ACTIVE' && userToUpdate.status === 'PENDING_APPROVAL') {
      updateData.emailVerifiedAt = new Date()
    }

    await db.user.update({
      where: { id: userId },
      data: updateData,
    })

    return NextResponse.json({ message: 'User status updated successfully' })
  } catch (error) {
    console.error('Update user status error:', error)
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    )
  }
}

