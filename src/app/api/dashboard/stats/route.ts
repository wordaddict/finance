import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)

    // Get filter parameters
    const status = searchParams.get('status')
    const team = searchParams.get('team')
    const campus = searchParams.get('campus')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const urgency = searchParams.get('urgency')
    const account = searchParams.get('account')
    const expenseType = searchParams.get('expenseType')
    const category = searchParams.get('category')

    // Get current month start and end dates
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Base where clause - users can only see their own expenses unless they have view all permissions
    const baseWhere = canViewAllExpenses(user) ? {} : {
      requesterId: user.id,
    }

    // Build filter where clause
    const filterWhere: any = { ...baseWhere }

    if (status) {
      filterWhere.status = status
    } else {
      // Default to active (non-closed) expenses when no explicit status filter is chosen
      filterWhere.status = { not: 'CLOSED' }
    }
    if (team) {
      filterWhere.team = team
    }
    if (campus) {
      filterWhere.campus = campus
    }
    if (urgency) {
      filterWhere.urgency = parseInt(urgency)
    }
    if (account) {
      filterWhere.account = account
    }
    if (expenseType) {
      filterWhere.expenseType = expenseType
    }
    if (category) {
      filterWhere.category = category
    }
    // Date filter - apply only if provided
    if (startDate || endDate) {
      const dateFilter: any = {}
      if (startDate) {
        dateFilter.gte = new Date(startDate)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        dateFilter.lte = end
      }
      filterWhere.createdAt = dateFilter
    }

    // Get total approved expenses (with filters)
    const approvedWhere = { ...filterWhere, status: 'APPROVED' }
    const totalApproved = await db.expenseRequest.aggregate({
      where: approvedWhere,
      _sum: {
        amountCents: true,
      },
    })

    // Get pending count (with filters, but status override)
    const pendingWhere = { ...filterWhere, status: 'SUBMITTED' }
    const pendingCount = await db.expenseRequest.count({
      where: pendingWhere,
    })

    // Get monthly/all spend (approved or paid amounts)
    const monthlySpendWhere = {
      ...filterWhere,
      status: {
        in: ['APPROVED', 'PAID'],
      },
    }
    const monthlySpend = await db.expenseRequest.aggregate({
      where: monthlySpendWhere,
      _sum: {
        amountCents: true,
      },
    })

    // Get total paid amount (PAID and EXPENSE_REPORT_REQUESTED) using paidAmountCents fallback to amountCents
    const paidExpenses = await db.expenseRequest.findMany({
      where: {
        ...filterWhere,
        status: {
          in: ['PAID', 'EXPENSE_REPORT_REQUESTED'],
        },
      },
      select: {
        amountCents: true,
        paidAmountCents: true,
      },
    })
    const totalPaidCents = paidExpenses.reduce((sum, exp) => {
      const paid = exp.paidAmountCents ?? exp.amountCents ?? 0
      return sum + paid
    }, 0)

    // Get total expenses count
    const totalExpensesCount = await db.expenseRequest.count({
      where: filterWhere,
    })

    // Get team breakdown (with filters)
    const teamBreakdownWhere = {
      ...filterWhere,
      status: {
        in: ['APPROVED', 'PAID'],
      },
    }
    const teamBreakdown = await db.expenseRequest.groupBy({
      by: ['team'],
      where: teamBreakdownWhere,
      _sum: {
        amountCents: true,
      },
      _count: {
        id: true,
      },
    })

    // Get campus breakdown
    const campusBreakdown = await db.expenseRequest.groupBy({
      by: ['campus'],
      where: teamBreakdownWhere,
      _sum: {
        amountCents: true,
      },
      _count: {
        id: true,
      },
    })

    // Get status breakdown
    const statusBreakdown = await db.expenseRequest.groupBy({
      by: ['status'],
      where: filterWhere,
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

    // Get campus breakdown with names
    const campusBreakdownWithNames = campusBreakdown.map(breakdown => {
      return {
        campusName: breakdown.campus,
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    // Get status breakdown
    const statusBreakdownWithNames = statusBreakdown.map(breakdown => {
      return {
        statusName: breakdown.status,
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    // Get recent expenses (with filters)
    const recentExpenses = await db.expenseRequest.findMany({
      where: filterWhere,
      include: {
        requester: true,
        items: {
          include: {
            approvals: {
              where: { status: 'APPROVED' },
            },
          },
        },
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
      totalPaid: totalPaidCents,
      totalExpensesCount,
      teamBreakdown: teamBreakdownWithNames,
      campusBreakdown: campusBreakdownWithNames,
      statusBreakdown: statusBreakdownWithNames,
      recentExpenses: recentExpenses.map(expense => {
        // Calculate approved amount based on item approvals
        let approvedAmountCents = expense.amountCents

        if (expense.items && expense.items.length > 0) {
          approvedAmountCents = expense.items.reduce((total, item) => {
            // Find approved item approval (use the first one if multiple exist)
            const itemApproval = item.approvals.find((approval: any) => approval.status === 'APPROVED')
            if (itemApproval && itemApproval.approvedAmountCents !== null && itemApproval.approvedAmountCents !== undefined) {
              return total + itemApproval.approvedAmountCents
            }
            // If no approval found or amount is null, use full item amount (for non-approved expenses)
            return total + item.amountCents
          }, 0)
        }

        return {
          id: expense.id,
          title: expense.title,
          amountCents: expense.amountCents, // Total requested
          approvedAmountCents: approvedAmountCents, // Total approved
          status: expense.status,
          createdAt: expense.createdAt.toISOString(),
          teamName: expense.team,
          campus: expense.campus,
        }
      }),
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
