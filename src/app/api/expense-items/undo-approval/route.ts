import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const undoItemApprovalSchema = z.object({
  itemId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can undo item approvals
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can undo expense item approvals' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { itemId } = undoItemApprovalSchema.parse(body)

    // Check if item exists and get the expense
    const item = await db.expenseItem.findUnique({
      where: { id: itemId },
      include: {
        expense: true,
        approvals: {
          where: { approverId: user.id },
        },
      },
    })

    if (!item) {
      return NextResponse.json(
        { error: 'Expense item not found' },
        { status: 404 }
      )
    }

    // Check if expense is in a state that allows undoing approvals
    if (item.expense.status !== 'SUBMITTED' && item.expense.status !== 'APPROVED' && item.expense.status !== 'DENIED') {
      return NextResponse.json(
        { error: 'Can only undo approvals for expenses in submitted, approved, or denied status' },
        { status: 400 }
      )
    }

    // Delete all approvals for this item by this user
    await db.expenseItemApproval.deleteMany({
      where: {
        itemId,
        approverId: user.id,
      },
    })

    return NextResponse.json({
      message: 'Item approval undone successfully',
    })
  } catch (error) {
    console.error('Error undoing item approval:', error)
    return NextResponse.json(
      { error: 'Failed to undo item approval' },
      { status: 500 }
    )
  }
}

