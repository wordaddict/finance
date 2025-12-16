import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses, canApproveAtStage } from '@/lib/rbac'
import { sendEmail, generateExpenseApprovedEmail, sendEmailsWithRateLimit } from '@/lib/email'
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

    // Allow approval if expense is SUBMITTED or if undoing a previous approval
    if (expense.status !== 'SUBMITTED' && expense.status !== 'APPROVED' && expense.status !== 'DENIED') {
      return NextResponse.json(
        { error: 'Expense request must be in submitted, approved, or denied status' },
        { status: 400 }
      )
    }

    // If expense is already approved/denied, allow re-approval (this will replace existing approval)
    // Check if approval already exists for this stage
    const existingApproval = await db.approval.findUnique({
      where: {
        expenseId_stage: {
          expenseId,
          stage,
        },
      },
    })

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
      // Automatically approve all items when expense is approved
      if (expense.items && expense.items.length > 0) {
        for (const item of expense.items) {
          // Check if item already has an approval from this user
          const existingItemApproval = item.approvals.find((approval: { approverId: string }) => approval.approverId === user.id)
          
          if (!existingItemApproval) {
            // Create approval for this item - approve full amount
            await db.expenseItemApproval.create({
              data: {
                itemId: item.id,
                approverId: user.id,
                status: 'APPROVED',
                approvedAmountCents: item.amountCents, // Approve full amount
                comment: comment ? `Auto-approved with expense approval: ${comment}` : 'Auto-approved with expense approval',
              },
            })
          } else if (existingItemApproval.status !== 'APPROVED') {
            // Update existing approval to approved
            await db.expenseItemApproval.update({
              where: { id: existingItemApproval.id },
              data: {
                status: 'APPROVED',
                approvedAmountCents: item.amountCents, // Approve full amount
                comment: existingItemApproval.comment || (comment ? `Auto-approved with expense approval: ${comment}` : 'Auto-approved with expense approval'),
                updatedAt: new Date(),
              },
            })
          }
        }
      }

      // Update the main expense status (reportRequired is handled in mark-paid)
      await db.expenseRequest.update({
        where: { id: expenseId },
        data: { 
          status: 'APPROVED',
        },
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

    // Send notification to requester if fully approved (only if requester is active)
    if (newStatus === 'APPROVED' && expense.requester.status === 'ACTIVE') {
      // Refetch expense with updated item approvals to get accurate approved amounts
      const expenseForEmail = await db.expenseRequest.findUnique({
        where: { id: expenseId },
        include: {
          requester: true,
          items: {
            include: {
              approvals: {
                where: { status: 'APPROVED' },
              },
            },
          },
        },
      })
      
      if (!expenseForEmail) {
        return NextResponse.json(
          { error: 'Expense request not found' },
          { status: 404 }
        )
      }
      
      // Calculate the actual approved amount
      let approvedAmountCents = expenseForEmail.amountCents
      
      // If expense has items, calculate total approved amount from item approvals
      if (expenseForEmail.items && expenseForEmail.items.length > 0) {
        approvedAmountCents = expenseForEmail.items.reduce((total, item) => {
          // Find approved item approval (use the first one if multiple exist)
          const itemApproval = item.approvals.find((approval: any) => approval.status === 'APPROVED')
          if (itemApproval && itemApproval.approvedAmountCents !== null && itemApproval.approvedAmountCents !== undefined) {
            return total + itemApproval.approvedAmountCents
          }
          // If no approval found or amount is null, use full item amount (shouldn't happen if fully approved)
          return total + item.amountCents
        }, 0)
      }
      
      const emailTemplate = generateExpenseApprovedEmail(
        expenseForEmail.requester.name || expenseForEmail.requester.email,
        expenseForEmail.title,
        approvedAmountCents,
        process.env.NEXT_PUBLIC_APP_URL!
      )
      emailTemplate.to = expenseForEmail.requester.email
      await sendEmail(emailTemplate)

      // Send notification to campus pastors of the expense's campus
      const campusPastors = await db.user.findMany({
        where: {
          status: 'ACTIVE',
          role: 'CAMPUS_PASTOR',
          campus: expenseForEmail.campus,
        },
      })

      // Prepare email templates for campus pastors
      const pastorEmailTemplates = campusPastors.map((pastor) => {
        const pastorEmailTemplate = generateExpenseApprovedEmail(
          pastor.name || pastor.email,
          expenseForEmail.title,
          approvedAmountCents,
          process.env.NEXT_PUBLIC_APP_URL!
        )
        pastorEmailTemplate.to = pastor.email
        return pastorEmailTemplate
      })

      // Send emails to campus pastors with rate limiting
      const pastorEmailResults = await sendEmailsWithRateLimit(pastorEmailTemplates, 500)

      if (pastorEmailResults.failed > 0) {
        console.warn(`Failed to send ${pastorEmailResults.failed} out of ${campusPastors.length} pastor notification emails:`, pastorEmailResults.errors)
      }

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
