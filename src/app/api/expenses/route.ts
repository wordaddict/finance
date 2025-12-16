import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'
import { handleApiError, getUserIdFromRequest } from '@/lib/error-handler'
import type { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
  let user: any

  try {
    user = await requireAuth()
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
          attachments: true,
          pastorRemarks: {
            include: {
              pastor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          items: {
            include: {
              approvals: {
                include: {
                  approver: true,
                },
              },
            },
          },
          reports: {
            include: {
              expense: {
                include: {
                  requester: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              attachments: true,
              approvedItems: true,
              reportNotes: {
                include: {
                  author: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      role: true,
                    },
                  },
                },
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },
          expenseNotes: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
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
    return handleApiError(error, '/api/expenses', user?.id)
  }
}
