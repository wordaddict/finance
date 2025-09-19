import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canMarkAsPaid } from '@/lib/rbac'
import { sendEmail, generateExpensePaidEmail } from '@/lib/email'
import { sendSMS, generateExpensePaidSMS } from '@/lib/sms'

const markPaidSchema = z.object({
  expenseId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and payment permissions
    const user = await requireAuth()

    if (!canMarkAsPaid(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to mark expenses as paid' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId } = markPaidSchema.parse(body)

    // Get expense with current status and items
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

    if (expense.status !== 'APPROVED' && expense.status !== 'PARTIALLY_APPROVED') {
      return NextResponse.json(
        { error: 'Expense request must be approved or partially approved before marking as paid' },
        { status: 400 }
      )
    }

    if (expense.paidAt) {
      return NextResponse.json(
        { error: 'Expense request has already been marked as paid' },
        { status: 400 }
      )
    }

    // Update expense status to paid
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        status: 'PAID',
        paidAt: new Date(),
      },
    })

    // Calculate approved amount
    let approvedAmountCents = expense.amountCents // Default to full amount
    
    if (expense.items && expense.items.length > 0) {
      // For itemized expenses, calculate sum of approved amounts
      approvedAmountCents = expense.items.reduce((total: number, item: any) => {
        const itemApproval = item.approvals?.[0]
        if (itemApproval?.status === 'APPROVED') {
          return total + (itemApproval.approvedAmountCents ?? item.amountCents)
        }
        return total
      }, 0)
    }

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: expense.status,
        to: 'PAID',
        actorId: user.id,
      },
    })

    // Send notification to requester
    const emailTemplate = generateExpensePaidEmail(
      expense.requester.name || expense.requester.email,
      expense.title,
      approvedAmountCents
    )
    emailTemplate.to = expense.requester.email
    await sendEmail(emailTemplate)

    // SMS notification (if phone number available)
    // const smsTemplate = generateExpensePaidSMS(
    //   expense.title,
    //   approvedAmountCents
    // )
    // smsTemplate.to = expense.requester.phone
    // await sendSMS(smsTemplate)

    return NextResponse.json({
      message: 'Expense request marked as paid successfully',
    })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark expense as paid' },
      { status: 500 }
    )
  }
}
