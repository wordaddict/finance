import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { canViewAllExpenses } from '@/lib/rbac'
import { sendEmailsWithRateLimit, generateReportNoteAddedEmail } from '@/lib/email'

const addNoteSchema = z.object({
  reportId: z.string().uuid(),
  note: z.string().min(1, 'Note cannot be empty'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { reportId, note } = addNoteSchema.parse(body)

    // Get the report to verify it exists and user has access
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

    // Check if user can add notes to this report
    // User must be: the requester, an admin, or a campus pastor for the expense's campus
    const canAddNote = 
      report.expense.requesterId === user.id || 
      user.role === 'ADMIN' || 
      (user.role === 'CAMPUS_PASTOR' && report.expense.campus === user.campus)

    if (!canAddNote) {
      return NextResponse.json(
        { error: 'You do not have permission to add notes to this report' },
        { status: 403 }
      )
    }

    // Create the note
    const reportNote = await db.reportNote.create({
      data: {
        reportId,
        authorId: user.id,
        note: note.trim(),
      },
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
    })

    // Get recipients for notifications (exclude suspended users and the note author)
    const recipients = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        id: { not: user.id }, // Exclude the note author
        OR: [
          { role: 'ADMIN' },
          { id: report.expense.requesterId }, // Include the expense requester
        ],
      },
    })

    // Prepare email templates for all recipients
    const emailTemplates = recipients.map((recipient: any) => {
      const emailTemplate = generateReportNoteAddedEmail(
        recipient.name || recipient.email,
        report.title,
        user.name || user.email,
        note.trim()
      )
      emailTemplate.to = recipient.email
      return emailTemplate
    })

    // Send notifications with rate limiting (500ms delay = 2 emails per second)
    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)

    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${recipients.length} note notification emails:`, emailResults.errors)
    }

    return NextResponse.json({
      message: 'Note added successfully',
      note: reportNote,
    })
  } catch (error) {
    console.error('Add report note error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to add note' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required' },
        { status: 400 }
      )
    }

    // Get the report to verify it exists and user has access
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

    // Check if user can view notes for this report
    const canViewNotes = 
      report.expense.requesterId === user.id || 
      canViewAllExpenses(user) ||
      (user.role === 'CAMPUS_PASTOR' && report.expense.campus === user.campus)

    if (!canViewNotes) {
      return NextResponse.json(
        { error: 'You do not have permission to view notes for this report' },
        { status: 403 }
      )
    }

    // Get all notes for this report
    const notes = await db.reportNote.findMany({
      where: { reportId },
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
    })

    return NextResponse.json({ notes })
  } catch (error) {
    console.error('Get report notes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notes' },
      { status: 500 }
    )
  }
}

