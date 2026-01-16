import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ReportStatus } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendEmailsWithRateLimit, generateReportChangeRequestedEmail } from '@/lib/email'

const requestChangeSchema = z.object({
  reportId: z.string().uuid(),
  comment: z.string().min(1, 'Comment is required when requesting changes'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only admins can request changes to reports
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can request changes to expense reports' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reportId, comment } = requestChangeSchema.parse(body)

    const report = await db.expenseReport.findUnique({
      where: { id: reportId },
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

    if (!report) {
      return NextResponse.json(
        { error: 'Expense report not found' },
        { status: 404 }
      )
    }

    if (!['PENDING', 'APPROVED'].includes(report.status)) {
      return NextResponse.json(
        { error: 'Changes can only be requested for pending or approved reports' },
        { status: 400 }
      )
    }

    const updatedReport = await db.$transaction(async (tx) => {
      // Clear existing approvals so the report can be re-reviewed
      await tx.reportApproval.deleteMany({ where: { reportId } })

      // Update status
      return tx.expenseReport.update({
        where: { id: reportId },
        data: {
          status: ReportStatus.CHANGE_REQUESTED,
        },
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

    // Notify requester
    const emailTemplate = generateReportChangeRequestedEmail(
      updatedReport.expense.requester.name || updatedReport.expense.requester.email,
      updatedReport.title,
      updatedReport.expense.title,
      user.name || user.email,
      comment
    )
    emailTemplate.to = updatedReport.expense.requester.email

    const emailResults = await sendEmailsWithRateLimit([emailTemplate], 500)
    if (emailResults.failed > 0) {
      console.warn('Failed to send change request email to requester:', emailResults.errors)
    }

    return NextResponse.json({
      message: 'Change request submitted. The requester can edit the report.',
      report: updatedReport,
    })
  } catch (error) {
    console.error('Report change request error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit change request' },
      { status: 500 }
    )
  }
}

