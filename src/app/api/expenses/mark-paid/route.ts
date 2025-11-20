import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canMarkAsPaid } from '@/lib/rbac'
import { sendEmail, generateExpensePaidEmail } from '@/lib/email'
import { sendSMS, generateExpensePaidSMS } from '@/lib/sms'

const markPaidSchema = z.object({
  expenseId: z.string().uuid(),
  reportRequired: z.boolean().default(true),
  paymentDate: z.string().datetime().optional(),
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
    const { expenseId, reportRequired, paymentDate } = markPaidSchema.parse(body)

    // Get expense with current status, items, and reports
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
        items: {
          include: {
            approvals: true,
          },
        },
        reports: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Get the most recent report
        },
      },
    }) as any

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if this is a re-payment scenario (expense is PAID and has a report with higher amount)
    const isRePayment = expense.status === 'PAID' && expense.paidAt
    const currentPaidAmount = expense.paidAmountCents || 0
    
    if (isRePayment) {
      // For re-payment, check if there's a report showing higher spending
      const latestReport = expense.reports?.[0]
      if (!latestReport || !latestReport.totalApprovedAmount) {
        return NextResponse.json(
          { error: 'No report found with spending amount. Cannot process additional payment.' },
          { status: 400 }
        )
      }
      
      if (latestReport.totalApprovedAmount <= currentPaidAmount) {
        return NextResponse.json(
          { error: 'Reported amount does not exceed previously paid amount. No additional payment needed.' },
          { status: 400 }
        )
      }
    } else {
      // Initial payment - must be approved or partially approved
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
    }

    // Calculate payment amount
    let paymentAmountCents: number
    let totalPaidAmountCents: number
    
    if (isRePayment) {
      // For re-payment, pay the difference between report amount and previously paid amount
      const latestReport = expense.reports[0]
      const reportAmount = latestReport.totalApprovedAmount ?? 0
      paymentAmountCents = reportAmount - currentPaidAmount
      totalPaidAmountCents = reportAmount
    } else {
      // Initial payment - calculate approved amount
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

    // Update expense status and paid amount
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        status: 'PAID',
        paidAt: isRePayment ? expense.paidAt : new Date(), // Keep original paidAt for re-payments
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        reportRequired: reportRequired,
        amountCents: totalPaidAmountCents, // Update cumulative paid amount
      },
    })

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
      paymentAmountCents,
      process.env.NEXT_PUBLIC_APP_URL!
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
      message: isRePayment 
        ? `Additional payment of ${(paymentAmountCents / 100).toFixed(2)} processed successfully. Total paid: ${(totalPaidAmountCents / 100).toFixed(2)}`
        : 'Expense request marked as paid successfully',
      paymentAmountCents,
      totalPaidAmountCents,
      isRePayment,
    })
  } catch (error) {
    console.error('Mark paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark expense as paid' },
      { status: 500 }
    )
  }
}
