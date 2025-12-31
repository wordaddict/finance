import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { sendEmailsWithRateLimit, generateAdminChangeRequestedEmail } from '@/lib/email'
import { STATUS } from '@/lib/constants'

const adminChangeRequestSchema = z.object({
  expenseId: z.string().uuid(),
  comment: z.string().min(1, 'Comment is required when requesting changes'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Only admins can request changes
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can request changes to expenses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, comment } = adminChangeRequestSchema.parse(body)

    // Get the expense
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
        items: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Only allow change requests for SUBMITTED or APPROVED expenses
    if (expense.status !== STATUS.SUBMITTED && expense.status !== STATUS.APPROVED) {
      return NextResponse.json(
        { error: 'Can only request changes to submitted or approved expenses' },
        { status: 400 }
      )
    }

    // Update expense status to CHANGE_REQUESTED
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: {
        status: STATUS.CHANGE_REQUESTED,
      },
    })

    // Create a note for the admin's change request comment
    await db.expenseNote.create({
      data: {
        expenseId,
        authorId: user.id,
        note: `Change Requested: ${comment}`,
      },
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: expense.status,
        to: STATUS.CHANGE_REQUESTED,
        actorId: user.id,
        reason: comment,
      },
    })

    // Send notification email to the requester
    const emailTemplate = generateAdminChangeRequestedEmail(
      expense.requester.name || expense.requester.email,
      expense.title,
      expense.amountCents,
      user.name || user.email,
      comment
    )
    emailTemplate.to = expense.requester.email

    const emailResults = await sendEmailsWithRateLimit([emailTemplate], 500)

    if (emailResults.failed > 0) {
      console.warn(`Failed to send notification email to requester:`, emailResults.errors)
    }

    return NextResponse.json({
      message: 'Change request submitted successfully. The requester can now edit the expense.',
      expense: {
        ...expense,
        status: STATUS.CHANGE_REQUESTED,
      },
    })
  } catch (error) {
    console.error('Admin change request error:', error)

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
