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
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const data = createReportSchema.parse(body)

    // Get the expense to verify it exists and is paid
    const expense = await db.expenseRequest.findUnique({
      where: { id: data.expenseId },
      include: { requester: true },
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

    // Create the report
    const report = await db.expenseReport.create({
      data: {
        expenseId: data.expenseId,
        title: data.title,
        content: data.content,
        reportDate: data.reportDate ? new Date(data.reportDate) : new Date(),
        attachments: data.attachments ? {
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
          })),
        } : undefined,
      },
      include: {
        expense: {
          include: {
            requester: true,
          },
        },
        attachments: true,
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
