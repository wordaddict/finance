import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canApproveExpenses } from '@/lib/rbac'
import { sendEmailsWithRateLimit, generateReportApprovedEmail } from '@/lib/email'

const approveReportSchema = z.object({
  reportId: z.string().uuid(),
  comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (!canApproveExpenses(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to approve reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reportId, comment } = approveReportSchema.parse(body)

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
        status: 'APPROVED',
        comment: comment || null,
        updatedAt: new Date(),
      },
      create: {
        reportId,
        approverId: user.id,
        status: 'APPROVED',
        comment: comment || null,
      },
    })

    // Update report status to APPROVED
    await db.expenseReport.update({
      where: { id: reportId },
      data: { status: 'APPROVED' },
    })

    // Notify requester
    if (report.expense?.requester?.email) {
      const emailTemplate = generateReportApprovedEmail(
        report.expense.requester.name || report.expense.requester.email,
        report.title,
        report.expense.title,
        user.name || user.email,
        report.totalApprovedAmount || report.expense.amountCents || 0
      )
      emailTemplate.to = report.expense.requester.email
      await sendEmailsWithRateLimit([emailTemplate], 500)
    }

    return NextResponse.json({
      message: 'Report approved successfully',
    })
  } catch (error) {
    console.error('Approve report error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to approve report' },
      { status: 500 }
    )
  }
}

