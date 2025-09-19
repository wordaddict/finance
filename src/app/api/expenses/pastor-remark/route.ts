import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { z } from 'zod'
import { canAddPastorRemarks } from '@/lib/rbac'

const pastorRemarkSchema = z.object({
  expenseId: z.string().uuid(),
  remark: z.string().min(1, 'Remark is required'),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    
    if (!canAddPastorRemarks(user)) {
      return NextResponse.json(
        { error: 'Only campus pastors can add remarks to expenses' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { expenseId, remark } = pastorRemarkSchema.parse(body)

    // Check if expense exists
    const expense = await db.expenseRequest.findUnique({
      where: { id: expenseId },
      include: {
        requester: true,
      },
    })

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense request not found' },
        { status: 404 }
      )
    }

    // Check if pastor can remark on this expense (must be from their campus)
    if (expense.campus !== user.campus) {
      return NextResponse.json(
        { error: 'You can only add remarks to expenses from your campus' },
        { status: 403 }
      )
    }

    // Check if expense is in a state where remarks can be added
    if (expense.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'You can only add remarks to submitted expense requests' },
        { status: 400 }
      )
    }

    // Create or update pastor remark using upsert
    const pastorRemark = await db.pastorRemark.upsert({
      where: {
        expenseId_pastorId: {
          expenseId: expenseId,
          pastorId: user.id,
        },
      },
      update: {
        remark: remark,
        updatedAt: new Date(),
      },
      create: {
        expenseId: expenseId,
        pastorId: user.id,
        remark: remark,
      },
      include: {
        pastor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      message: 'Pastor remark added successfully',
      remark: pastorRemark,
    })
  } catch (error) {
    console.error('Pastor remark error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to add pastor remark' },
      { status: 500 }
    )
  }
}
