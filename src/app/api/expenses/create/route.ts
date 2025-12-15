import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { requireAuth } from '@/lib/auth'
import { sendEmailsWithRateLimit, generateExpenseSubmittedEmail } from '@/lib/email'
import { sendSMS, generateExpenseSubmittedSMS } from '@/lib/sms'
import { TEAM_VALUES, CAMPUS_VALUES, EXPENSE_CATEGORY_VALUES } from '@/lib/constants'

const createExpenseSchema = z.object({
  title: z.string().min(1),
  amountCents: z.number().positive(),
  team: z.enum(TEAM_VALUES as [string, ...string[]]),
  campus: z.enum(CAMPUS_VALUES as [string, ...string[]]),
  description: z.string().min(1),
  notes: z.string().optional().nullable(),
  category: z.enum(EXPENSE_CATEGORY_VALUES as [string, ...string[]]),
  urgency: z.number().min(1).max(3).default(2),
  eventDate: z.string().optional().nullable(),
  eventName: z.string().optional().nullable(),
  fullEventBudgetCents: z.number().nonnegative().optional().nullable(),
  payToExternal: z.boolean().optional().default(false),
  payeeName: z.string().optional().nullable(),
  payeeZelle: z.string().optional().nullable(),
  attachments: z.array(z.object({
    publicId: z.string(),
    secureUrl: z.string(),
    mimeType: z.string(),
    itemId: z.string().optional().nullable(), // Temporary item ID from frontend (like '1', '2')
  })).optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    category: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPriceCents: z.number().nonnegative(),
    amountCents: z.number().nonnegative(),
  })).min(1),
}).refine((data) => {
  // If category is "Special Events and Programs", eventDate must be provided
  if (data.category === 'Special Events and Programs') {
    return data.eventDate && data.eventDate.trim() !== '';
  }
  return true;
}, {
  message: "Event date is required for Special Events and Programs",
  path: ["eventDate"]
}).refine((data) => {
  // If eventDate is provided, eventName and fullEventBudgetCents must be provided
  if (data.eventDate && data.eventDate.trim() !== '') {
    return data.eventName && data.eventName.trim() !== '' && 
           data.fullEventBudgetCents !== null && data.fullEventBudgetCents !== undefined && 
           data.fullEventBudgetCents > 0;
  }
  return true;
}, {
  message: "Event name and full event budget are required when event date is provided",
  path: ["eventName"]
}).refine((data) => {
  // If eventDate is provided, items total must equal fullEventBudgetCents
  if (data.eventDate && data.eventDate.trim() !== '' && data.fullEventBudgetCents) {
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amountCents, 0);
    return itemsTotal === data.fullEventBudgetCents;
  }
  return true;
}, {
  message: "Items total must equal the full event budget",
  path: ["items"]
})

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth()

    const body = await request.json()
    const data = createExpenseSchema.parse(body)

    // Team validation is now handled by the enum schema

    const expenseData = {
      title: data.title,
      amountCents: data.amountCents,
      team: data.team,
      requesterId: user.id,
      campus: data.campus as any,
      description: data.description,
      notes: data.notes || null,
      category: data.category,
      urgency: data.urgency,
      eventDate: data.eventDate ? new Date(data.eventDate) : null,
      eventName: data.eventName || null,
      fullEventBudgetCents: data.fullEventBudgetCents || null,
      payToExternal: data.payToExternal || false,
      payeeName: data.payToExternal ? (data.payeeName || null) : null,
      payeeZelle: data.payToExternal ? (data.payeeZelle || null) : null,
    } as Prisma.ExpenseRequestUncheckedCreateInput

    // Create expense request first
    const expense = await db.expenseRequest.create({
      data: expenseData,
      include: {
        requester: true,
      },
    })

    // Create items separately so we can capture their IDs for attachments
    const expenseItems = await Promise.all(
      data.items.map(item =>
        db.expenseItem.create({
          data: {
            expenseId: expense.id,
            description: item.description,
            category: item.category || null,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            amountCents: item.amountCents,
          } as Prisma.ExpenseItemUncheckedCreateInput,
        })
      )
    )

    // Create attachments with itemId mapping
    // The frontend sends temporary item IDs (like '1', '2'), we need to map them to actual item IDs
    if (data.attachments && data.attachments.length > 0) {
      // Create attachments with proper itemId
      // Items are created in the same order as they were sent, so we can map by index
      const attachmentsToCreate = data.attachments.map(attachment => {
        let itemId: string | null = null
        if (attachment.itemId) {
          // Frontend sends temporary IDs like '1', '2', etc. which correspond to item indices
          const tempId = attachment.itemId
          // Try to parse as number and use as index (items are 1-indexed in frontend)
          const itemIndex = parseInt(tempId) - 1
          if (itemIndex >= 0 && itemIndex < expenseItems.length) {
            itemId = expenseItems[itemIndex].id
          }
        }
        
        return {
          expenseId: expense.id,
          itemId: itemId,
          publicId: attachment.publicId,
          secureUrl: attachment.secureUrl,
          mimeType: attachment.mimeType,
        }
      })

      await db.attachment.createMany({
        data: attachmentsToCreate,
      })
    }

    // Create initial status event
    await db.statusEvent.create({
      data: {
        expenseId: expense.id,
        to: 'SUBMITTED',
        actorId: user.id,
      },
    })

    // Get approvers for notifications (exclude suspended users)
    const approvers = await db.user.findMany({
      where: {
        status: 'ACTIVE', // Only send to active users
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
      const emailTemplate = generateExpenseSubmittedEmail(
        approver.name || approver.email,
        expense.title,
        expense.amountCents,
        expense.requester?.name || expense.requester?.email || 'Unknown',
        process.env.NEXT_PUBLIC_APP_URL!
      )
      emailTemplate.to = approver.email
      return emailTemplate
    })

    // Send notifications to approvers with rate limiting (500ms delay = 2 emails per second)
    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
    
    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${approvers.length} notification emails:`, emailResults.errors)
    }

    // SMS notification (if user has phone number - you'd need to add this to User model)
    // const smsTemplate = generateExpenseSubmittedSMS(
    //   expense.title,
    //   expense.amountCents,
    //   expense.requester.name || expense.requester.email
    // )
    // smsTemplate.to = approver.phone // You'd need to add phone field to User model
    // await sendSMS(smsTemplate)

    return NextResponse.json({
      message: 'Expense request created successfully',
      expense: {
        ...expense,
        items: expenseItems,
      },
    })
  } catch (error) {
    console.error('Create expense error:', error)
    return NextResponse.json(
      { error: 'Failed to create expense request' },
      { status: 500 }
    )
  }
}
