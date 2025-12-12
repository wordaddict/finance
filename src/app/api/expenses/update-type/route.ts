import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const updateExpenseTypeSchema = z.object({
  expenseId: z.string().uuid(),
  expenseType: z.string().min(1, 'Admin category cannot be empty').max(100, 'Admin category must be 100 characters or less').nullable(),
  destinationAccount: z.enum([
    'CCI_DMV_CHECKINGS',
    'CCI_USA_CHECKINGS',
    'CCI_DALLAS_CHECKING',
    'CCI_BOSTON_CHECKINGS',
    'CCI_AUSTIN_CHECKINGS',
    'CCI_DMV_SAVINGS',
    'CCI_DALLAS_SAVINGS',
    'CCI_BOSTON_SAVINGS',
    'CCI_AUSTIN_SAVINGS',
    'CCI_GLOBAL',
    'CCI_SEED_CHURCH_CHECKINGS',
    'CCI_SPECIAL_EVENT_CHECKINGS',
  ]).nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can update admin categories
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update admin categories' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, expenseType, destinationAccount } = updateExpenseTypeSchema.parse(body)

    // Verify the expense exists
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Update the admin category and destination account
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { 
        expenseType: expenseType?.trim() || null,
        ...(destinationAccount !== undefined && { destinationAccount: destinationAccount || null }),
      },
    })

    return NextResponse.json({ 
      message: 'Admin category updated successfully',
      expenseType 
    })
  } catch (error) {
    console.error('Update admin category error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update admin category' },
      { status: 500 }
    )
  }
}
