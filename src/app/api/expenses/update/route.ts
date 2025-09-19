import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { EXPENSE_CATEGORY_VALUES, TEAM_VALUES, CAMPUS_VALUES } from '@/lib/constants'

const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
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
  items: z.array(z.object({
    description: z.string().min(1),
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

    // Update the expense request
    const updatedExpense = await db.expenseRequest.update({
      where: { id: data.expenseId },
      data: {
        title: data.title,
        amountCents: data.amountCents,
        team: data.team as any,
        campus: data.campus as any,
        description: data.description,
        category: data.category,
        urgency: data.urgency,
        eventDate: data.eventDate,
        status: 'SUBMITTED', // Reset to submitted when updated
        updatedAt: new Date(),
        // Clear existing items and create new ones
        items: {
          deleteMany: {}, // Delete all existing items
          create: data.items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            amountCents: item.amountCents,
          })),
        },
        // Update attachments if provided
        attachments: data.attachments ? {
          deleteMany: {}, // Delete existing attachments
          create: data.attachments.map(attachment => ({
            publicId: attachment.publicId,
            secureUrl: attachment.secureUrl,
            mimeType: attachment.mimeType,
          })),
        } : undefined,
      },
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
        reason: 'Expense request updated and resubmitted',
      },
    })

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
