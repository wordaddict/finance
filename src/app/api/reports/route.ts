import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const expenseId = searchParams.get('expenseId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Base where clause - users can only see reports for their own expenses unless they have view all permissions
    const baseWhere = canViewAllExpenses(user) ? {} : {
      expense: {
        requesterId: user.id,
      },
    }

    // Build where clause
    const where: any = { ...baseWhere }
    
    if (expenseId) {
      where.expenseId = expenseId
    }

    // Get reports with pagination
    const [reports, total] = await Promise.all([
      db.expenseReport.findMany({
        where,
        include: {
          expense: {
            include: {
              requester: true,
            },
          },
          attachments: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expenseReport.count({ where }),
    ])

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch reports error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}
