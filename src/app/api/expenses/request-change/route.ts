import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { sendEmailsWithRateLimit, generateExpenseChangeRequestedEmail } from '@/lib/email'

const requestChangeSchema = z.object({
  expenseId: z.string().uuid(),
  comment: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { expenseId, comment } = requestChangeSchema.parse(body)

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

    // Only the requester can request changes to their approved expense
    if (expense.requesterId !== user.id) {
      return NextResponse.json(
        { error: 'You can only request changes to your own expense requests' },
        { status: 403 }
      )
    }

    // Only allow change requests for APPROVED expenses
    if (expense.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Change requests can only be made for approved expenses' },
        { status: 400 }
      )
    }

    // Update expense status to CHANGE_REQUESTED
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        status: 'CHANGE_REQUESTED',
      },
    })

    // Create status event
    await db.statusEvent.create({
      data: {
        expenseId,
        from: 'APPROVED',
        to: 'CHANGE_REQUESTED',
        actorId: user.id,
        reason: comment || 'Requester requested to add more items',
      },
    })

    // Get approvers for notifications (exclude suspended users)
    const approvers = await db.user.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { role: 'ADMIN' },
          {
            role: 'CAMPUS_PASTOR',
            campus: expense.campus,
          },
        ],
      },
    })

    // Prepare email templates for all approvers
    const emailTemplates = approvers.map((approver: any) => {
      const emailTemplate = generateExpenseChangeRequestedEmail(
        approver.name || approver.email,
        expense.title,
        expense.amountCents,
        expense.requester.name || expense.requester.email,
        comment || 'Requester wants to add more items',
        process.env.NEXT_PUBLIC_APP_URL!
      )
      emailTemplate.to = approver.email
      return emailTemplate
    })

    // Send notifications to approvers with rate limiting
    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
    
    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${approvers.length} notification emails:`, emailResults.errors)
    }

    return NextResponse.json({
      message: 'Change request submitted successfully. You can now add more items to this expense.',
      expense: {
        ...expense,
        status: 'CHANGE_REQUESTED',
      },
    })
  } catch (error) {
    console.error('Request change error:', error)
    
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

