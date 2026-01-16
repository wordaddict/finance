import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'
import { handleApiError, getUserIdFromRequest } from '@/lib/error-handler'

function parseAmountSearch(search: string): { cents: number; isInteger: boolean } | null {
  const normalized = search.replace(/[$,]/g, '').trim()

  if (!normalized || !/^(\d+)(\.\d{0,2})?$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)

  if (Number.isNaN(parsed)) {
    return null
  }

  return {
    cents: Math.round(parsed * 100),
    isInteger: !normalized.includes('.'),
  }
}

function buildAmountRangeConditions(amountCents: number, isInteger: boolean) {
  const conditions: any[] = []

  if (isInteger) {
    // Allow matching numbers that start with the provided digits (e.g., "2" matches 2, 20, 200, 2000...)
    const maxMagnitude = 5 // up to hundred-thousands of dollars
    for (let magnitude = 0; magnitude <= maxMagnitude; magnitude++) {
      const scale = Math.pow(10, magnitude)
      const lower = amountCents * scale
      const upper = (amountCents + 100) * scale - 1 // add $1 (100 cents) then scale, minus 1 to keep inclusive range
      conditions.push({
        amountCents: {
          gte: lower,
          lte: upper,
        },
      })
    }
  } else {
    // For decimals, keep exact cents match
    conditions.push({ amountCents })
  }

  return conditions
}

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
    } else {
      // Default to active (non-closed) expenses when no explicit status filter is chosen
      where.status = { not: 'CLOSED' }
    }
    
    if (team) {
      where.team = team
    }
    
    if (campus) {
      where.campus = campus
    }
    
    if (search) {
      const searchConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          expenseNotes: {
            some: {
              note: { contains: search, mode: 'insensitive' },
            },
          },
        },
        { team: { contains: search, mode: 'insensitive' } },
        {
          requester: {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ]

      const amountSearch = parseAmountSearch(search)
      if (amountSearch !== null) {
        const amountConditions = buildAmountRangeConditions(amountSearch.cents, amountSearch.isInteger)
        where.OR = [...amountConditions, ...searchConditions]
      } else {
        where.OR = searchConditions
      }
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
            orderBy: {
              createdAt: 'desc',
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
