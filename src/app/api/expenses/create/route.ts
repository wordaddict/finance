import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { sendEmail, generateExpenseSubmittedEmail } from '@/lib/email'
import { sendSMS, generateExpenseSubmittedSMS } from '@/lib/sms'
import { TEAM_VALUES, CAMPUS_VALUES, EXPENSE_CATEGORY_VALUES } from '@/lib/constants'

const createExpenseSchema = z.object({
  title: z.string().min(1),
  amountCents: z.number().positive(),
  team: z.enum(TEAM_VALUES as [string, ...string[]]),
  campus: z.enum(CAMPUS_VALUES as [string, ...string[]]),
  description: z.string().min(1),
  category: z.enum(EXPENSE_CATEGORY_VALUES as [string, ...string[]]),
  urgency: z.number().min(1).max(3).default(2),
  eventDate: z.string().optional().nullable(),
  attachments: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string(),
    mimeType: z.string(),
  })).optional(),
}).refine((data) => {
  // If category is "Special Events and Programs", eventDate must be provided
  if (data.category === 'Special Events and Programs') {
    return data.eventDate && data.eventDate.trim() !== '';
  }
  return true;
}, {
  message: "Event date is required for Special Events and Programs",
  path: ["eventDate"]
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()

    const body = await request.json()
    const data = createExpenseSchema.parse(body)

    // Team validation is now handled by the enum schema

    // Create expense request
    const expense = await db.expenseRequest.create({
      data: {
        title: data.title,
        amountCents: data.amountCents,
        team: data.team,
        requesterId: user.id,
        campus: data.campus as any,
        description: data.description,
        category: data.category,
        urgency: data.urgency,
        eventDate: data.eventDate ? new Date(data.eventDate) : null,
        attachments: data.attachments ? {
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
          })),
        } : undefined,
      },
      include: {
        requester: true,
      },
    })

    // Create initial status event
    await db.statusEvent.create({
      data: {
        expenseId: expense.id,
        to: 'SUBMITTED',
        actorId: user.id,
      },
    })

    // Get approvers for notifications
    const approvers = await db.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'CAMPUS_PASTOR'],
        },
      },
    })

    // Send notifications to approvers
    for (const approver of approvers) {
      // Email notification
      const emailTemplate = generateExpenseSubmittedEmail(
        approver.name || approver.email,
        expense.title,
        expense.amountCents,
        expense.requester?.name || expense.requester?.email || 'Unknown'
      )
      emailTemplate.to = approver.email
      await sendEmail(emailTemplate)

      // SMS notification (if user has phone number - you'd need to add this to User model)
      // const smsTemplate = generateExpenseSubmittedSMS(
      //   expense.title,
      //   expense.amountCents,
      //   expense.requester.name || expense.requester.email
      // )
      // smsTemplate.to = approver.phone // You'd need to add phone field to User model
      // await sendSMS(smsTemplate)
    }

    return NextResponse.json({
      message: 'Expense request created successfully',
      expense,
    })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Failed to create expense request' },
      { status: 500 }
    )
  }
}
