import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { canViewAllExpenses } from '@/lib/rbac'
import { sendEmailsWithRateLimit, generateExpenseReportCreatedEmail } from '@/lib/email'

const updateReportSchema = z.object({
  reportId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  notes: z.string().optional().nullable(),
  reportDate: z.string().optional(),
  donationAmountCents: z.number().int().nonnegative().optional(),
  attachments: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string(),
    mimeType: z.string(),
    itemId: z.string().optional(),
    isRefundReceipt: z.boolean().optional(),
  })).optional(),
  approvedExpenses: z.object({
    totalApprovedAmount: z.number(),
    totalActualAmount: z.number().optional(),
    approvedItems: z.array(z.object({
      id: z.string(),
      description: z.string(),
      approvedAmountCents: z.number(),
      actualAmountCents: z.number().optional(),
    })),
  }).optional(),
})

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const data = updateReportSchema.parse(await request.json())

    const report = await db.expenseReport.findUnique({
      where: { id: data.reportId },
      include: {
        expense: {
          include: {
            requester: true,
            items: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: 'Expense report not found' },
        { status: 404 }
      )
    }

    // Only requester or admins can edit a report, and only when change was requested
    if (!canViewAllExpenses(user) && report.expense.requesterId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit reports for your own expenses' },
        { status: 403 }
      )
    }

    if (report.status !== 'CHANGE_REQUESTED') {
      return NextResponse.json(
        { error: 'Report must be in CHANGE_REQUESTED status to edit' },
        { status: 400 }
      )
    }

    // Validate attachments against approved items/non-itemized flow
    const providedAttachments = data.attachments || []
    const approvedItems = data.approvedExpenses?.approvedItems || []
    const totalApprovedAmount = data.approvedExpenses?.totalApprovedAmount ?? 0
    const totalActualAmount = data.approvedExpenses?.totalActualAmount ?? totalApprovedAmount

    if (approvedItems.length > 0) {
      for (const item of approvedItems) {
        const itemAttachments = providedAttachments.filter(att => att.itemId === item.id && !att.isRefundReceipt)
        if (itemAttachments.length === 0) {
          return NextResponse.json(
            { error: `Please include at least one attachment for item: ${item.description}` },
            { status: 400 }
          )
        }

        const difference = (item.actualAmountCents ?? item.approvedAmountCents) - item.approvedAmountCents
        if (difference < 0) {
          const refundReceipts = providedAttachments.filter(att => att.itemId === item.id && att.isRefundReceipt)
          if (refundReceipts.length === 0) {
            return NextResponse.json(
              { error: `Refund receipts are required for item where less was spent: ${item.description}` },
              { status: 400 }
            )
          }
        }
      }
    } else {
      // Non-itemized report requires at least one general attachment
      const generalAttachments = providedAttachments.filter(att => !att.itemId)
      if (generalAttachments.length === 0) {
        return NextResponse.json(
          { error: 'Please include at least one attachment for this expense report.' },
          { status: 400 }
        )
      }

      const difference = totalActualAmount - totalApprovedAmount
      if (difference < 0) {
        const refundReceipts = providedAttachments.filter(att => !att.itemId && att.isRefundReceipt)
        if (refundReceipts.length === 0) {
          return NextResponse.json(
            { error: 'Refund receipt is required when spending less than approved.' },
            { status: 400 }
          )
        }
      }
    }

    // Calculate stored amount (actual amount being reported)
    const reportedAmountCents = totalActualAmount
    const donationAmountCents = data.donationAmountCents || 0

    const updatedReport = await db.$transaction(async (tx) => {
      // Clear existing supporting records to replace with updated data
      await tx.reportAttachment.deleteMany({ where: { reportId: data.reportId } })
      await tx.approvedReportItem.deleteMany({ where: { reportId: data.reportId } })
      await tx.reportApproval.deleteMany({ where: { reportId: data.reportId } })

      // Recreate report with updated attachments/items
      return tx.expenseReport.update({
        where: { id: data.reportId },
        data: {
          title: data.title,
          content: data.content,
          notes: (data.notes || undefined) as any,
          reportDate: data.reportDate ? new Date(data.reportDate) : report.reportDate,
          status: 'PENDING' as any,
          totalApprovedAmount: reportedAmountCents,
          donationAmountCents: donationAmountCents > 0 ? donationAmountCents : null,
          attachments: providedAttachments.length
            ? {
                create: providedAttachments.map((attachment) => ({
                  publicId: attachment.publicId,
                  secureUrl: attachment.secureUrl,
                  mimeType: attachment.mimeType,
                  itemId: attachment.itemId || null,
                  isRefundReceipt: attachment.isRefundReceipt || false,
                })),
              }
            : undefined,
          approvedItems: approvedItems.length
            ? {
                create: approvedItems.map((item) => ({
                  originalItemId: item.id,
                  description: item.description,
                  approvedAmountCents: item.approvedAmountCents,
                  actualAmountCents: item.actualAmountCents ?? item.approvedAmountCents,
                })),
              }
            : undefined,
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
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    })

    // Notify admins that an updated report is ready for review
    const admins = await db.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })

    const emailTemplates = admins.map((admin: any) => {
      const template = generateExpenseReportCreatedEmail(
        admin.name || admin.email,
        updatedReport.title,
        updatedReport.totalApprovedAmount || 0,
        user.name || user.email
      )
      template.to = admin.email
      return template
    })

    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${admins.length} updated report notification emails:`, emailResults.errors)
    }

    return NextResponse.json({
      message: 'Report updated and resubmitted successfully',
      report: updatedReport,
    })
  } catch (error) {
    console.error('Update report error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    )
  }
}

