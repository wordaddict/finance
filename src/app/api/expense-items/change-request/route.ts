import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const changeRequestSchema = z.object({
  itemId: z.string().uuid(),
  comment: z.string().min(1, 'Comment is required when requesting changes to an item'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can request changes to items
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can request changes to expense items' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { itemId, comment } = changeRequestSchema.parse(body)

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
        { error: 'Can only request changes to items in submitted expenses' },
        { status: 400 }
      )
    }

    // Upsert change request (update if exists, create if not)
    const approval = await db.expenseItemApproval.upsert({
      where: {
        itemId_approverId: {
          itemId: itemId,
          approverId: user.id,
        },
      },
      update: {
        status: 'CHANGE_REQUESTED',
        comment: comment,
        approvedAmountCents: null,
        updatedAt: new Date(),
      },
      create: {
        itemId: itemId,
        approverId: user.id,
        status: 'CHANGE_REQUESTED',
        comment: comment,
        approvedAmountCents: null,
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
    console.error('Error requesting changes to expense item:', error)
    return NextResponse.json(
      { error: 'Failed to request changes to expense item' },
      { status: 500 }
    )
  }
}
