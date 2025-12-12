import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses } from '@/lib/rbac'

const denyReportSchema = z.object({
  reportId: z.string().uuid(),
  comment: z.string().min(1, 'Comment is required when denying a report'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canApproveExpenses(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to deny reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reportId, comment } = denyReportSchema.parse(body)

    // Get report with expense
    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
      include: {
        expense: {
          include: {
            requester: true,
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

    // Check if report is in PENDING status
    if (report.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Report has already been approved or denied' },
        { status: 400 }
      )
    }

    // Create or update approval
    await db.reportApproval.upsert({
      where: {
        reportId_approverId: {
          reportId,
          approverId: user.id,
        },
      },
      update: {
        status: 'DENIED',
        comment: comment,
        updatedAt: new Date(),
      },
      create: {
        reportId,
        approverId: user.id,
        status: 'DENIED',
        comment: comment,
      },
    })

    // Update report status to DENIED
    await db.expenseReport.update({
      where: { id: reportId },
      data: { status: 'DENIED' },
    })

    return NextResponse.json({
      message: 'Report denied successfully',
    })
  } catch (error) {
    console.error('Deny report error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to deny report' },
      { status: 500 }
    )
  }
}

