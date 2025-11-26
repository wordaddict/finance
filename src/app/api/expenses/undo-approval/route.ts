import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses } from '@/lib/rbac'

const undoApprovalSchema = z.object({
  expenseId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and approval permissions
    const user = await requireAuth()

    if (!canApproveExpenses(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to undo approvals' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId } = undoApprovalSchema.parse(body)

    // Get expense with current status
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        approvals: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Only allow undoing if expense is APPROVED or DENIED
    if (expense.status !== 'APPROVED' && expense.status !== 'DENIED') {
      return NextResponse.json(
        { error: 'Can only undo approval/denial for expenses that are approved or denied' },
        { status: 400 }
      )
    }

    // Delete all approvals for this expense
    await db.approval.deleteMany({
      where: { expenseId },
    })

    // Reset expense status to SUBMITTED
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { status: 'SUBMITTED' },
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: expense.status as any,
        to: 'SUBMITTED',
        actorId: user.id,
        reason: 'Approval/denial undone',
      },
    })

    return NextResponse.json({
      message: 'Approval undone successfully',
    })
  } catch (error) {
    console.error('Undo approval error:', error)
    return NextResponse.json(
      { error: 'Failed to undo approval' },
      { status: 500 }
    )
  }
}

