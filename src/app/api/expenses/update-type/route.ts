import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const updateExpenseTypeSchema = z.object({
  expenseId: z.string().uuid(),
  expenseType: z.string().min(1, 'Expense type cannot be empty').max(100, 'Expense type must be 100 characters or less').nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can update expense types
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update expense types' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, expenseType } = updateExpenseTypeSchema.parse(body)

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

    // Update the expense type
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { expenseType: expenseType?.trim() || null },
    })

    return NextResponse.json({ 
      message: 'Expense type updated successfully',
      expenseType 
    })
  } catch (error) {
    console.error('Update expense type error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update expense type' },
      { status: 500 }
    )
  }
}
