import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const status = searchParams.get('status')
    const team = searchParams.get('team')
    const campus = searchParams.get('campus')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Base where clause - users can only see their own expenses unless they have view all permissions
    const baseWhere = canViewAllExpenses(user) ? {} : {
      requesterId: user.id,
    }

    // Build where clause
    const where: any = { ...baseWhere }
    
    if (status) {
      where.status = status
    }
    
    if (team) {
      where.team = team
    }
    
    if (campus) {
      where.campus = campus
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      db.expenseRequest.findMany({
        where,
        include: {
          requester: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expenseRequest.count({ where }),
    ])

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch expenses error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch expenses' },
      { status: 500 }
    )
  }
}
