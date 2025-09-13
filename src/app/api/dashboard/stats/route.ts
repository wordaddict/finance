import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    // Get current month start and end dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Base where clause - users can only see their own expenses unless they have view all permissions
    const baseWhere = canViewAllExpenses(user) ? {} : {
      requesterId: user.id,
    }

    // Get total approved expenses
    const totalApproved = await db.expenseRequest.aggregate({
      where: {
        ...baseWhere,
        status: 'APPROVED',
      },
      _sum: {
        amountCents: true,
      },
    })

    // Get pending count
    const pendingCount = await db.expenseRequest.count({
      where: {
        ...baseWhere,
        status: 'SUBMITTED',
      },
    })

    // Get monthly spend
    const monthlySpend = await db.expenseRequest.aggregate({
      where: {
        ...baseWhere,
        status: {
          in: ['APPROVED', 'PAID'],
        },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amountCents: true,
      },
    })

    // Get team breakdown for current month
    const teamBreakdown = await db.expenseRequest.groupBy({
      by: ['team'],
      where: {
        ...baseWhere,
        status: {
          in: ['APPROVED', 'PAID'],
        },
        createdAt: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
      },
      _sum: {
        amountCents: true,
      },
      _count: {
        id: true,
      },
    })

    // Get team names
    const teamBreakdownWithNames = teamBreakdown.map(breakdown => {
      return {
        teamName: breakdown.team,
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    // Get recent expenses
    const recentExpenses = await db.expenseRequest.findMany({
      where: baseWhere,
      include: {
        requester: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    })

    return NextResponse.json({
      totalApproved: totalApproved._sum.amountCents || 0,
      pendingCount,
      monthlySpend: monthlySpend._sum.amountCents || 0,
      teamBreakdown: teamBreakdownWithNames,
      recentExpenses: recentExpenses.map(expense => ({
        id: expense.id,
        title: expense.title,
        amountCents: expense.amountCents,
        status: expense.status,
        createdAt: expense.createdAt.toISOString(),
        teamName: expense.team,
      })),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
