import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'

const updateAccountSchema = z.object({
  expenseId: z.string().uuid(),
  account: z.enum([
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
  ]).nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    // Only admins can update account tags
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can tag expense accounts' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, account } = updateAccountSchema.parse(body)

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

    // Update the expense account
    await db.expenseRequest.update({
      where: { id: expenseId },
      data: { account },
    })

    return NextResponse.json({ 
      message: 'Account tag updated successfully',
      account 
    })
  } catch (error) {
    console.error('Update account error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update account tag' },
      { status: 500 }
    )
  }
}
