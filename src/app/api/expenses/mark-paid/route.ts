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
  paidBy: z.string().optional(),
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
    const { expenseId, reportRequired, paymentDate, paidBy } = markPaidSchema.parse(body)

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

    // Check if this is a re-payment scenario (expense is PAID or EXPENSE_REPORT_REQUESTED and has a report with higher amount)
    const isRePayment = (expense.status === 'PAID' || expense.status === 'EXPENSE_REPORT_REQUESTED') && expense.paidAt
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
      // Initial payment - must be approved
      if (expense.status !== 'APPROVED') {
        return NextResponse.json(
          { error: 'Expense request must be approved before marking as paid' },
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
      // For re-payment, calculate overage considering actuals and donation offsets
      const latestReport = expense.reports[0]

      // Reported total: prefer totalActualAmount, then totalApprovedAmount, then sum of approved items (actual if present)
      let reportedAmount = (latestReport as any).totalActualAmount
        ?? (latestReport as any).totalApprovedAmount

      if (reportedAmount === undefined || reportedAmount === null) {
        if (latestReport.approvedItems && latestReport.approvedItems.length > 0) {
          reportedAmount = latestReport.approvedItems.reduce((sum: number, item: any) => {
            const actual = item.actualAmountCents ?? item.approvedAmountCents ?? 0
            return sum + actual
          }, 0)
        } else {
          reportedAmount = expense.amountCents
        }
      }

      const donation = (latestReport as any).donationAmountCents || 0
      const overage = Math.max(0, reportedAmount - currentPaidAmount)
      const adjustedOverage = Math.max(0, overage - donation)

      if (adjustedOverage <= 0) {
        return NextResponse.json(
          { error: 'No additional payment needed based on the latest report.' },
          { status: 400 }
        )
      }

      paymentAmountCents = adjustedOverage
      totalPaidAmountCents = currentPaidAmount + adjustedOverage
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

    // Determine the new status based on reportRequired
    const newStatus = reportRequired ? 'EXPENSE_REPORT_REQUESTED' : 'PAID'

    // Update expense status and paid amount
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        status: newStatus,
        paidAt: isRePayment ? expense.paidAt : new Date(), // Keep original paidAt for re-payments
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        ...(paidBy && { paidBy }),
        reportRequired: reportRequired,
        paidAmountCents: totalPaidAmountCents, // Update cumulative paid amount
      } as any,
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: expense.status,
        to: newStatus,
        actorId: user.id,
      },
    })

    // Send notification to requester (only if requester is active)
    if (expense.requester.status === 'ACTIVE') {
      const emailTemplate = generateExpensePaidEmail(
        expense.requester.name || expense.requester.email,
        expense.title,
        paymentAmountCents
      )
      emailTemplate.to = expense.requester.email
      await sendEmail(emailTemplate)
    }

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

