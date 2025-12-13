import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canMarkAsPaid } from '@/lib/rbac'

const closeReportSchema = z.object({
  reportId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication and payment permissions (same as mark-paid/close expense)
    const user = await requireAuth()

    if (!canMarkAsPaid(user)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to close reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reportId } = closeReportSchema.parse(body)

    // Get report with expense
    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
      include: {
        expense: {
          include: {
            requester: true,
            reports: true,
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

    // Allow closing if report is APPROVED or PENDING
    if (!['APPROVED', 'PENDING'].includes(report.status)) {
      return NextResponse.json(
        { error: 'Report must be approved or pending to be closed' },
        { status: 400 }
      )
    }

    // Use a transaction to close the report and potentially the expense
    await db.$transaction(async (tx) => {
      // Update report status to CLOSED
      await tx.expenseReport.update({
        where: { id: reportId },
        data: { status: 'CLOSED' },
      })

      // Check if all reports for this expense are closed or approved
      const allReports = await tx.expenseReport.findMany({
        where: { expenseId: report.expenseId },
      })

      const allReportsClosed = allReports.every(r => r.status === 'CLOSED')
      const expenseCanBeClosed = ['APPROVED', 'PARTIALLY_APPROVED', 'PAID', 'EXPENSE_REPORT_REQUESTED'].includes(report.expense.status)

      // If all reports are closed and expense is in a closable state, close the expense too
      if (allReportsClosed && expenseCanBeClosed && report.expense.status !== 'CLOSED') {
        await tx.expenseRequest.update({
          where: { id: report.expenseId },
          data: {
            status: 'CLOSED',
            reportRequired: false,
          },
        })

        // Create status event for expense
        await tx.statusEvent.create({
          data: {
            expenseId: report.expenseId,
            from: report.expense.status as any,
            to: 'CLOSED' as any,
            actorId: user.id,
            reason: 'Expense closed automatically after all reports were closed',
          },
        })
      }
    })

    return NextResponse.json({
      message: 'Report closed successfully',
    })
  } catch (error) {
    console.error('Close report error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to close report' },
      { status: 500 }
    )
  }
}

