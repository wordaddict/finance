import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'

const denyItemSchema = z.object({
  itemId: z.string().uuid(),
  comment: z.string().min(1, 'Comment is required when denying an item'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can deny items
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can deny expense items' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { itemId, comment } = denyItemSchema.parse(body)

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
        { error: 'Can only deny items in submitted expenses' },
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
        status: 'DENIED',
        comment: comment,
        updatedAt: new Date(),
      },
      create: {
        itemId: itemId,
        approverId: user.id,
        status: 'DENIED',
        comment: comment,
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
    console.error('Error denying expense item:', error)
    return NextResponse.json(
      { error: 'Failed to deny expense item' },
      { status: 500 }
    )
  }
}
