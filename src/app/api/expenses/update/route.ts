import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { EXPENSE_CATEGORY_VALUES, TEAM_VALUES, CAMPUS_VALUES } from '@/lib/constants'
import { sendEmailsWithRateLimit, generateExpenseSubmittedEmail } from '@/lib/email'

const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
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
  })).optional(),
  items: z.array(z.object({
    id: z.string().uuid().optional(), // Optional ID for existing items
    description: z.string().min(1),
    category: z.string().optional().nullable(),
    quantity: z.number().positive(),
    unitPriceCents: z.number().nonnegative(),
    amountCents: z.number().nonnegative(),
  })).min(1),
}).refine((data) => {
  if (data.category === 'Special Events and Programs') {
    return data.eventDate && data.eventDate.trim() !== ''
  }
  return true
}, {
  message: 'Event date is required for Special Events and Programs',
  path: ['eventDate']
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

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const data = updateExpenseSchema.parse(await request.json())

    // Check if expense exists and belongs to the user or user is admin
    const existingExpense = await db.expenseRequest.findUnique({
      where: { id: data.expenseId },
      include: {
        requester: true,
        items: true,
      },
    })

    if (!existingExpense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if user can edit this expense
    if (existingExpense.requester.email !== user.email && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'You can only edit your own expense requests' },
        { status: 403 }
      )
    }

    // Check if expense can be edited (only CHANGE_REQUESTED or SUBMITTED)
    if (!['SUBMITTED', 'CHANGE_REQUESTED'].includes(existingExpense.status)) {
      return NextResponse.json(
        { error: 'This expense request cannot be edited' },
        { status: 400 }
      )
    }

    // Check if this is a change request for an approved expense (adding items)
    // We need to check the status history to see if it was previously APPROVED
    const statusHistory = await db.statusEvent.findFirst({
      where: {
        expenseId: data.expenseId,
        to: 'APPROVED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const wasApproved = statusHistory !== null && existingExpense.status === 'CHANGE_REQUESTED'
    
    // If this was an approved expense and we're adding items, preserve existing items
    // Otherwise, replace all items (normal edit flow)
    let itemsUpdate: any
    if (wasApproved) {
      // For change requests on approved expenses: keep existing items, add new ones
      // The frontend should send all items (existing + new), but we'll identify new ones
      // by checking if they have IDs that match existing items
      const existingItemIds = existingExpense.items.map(item => item.id)
      
      // Separate items into existing (to keep) and new (to add)
      const itemsToUpdate = data.items.filter((item: any) => 
        item.id && existingItemIds.includes(item.id)
      )
      const itemsToAdd = data.items.filter((item: any) => 
        !item.id || !existingItemIds.includes(item.id)
      )

      // Update existing items if needed, and create new ones
      // Note: We use updateMany for bulk updates, but Prisma doesn't support updateMany with different data
      // So we'll update items individually and then create new ones
      for (const item of itemsToUpdate) {
        await db.expenseItem.update({
          where: { id: item.id },
          data: {
            description: item.description,
            category: item.category || null,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            amountCents: item.amountCents,
          } as any,
        })
      }

      itemsUpdate = {
        create: itemsToAdd.map((item: any) => ({
          description: item.description,
          category: item.category || null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          amountCents: item.amountCents,
        })),
      }
    } else {
      // Normal edit: replace all items
      itemsUpdate = {
        deleteMany: {}, // Delete all existing items
        create: data.items.map((item: any) => ({
          description: item.description,
          category: item.category || null,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          amountCents: item.amountCents,
        })),
      }
    }

    // Update the expense request
    const updatedExpense = await db.expenseRequest.update({
      where: { id: data.expenseId },
      data: {
        title: data.title,
        amountCents: data.amountCents,
        team: data.team as any,
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
        status: 'SUBMITTED', // Reset to submitted when updated
        updatedAt: new Date(),
        items: itemsUpdate,
        // Update attachments if provided
        attachments: data.attachments ? {
          deleteMany: {}, // Delete existing attachments
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
          })),
        } : undefined,
      } as any,
      include: {
        requester: true,
        items: true,
      },
    })

    // Create status event for the update
    await db.statusEvent.create({
      data: {
        expenseId: data.expenseId,
        from: existingExpense.status,
        to: 'SUBMITTED',
        actorId: user.id,
        reason: wasApproved ? 'Expense updated with additional items after change request' : 'Expense request updated and resubmitted',
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
            campus: updatedExpense.campus,
          },
        ],
      },
    })

    // Prepare email templates for all approvers
    const emailTemplates = approvers.map((approver: any) => {
      const emailTemplate = generateExpenseSubmittedEmail(
        approver.name || approver.email,
        updatedExpense.title,
        updatedExpense.amountCents,
        updatedExpense.requester?.name || updatedExpense.requester?.email || 'Unknown',
        process.env.NEXT_PUBLIC_APP_URL!
      )
      emailTemplate.to = approver.email
      emailTemplate.subject = wasApproved 
        ? `Expense Updated with Additional Items: ${updatedExpense.title}`
        : `Expense Request Updated: ${updatedExpense.title}`
      return emailTemplate
    })

    // Send notifications to approvers with rate limiting (500ms delay = 2 emails per second)
    const emailResults = await sendEmailsWithRateLimit(emailTemplates, 500)
    
    if (emailResults.failed > 0) {
      console.warn(`Failed to send ${emailResults.failed} out of ${approvers.length} notification emails:`, emailResults.errors)
    }

    return NextResponse.json({
      message: 'Expense request updated successfully',
      expense: updatedExpense,
    })
  } catch (error) {
    console.error('Update expense error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update expense request' },
      { status: 500 }
    )
  }
}
