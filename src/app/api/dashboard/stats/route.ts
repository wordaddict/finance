import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth'
import { canViewAllExpenses } from '@/lib/rbac'
import { TEAM_VALUES, STATUS_VALUES, EXPENSE_CATEGORY_VALUES } from '@/lib/constants'

type ExpenseWithItems = {
  amountCents: number
  paidAmountCents: number | null
  status: string
  items: Array<{
    amountCents: number
    approvals: Array<{
      status: string
      approvedAmountCents: number | null
    }>
  }>
}

const calculateApprovedAmount = (expense: ExpenseWithItems) => {
  if (!expense.items || expense.items.length === 0) {
    return expense.amountCents
  }

  return expense.items.reduce((total, item) => {
    const itemApproval = item.approvals.find(approval => approval.status === 'APPROVED')
    if (itemApproval && itemApproval.approvedAmountCents !== null && itemApproval.approvedAmountCents !== undefined) {
      return total + itemApproval.approvedAmountCents
    }
    if (itemApproval) {
      return total + item.amountCents
    }
    return total
  }, 0)
}

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

    if (status === 'ACTIVE') {
      // Explicit active-only filter keeps closed requests out of the result set
      filterWhere.status = { not: 'CLOSED' }
    } else if (status) {
      filterWhere.status = status
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

    // Completed/paid-esque statuses that should still count toward totals even after closure
    const completedStatuses = ['APPROVED', 'PAID', 'EXPENSE_REPORT_REQUESTED', 'CLOSED'] as const
    const completedWhere = {
      ...filterWhere,
      status: {
        in: completedStatuses as unknown as string[],
      },
    }

    const expensesForTotals = await db.expenseRequest.findMany({
      where: completedWhere,
      select: {
        amountCents: true,
        paidAmountCents: true,
        status: true,
        items: {
          include: {
            approvals: {
              where: { status: 'APPROVED' },
            },
          },
        },
      },
    }) as unknown as ExpenseWithItems[]

    const totalApprovedCents = expensesForTotals.reduce<number>((sum, expense: ExpenseWithItems) => {
      return sum + calculateApprovedAmount(expense)
    }, 0)

    // Get pending count (with filters, but status override)
    const pendingWhere = { ...filterWhere, status: 'SUBMITTED' }
    const pendingCount = await db.expenseRequest.count({
      where: pendingWhere,
    })

    // Get monthly/all spend (actual paid amounts when present, otherwise approved amounts)
    const monthlySpendCents = expensesForTotals.reduce<number>((sum, expense: ExpenseWithItems) => {
      const approvedAmount = calculateApprovedAmount(expense)
      const paid = expense.paidAmountCents ?? approvedAmount
      return sum + paid
    }, 0)

    // Get total paid amount (PAID, EXPENSE_REPORT_REQUESTED, CLOSED) using paidAmountCents fallback to approved amount
    const paidStatuses = ['PAID', 'EXPENSE_REPORT_REQUESTED', 'CLOSED'] as const
    const totalPaidCents = expensesForTotals.reduce<number>((sum, expense: ExpenseWithItems) => {
      if (!paidStatuses.includes(expense.status as (typeof paidStatuses)[number])) {
        return sum
      }
      const approvedAmount = calculateApprovedAmount(expense)
      const paid = expense.paidAmountCents ?? approvedAmount
      return sum + paid
    }, 0)

    // Calculate reimbursements (amounts paid above approved) and count of such requests
    const reimbursementTotals = expensesForTotals.reduce<{
      amount: number
      count: number
    }>((totals, expense: ExpenseWithItems) => {
      const approvedAmount = calculateApprovedAmount(expense)
      const paid = expense.paidAmountCents ?? approvedAmount
      const overage = paid - approvedAmount
      if (overage > 0 && paidStatuses.includes(expense.status as (typeof paidStatuses)[number])) {
        return {
          amount: totals.amount + overage,
          count: totals.count + 1,
        }
      }
      return totals
    }, { amount: 0, count: 0 })

    // Get total expenses count
    const totalExpensesCount = await db.expenseRequest.count({
      where: filterWhere,
    })

    // Get team breakdown (with filters) for all completed/paid statuses
    const teamBreakdown = await db.expenseRequest.groupBy({
      by: ['team'],
      where: completedWhere,
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
      where: completedWhere,
      _sum: {
        amountCents: true,
      },
      _count: {
        id: true,
      },
    })

    // Get category breakdown
    const categoryBreakdown = await db.expenseRequest.groupBy({
      by: ['category'],
      where: completedWhere,
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

    // Ensure all teams appear in breakdown, even if zero activity
    const teamTotalsByName = TEAM_VALUES.reduce<Record<string, { total: number; count: number }>>((acc, team) => {
      acc[team] = { total: 0, count: 0 }
      return acc
    }, {})

    teamBreakdown.forEach((breakdown: {
      team: string
      _sum: { amountCents: number | null }
      _count: { id: number }
    }) => {
      teamTotalsByName[breakdown.team] = {
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    const teamBreakdownWithNames = TEAM_VALUES.map(team => ({
      teamName: team,
      total: teamTotalsByName[team]?.total || 0,
      count: teamTotalsByName[team]?.count || 0,
    }))

    // Get campus breakdown with names
    const campusBreakdownWithNames = campusBreakdown.map((breakdown: {
      campus: string
      _sum: { amountCents: number | null }
      _count: { id: number }
    }) => {
      return {
        campusName: breakdown.campus,
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    // Ensure all categories appear in breakdown, even if zero activity
    const categoryTotalsByName = EXPENSE_CATEGORY_VALUES.reduce<Record<string, { total: number; count: number }>>((acc, category) => {
      acc[category] = { total: 0, count: 0 }
      return acc
    }, {})

    categoryBreakdown.forEach((breakdown: {
      category: string
      _sum: { amountCents: number | null }
      _count: { id: number }
    }) => {
      categoryTotalsByName[breakdown.category] = {
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    const categoryBreakdownWithNames = EXPENSE_CATEGORY_VALUES.map(category => ({
      categoryName: category,
      total: categoryTotalsByName[category]?.total || 0,
      count: categoryTotalsByName[category]?.count || 0,
    }))

    // Ensure all statuses appear in breakdown, even if zero activity
    const statusTotalsByName = STATUS_VALUES.reduce<Record<string, { total: number; count: number }>>((acc, status) => {
      acc[status] = { total: 0, count: 0 }
      return acc
    }, {})

    statusBreakdown.forEach((breakdown: {
      status: string
      _sum: { amountCents: number | null }
      _count: { id: number }
    }) => {
      statusTotalsByName[breakdown.status] = {
        total: breakdown._sum?.amountCents || 0,
        count: breakdown._count?.id || 0,
      }
    })

    const statusBreakdownWithNames = STATUS_VALUES.map(status => ({
      statusName: status,
      total: statusTotalsByName[status]?.total || 0,
      count: statusTotalsByName[status]?.count || 0,
    }))

    // Count external payees (requests marked to pay someone other than requester)
    const additionalPayeesCount = await db.expenseRequest.count({
      where: {
        ...completedWhere,
        payToExternal: true,
      },
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
      totalApproved: totalApprovedCents,
      pendingCount,
      monthlySpend: monthlySpendCents,
      totalPaid: totalPaidCents,
      totalReimbursed: reimbursementTotals.amount,
      reimbursedCount: reimbursementTotals.count,
      totalExpensesCount,
      teamBreakdown: teamBreakdownWithNames,
      campusBreakdown: campusBreakdownWithNames,
      categoryBreakdown: categoryBreakdownWithNames,
      statusBreakdown: statusBreakdownWithNames,
      additionalPayeesCount,
      recentExpenses: recentExpenses.map((expense: {
        id: string
        title: string
        amountCents: number
        status: string
        createdAt: Date
        team: string
        campus: string
        items: ExpenseWithItems['items']
      }) => {
        const approvedAmountCents = calculateApprovedAmount({
          amountCents: expense.amountCents,
          paidAmountCents: null,
          status: expense.status,
          items: expense.items as ExpenseWithItems['items'],
        })

        return {
          id: expense.id,
          title: expense.title,
          amountCents: expense.amountCents, // Total requested
          approvedAmountCents, // Total approved
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
