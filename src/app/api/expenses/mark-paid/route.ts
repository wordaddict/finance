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
      // For re-payment, calculate the difference from item-level actual vs approved amounts
      const latestReport = expense.reports[0]
      let totalDifference = 0
      
      if (latestReport.approvedItems && latestReport.approvedItems.length > 0) {
        // Calculate sum of positive differences (where actual > approved)
        for (const item of latestReport.approvedItems) {
          const approvedAmount = item.approvedAmountCents || 0
          const actualAmount = item.actualAmountCents ?? approvedAmount
          const difference = actualAmount - approvedAmount
          
          // Only count positive differences (spent more than approved)
          if (difference > 0) {
            totalDifference += difference
          }
        }
      } else {
        // For non-itemized expenses, use totalActualAmount vs totalApprovedAmount
        const totalApproved = latestReport.totalApprovedAmount || 0
        const totalActual = latestReport.totalActualAmount ?? totalApproved
        const difference = totalActual - totalApproved
        if (difference > 0) {
          totalDifference = difference
        }
      }
      
      paymentAmountCents = totalDifference
      totalPaidAmountCents = currentPaidAmount + totalDifference
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
