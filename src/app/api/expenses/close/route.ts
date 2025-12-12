import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canMarkAsPaid } from '@/lib/rbac'

const closeExpenseSchema = z.object({
  expenseId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and payment permissions (same as mark-paid)
    const user = await requireAuth()

    if (!canMarkAsPaid(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to close expenses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId } = closeExpenseSchema.parse(body)

    // Get expense with current status
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
        items: {
          include: {
            approvals: true,
          },
        },
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Allow closing if expense is APPROVED, PARTIALLY_APPROVED, PAID, or EXPENSE_REPORT_REQUESTED
    // This allows admins to close expenses even if reportRequired is true
    if (!['APPROVED', 'PARTIALLY_APPROVED', 'PAID', 'EXPENSE_REPORT_REQUESTED'].includes(expense.status)) {
      return NextResponse.json(
        { error: 'Expense request must be approved, paid, or expense report requested to be closed' },
        { status: 400 }
      )
    }

    // Calculate payment amount if not already paid
    let paymentAmountCents: number = expense.paidAmountCents || 0
    let totalPaidAmountCents: number = expense.paidAmountCents || 0

    if (!expense.paidAt) {
      // Calculate approved amount
      paymentAmountCents = expense.amountCents // Default to full amount
      
      if (expense.items && expense.items.length > 0) {
        // For itemized expenses, calculate sum of approved amounts
        paymentAmountCents = expense.items.reduce((total: number, item: any) => {
          const itemApproval = item.approvals?.[0]
          if (itemApproval?.status === 'APPROVED') {
            return total + (itemApproval.approvedAmountCents ?? item.amountCents)
          }
          return total
        }, 0)
      }
      totalPaidAmountCents = paymentAmountCents
    }

    // Update expense status to CLOSED
    // Set reportRequired to false since we're closing it without requiring a report
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        status: 'CLOSED' as any,
        reportRequired: false, // Close without requiring a report
        paidAt: expense.paidAt || new Date(), // Set paidAt if not already set
        paidAmountCents: totalPaidAmountCents, // Update paid amount if not already set
      },
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: expense.status as any,
        to: 'CLOSED' as any,
        actorId: user.id,
        reason: 'Expense closed by admin (report requirement bypassed)',
      },
    })

    return NextResponse.json({
      message: 'Expense request closed successfully',
      paymentAmountCents: expense.paidAt ? null : paymentAmountCents,
      totalPaidAmountCents,
    })
  } catch (error) {
    console.error('Close expense error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to close expense request' },
      { status: 500 }
    )
  }
}

