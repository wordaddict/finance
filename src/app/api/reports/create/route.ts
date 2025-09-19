import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'

const createReportSchema = z.object({
  expenseId: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  reportDate: z.string().optional(),
  attachments: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string(),
    mimeType: z.string(),
  })).optional(),
  approvedExpenses: z.object({
    totalApprovedAmount: z.number(),
    approvedItems: z.array(z.object({
      id: z.string(),
      description: z.string(),
      approvedAmountCents: z.number(),
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

    // Check if expense is paid
    if (expense.status !== 'PAID') {
      return NextResponse.json(
        { error: 'Reports can only be created for paid expenses' },
        { status: 400 }
      )
    }

    // Calculate required attachments based on approved items
    let requiredAttachments = 1 // Default for non-itemized expenses
    
    if (expense.items && expense.items.length > 0) {
      // Count approved items
      const approvedItems = expense.items.filter(item => {
        const approval = item.approvals.find(approval => approval.status === 'APPROVED')
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

    // Create the report with approved expenses data
    const report = await db.expenseReport.create({
      data: {
        expenseId: data.expenseId,
        title: data.title,
        content: data.content,
        reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
        totalApprovedAmount: data.approvedExpenses?.totalApprovedAmount || expense.amountCents,
        attachments: data.attachments ? {
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
          })),
        } : undefined,
        approvedItems: data.approvedExpenses?.approvedItems ? {
          create: data.approvedExpenses.approvedItems.map(item => ({
            originalItemId: item.id,
            description: item.description,
            approvedAmountCents: item.approvedAmountCents,
          }))
        } : undefined,
      },
      include: {
        expense: {
          include: {
            requester: true,
          },
        },
        attachments: true,
        approvedItems: true,
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Create report error:', error)
    return NextResponse.json(
      { error: 'Failed to create report' },
      { status: 500 }
    )
  }
}
