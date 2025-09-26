import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses, canApproveAtStage } from '@/lib/rbac'
import { sendEmail, generateExpenseApprovedEmail } from '@/lib/email'
import { sendSMS, generateExpenseApprovedSMS } from '@/lib/sms'

const approveExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  stage: z.number().min(1).max(2).default(1),
  comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and approval permissions
    const user = await requireAuth()

    if (!canApproveExpenses(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve expenses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, stage, comment } = approveExpenseSchema.parse(body)

    // Check if user can approve at this stage
    if (!canApproveAtStage(user, stage)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve at this stage' },
        { status: 403 }
      )
    }

    // Get expense with current status
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
        approvals: true,
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

    if (expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Expense request is not in submitted status' },
        { status: 400 }
      )
    }

    // Check if approval already exists for this stage
    const existingApproval = await db.approval.findUnique({
      where: {
        expenseId_stage: {
          expenseId,
          stage,
        },
      },
    })

    if (existingApproval) {
      return NextResponse.json(
        { error: 'Expense request has already been approved at this stage' },
        { status: 400 }
      )
    }

    // Create approval record using upsert to handle race conditions
    await db.approval.upsert({
      where: {
        expenseId_stage: {
          expenseId,
          stage,
        },
      },
      update: {
        approverId: user.id,
        decision: 'approved',
        comment,
        decidedAt: new Date(),
      },
      create: {
        expenseId,
        stage,
        approverId: user.id,
        decision: 'approved',
        comment,
        decidedAt: new Date(),
      },
    })

    // Check if this is the final approval needed
    const settings = await db.setting.findFirst()
    const requireTwoStage = settings?.requireTwoStage ?? false

    let newStatus = 'APPROVED'
    if (requireTwoStage && stage === 1) {
      // Still need second stage approval
      newStatus = 'SUBMITTED'
    }

    // Update expense status if fully approved
    if (newStatus === 'APPROVED') {
      // First, automatically approve all items if they exist
      if (expense.items && expense.items.length > 0) {
        for (const item of expense.items) {
          // Check if item already has an approval
          const existingItemApproval = item.approvals.find((approval: { approverId: string }) => approval.approverId === user.id)
          
          if (!existingItemApproval) {
            // Create approval for this item
            await db.expenseItemApproval.create({
              data: {
                itemId: item.id,
                approverId: user.id,
                status: 'APPROVED',
                approvedAmountCents: item.amountCents, // Approve full amount
                comment: comment ? `Auto-approved with main expense approval: ${comment}` : 'Auto-approved with main expense approval',
              },
            })
          } else if (existingItemApproval.status !== 'APPROVED') {
            // Update existing approval to approved
            await db.expenseItemApproval.update({
              where: { id: existingItemApproval.id },
              data: {
                status: 'APPROVED',
                approvedAmountCents: item.amountCents, // Approve full amount
                comment: existingItemApproval.comment || (comment ? `Auto-approved with main expense approval: ${comment}` : 'Auto-approved with main expense approval'),
                updatedAt: new Date(),
              },
            })
          }
        }
      }

      // Then update the main expense status
      await db.expenseRequest.update({
        where: { id: expenseId },
        data: { status: 'APPROVED' },
      })
    }

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: 'SUBMITTED',
        to: newStatus as any,
        actorId: user.id,
        reason: comment,
      },
    })

    // Send notification to requester if fully approved
    if (newStatus === 'APPROVED') {
      const emailTemplate = generateExpenseApprovedEmail(
        expense.requester.name || expense.requester.email,
        expense.title,
        expense.amountCents,
        process.env.NEXT_PUBLIC_APP_URL!
      )
      emailTemplate.to = expense.requester.email
      await sendEmail(emailTemplate)

      // SMS notification (if phone number available)
      // const smsTemplate = generateExpenseApprovedSMS(
      //   expense.title,
      //   expense.amountCents
      // )
      // smsTemplate.to = expense.requester.phone
      // await sendSMS(smsTemplate)
    }

    return NextResponse.json({
      message: 'Expense request approved successfully',
      status: newStatus,
    })
  } catch (error) {
    console.error('Approve expense error:', error)
    return NextResponse.json(
      { error: 'Failed to approve expense request' },
      { status: 500 }
    )
  }
}
