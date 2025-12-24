import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canUpdateExpenseItems } from '@/lib/rbac'
import { handleApiError } from '@/lib/error-handler'

export async function POST(request: NextRequest) {
  let user: any

  try {
    user = await requireAuth()

    if (!canUpdateExpenseItems(user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { itemId, category } = await request.json()

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    // Verify the item exists and get the associated expense
    const item = await db.expenseItem.findUnique({
      where: { id: itemId },
      include: {
        expense: true
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Expense item not found' }, { status: 404 })
    }

    // Update the item category
    const updatedItem = await db.expenseItem.update({
      where: { id: itemId },
      data: {
        category: category || null
      }
    })

    return NextResponse.json({
      success: true,
      item: updatedItem
    })

  } catch (error) {
    return handleApiError(error, '/api/expense-items/update-category', user?.id)
  }
}
