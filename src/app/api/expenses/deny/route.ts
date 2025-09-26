import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses } from '@/lib/rbac'
import { sendEmail, generateExpenseDeniedEmail } from '@/lib/email'
import { sendSMS, generateExpenseDeniedSMS } from '@/lib/sms'

const denyExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  reason: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and approval permissions
    const user = await requireAuth()

    if (!canApproveExpenses(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deny expenses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, reason } = denyExpenseSchema.parse(body)

    // Get expense with current status
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
        { error: 'Expense request is not in submitted status' },
        { status: 400 }
      )
    }

    // Update expense status to denied
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { status: 'DENIED' },
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: 'SUBMITTED',
        to: 'DENIED',
        actorId: user.id,
        reason,
      },
    })

    // Send notification to requester
    const emailTemplate = generateExpenseDeniedEmail(
      expense.requester.name || expense.requester.email,
      expense.title,
      expense.amountCents,
      process.env.NEXT_PUBLIC_APP_URL!,
      reason,
    )
    emailTemplate.to = expense.requester.email
    await sendEmail(emailTemplate)

    // SMS notification (if phone number available)
    // const smsTemplate = generateExpenseDeniedSMS(
    //   expense.title,
    //   expense.amountCents,
    //   reason
    // )
    // smsTemplate.to = expense.requester.phone
    // await sendSMS(smsTemplate)

    return NextResponse.json({
      message: 'Expense request denied successfully',
    })
  } catch (error) {
    console.error('Deny expense error:', error)
    return NextResponse.json(
      { error: 'Failed to deny expense request' },
      { status: 500 }
    )
  }
}
