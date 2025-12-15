import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'

const updateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['ADMIN', 'CAMPUS_PASTOR', 'LEADER']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update user role' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, role } = updateUserRoleSchema.parse(body)

    const userToUpdate = await db.user.findUnique({
      where: { id: userId },
    })

    if (!userToUpdate) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Avoid unnecessary writes
    if (userToUpdate.role === role) {
      return NextResponse.json({ message: 'Role already set' })
    }

    await db.user.update({
      where: { id: userId },
      data: { role },
    })

    return NextResponse.json({ message: 'User role updated successfully' })
  } catch (error) {
    console.error('Update user role error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}

