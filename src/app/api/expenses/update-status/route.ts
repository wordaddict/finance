import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const updateStatusSchema = z.object({
  expenseId: z.string().uuid(),
  status: z.enum(['PARTIALLY_APPROVED', 'CHANGE_REQUESTED']),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can update expense status
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update expense status' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, status } = updateStatusSchema.parse(body)

    // Check if expense exists
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    if (expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Can only update status of submitted expenses' },
        { status: 400 }
      )
    }

    // Update expense status
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { status },
    })

    // Create status event
    const reason = status === 'PARTIALLY_APPROVED' 
      ? 'Mixed item approvals - some approved, some denied'
      : 'All items require changes'
    
    await db.statusEvent.create({
      data: {
        expenseId,
        from: 'SUBMITTED',
        to: status,
        actorId: user.id,
        reason,
      },
    })

    return NextResponse.json({
      message: 'Expense status updated successfully',
    })
  } catch (error) {
    console.error('Update expense status error:', error)
    return NextResponse.json(
      { error: 'Failed to update expense status' },
      { status: 500 }
    )
  }
}
