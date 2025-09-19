import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const approveItemSchema = z.object({
  itemId: z.string().uuid(),
  comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can approve items
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can approve expense items' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { itemId, comment } = approveItemSchema.parse(body)

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

    // Check if expense is still in SUBMITTED status
    if (item.expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Can only approve items in submitted expenses' },
        { status: 400 }
      )
    }

    // Upsert approval (update if exists, create if not)
    const approval = await db.expenseItemApproval.upsert({
      where: {
        itemId_approverId: {
          itemId: itemId,
          approverId: user.id,
        },
      },
      update: {
        status: 'APPROVED',
        comment: comment || null,
        updatedAt: new Date(),
      },
      create: {
        itemId: itemId,
        approverId: user.id,
        status: 'APPROVED',
        comment: comment || null,
      },
      include: {
        approver: true,
      },
    })

    return NextResponse.json({
      success: true,
      approval,
    })
  } catch (error) {
    console.error('Error approving expense item:', error)
    return NextResponse.json(
      { error: 'Failed to approve expense item' },
      { status: 500 }
    )
  }
}
