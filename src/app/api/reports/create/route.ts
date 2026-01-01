import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'
import { sendEmailsWithRateLimit, generateExpenseReportCreatedEmail } from '@/lib/email'

const createReportSchema = z.object({
  expenseId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  notes: z.string().optional().nullable(),
  reportDate: z.string().optional(),
  attachments: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string(),
    mimeType: z.string(),
    itemId: z.string().optional(), // Which item this attachment belongs to
    isRefundReceipt: z.boolean().optional(), // Whether this is a refund receipt
  })).optional(),
  approvedExpenses: z.object({
    totalApprovedAmount: z.number(),
    totalActualAmount: z.number().optional(),
    approvedItems: z.array(z.object({
      id: z.string(),
      description: z.string(),
      approvedAmountCents: z.number(),
      actualAmountCents: z.number().optional(),
    }))
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = createReportSchema.parse(body)

    // Get the expense to verify it exists and is paid
    const expense = await db.expenseRequest.findUnique({
      where: { id: data.expenseId },
      include: { 
        requester: true,
        items: {
          include: {
            approvals: true
          }
        }
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if user can access this expense
    if (!canViewAllExpenses(user) && expense.requesterId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create reports for your own expenses' },
        { status: 403 }
      )
    }

    // Check if expense is paid or expense report requested
    const expenseStatus = expense.status as string
    if (expenseStatus !== 'PAID' && expenseStatus !== 'EXPENSE_REPORT_REQUESTED') {
      return NextResponse.json(
        { error: 'Reports can only be created for paid expenses' },
        { status: 400 }
      )
    }

    // Calculate required attachments based on approved items
    let requiredAttachments = 1 // Default for non-itemized expenses
    
    if (expense.items && expense.items.length > 0) {
      // Count approved items
      const approvedItems = expense.items.filter((item: any) => {
        const approval = item.approvals.find((approval: any) => approval.status === 'APPROVED')
        return approval && (approval.approvedAmountCents || 0) > 0
      })
      requiredAttachments = approvedItems.length
    }

    // Validate attachment requirements
    const providedAttachments = data.attachments?.length || 0
    if (providedAttachments < requiredAttachments) {
      return NextResponse.json(
        { 
          error: `This expense report requires at least ${requiredAttachments} attachment(s). Please upload the required documents.`,
          requiredAttachments,
          providedAttachments
        },
        { status: 400 }
      )
    }

    // Calculate reported amount (use actual amount if provided, otherwise approved amount)
    const reportedAmountCents = data.approvedExpenses?.totalActualAmount || data.approvedExpenses?.totalApprovedAmount || expense.amountCents
    const currentPaidAmount = (expense as any).paidAmountCents || 0
    
    // Check if reported amount exceeds paid amount
    const additionalPaymentNeeded = reportedAmountCents > currentPaidAmount
    const additionalPaymentAmount = additionalPaymentNeeded ? reportedAmountCents - currentPaidAmount : 0
    
    // Check if refund is needed (spent less than approved)
    const approvedAmount = data.approvedExpenses?.totalApprovedAmount || expense.amountCents
    const refundAmount = reportedAmountCents < approvedAmount ? approvedAmount - reportedAmountCents : 0

    // Create the report with approved expenses data
    const report = await db.expenseReport.create({
      data: {
        expenseId: data.expenseId,
        title: data.title,
        content: data.content,
        notes: (data.notes || undefined) as any, // String field, not relation
        status: 'PENDING' as any, // Reports start as pending until approved/denied
        reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
        totalApprovedAmount: reportedAmountCents,
        attachments: data.attachments ? {
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
            itemId: attachment.itemId || null,
            isRefundReceipt: attachment.isRefundReceipt || false,
          })),
        } : undefined,
        approvedItems: data.approvedExpenses?.approvedItems ? {
          create: data.approvedExpenses.approvedItems.map(item => ({
            originalItemId: item.id,
            description: item.description,
            approvedAmountCents: item.approvedAmountCents,
            actualAmountCents: item.actualAmountCents || item.approvedAmountCents,
          }))
        } : undefined,
      } as any,
      include: {
        expense: {
          include: {
            requester: true,
          },
        },
        attachments: true,
        approvedItems: true,
        reportNotes: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      } as any,
    })

    // Update expense status to PAID if it was EXPENSE_REPORT_REQUESTED
    // (since a report has been created, the requirement is fulfilled)
    if (expenseStatus === 'EXPENSE_REPORT_REQUESTED') {
      await db.expenseRequest.update({
        where: { id: data.expenseId },
        data: { status: 'PAID' as any },
      })

      // Create status event
      await db.statusEvent.create({
        data: {
          expenseId: data.expenseId,
          from: 'EXPENSE_REPORT_REQUESTED' as any,
          to: 'PAID' as any,
          actorId: user.id,
          reason: 'Expense report created',
        },
      })
    }

    // Get admins for notifications (exclude suspended users)
    const admins = await db.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE', // Only send to active users
      },
    })

    // Prepare email templates for all admins
    const emailTemplates = admins.map((admin: any) => {
      const emailTemplate = generateExpenseReportCreatedEmail(
        admin.name || admin.email,
        report.title,
        report.totalApprovedAmount || 0,
        user.name || user.email
      )
      emailTemplate.to = admin.email
      return emailTemplate
    })

    // Send notifications to admins with rate limiting (500ms delay = 2 emails per second)
    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
    
    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${admins.length} report notification emails:`, emailResults.errors)
    }

    return NextResponse.json({
      ...report,
      additionalPaymentNeeded,
      additionalPaymentAmount,
      refundAmount,
      currentPaidAmount,
    })
  } catch (error) {
    console.error('Create report error:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
