'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionUser } from '@/lib/auth'
import { ExpenseForm } from './expense-form'
import { TEAMS, TEAM_DISPLAY_NAMES, CAMPUS_DISPLAY_NAMES, STATUS_DISPLAY_NAMES, ACCOUNT_DISPLAY_NAMES, EXPENSE_TYPES, EXPENSE_CATEGORIES, URGENCY_DISPLAY_NAMES, TEAM_VALUES, CAMPUS_VALUES, STATUS_VALUES, ACCOUNT_VALUES, EXPENSE_TYPE_VALUES, EXPENSE_CATEGORY_VALUES, URGENCY_VALUES } from '@/lib/constants'
import { 
  DollarSign, 
  FileText, 
  Clock, 
  TrendingUp,
  Plus,
  Download,
  Filter,
  X,
  BarChart3,
  Users,
  MapPin
} from 'lucide-react'

interface DashboardStats {
  totalApproved: number
  pendingCount: number
  monthlySpend: number
  totalPaid: number
  totalExpensesCount: number
  teamBreakdown: Array<{
    teamName: string
    total: number
    count: number
  }>
  campusBreakdown: Array<{
    campusName: string
    total: number
    count: number
  }>
  statusBreakdown: Array<{
    statusName: string
    total: number
    count: number
  }>
  recentExpenses: Array<{
    id: string
    title: string
    amountCents: number
    approvedAmountCents: number
    status: string
    createdAt: string
    teamName: string
    campus: string
  }>
}

interface DashboardFilters {
  status: string
  team: string
  campus: string
  startDate: string
  endDate: string
  urgency: string
  account: string
  expenseType: string
  category: string
}

interface DashboardProps {
  user: SessionUser
}

export function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<DashboardFilters>({
    status: '',
    team: '',
    campus: '',
    startDate: '',
    endDate: '',
    urgency: '',
    account: '',
    expenseType: '',
    category: '',
  })

  useEffect(() => {
    fetchDashboardStats()
  }, [filters])

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.team) params.append('team', filters.team)
      if (filters.campus) params.append('campus', filters.campus)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.urgency) params.append('urgency', filters.urgency)
      if (filters.account) params.append('account', filters.account)
      if (filters.expenseType) params.append('expenseType', filters.expenseType)
      if (filters.category) params.append('category', filters.category)

      const response = await fetch(`/api/dashboard/stats?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.team) params.append('team', filters.team)
      if (filters.campus) params.append('campus', filters.campus)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.urgency) params.append('urgency', filters.urgency)
      if (filters.account) params.append('account', filters.account)
      if (filters.expenseType) params.append('expenseType', filters.expenseType)
      if (filters.category) params.append('category', filters.category)

      const response = await fetch(`/api/expenses/export-csv?${params.toString()}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const contentDisposition = response.headers.get('content-disposition')
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') || 'expenses.csv'
          : 'expenses.csv'
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export CSV:', error)
    }
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      team: '',
      campus: '',
      startDate: '',
      endDate: '',
      urgency: '',
      account: '',
      expenseType: '',
      category: '',
    })
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== '')

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Welcome back, {user.name || user.email}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setShowFilters(!showFilters)} 
            variant="outline" 
            className="w-full sm:w-auto"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-600 text-white rounded-full px-2 py-0.5 text-xs">
                {Object.values(filters).filter(v => v !== '').length}
              </span>
            )}
          </Button>
          <Button onClick={handleExportCSV} variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button onClick={() => setShowExpenseForm(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">New Expense</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                <CardTitle>Filters</CardTitle>
              </div>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Statuses</option>
                  {STATUS_VALUES.map(status => (
                    <option key={status} value={status}>
                      {STATUS_DISPLAY_NAMES[status as keyof typeof STATUS_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Team</label>
                <select
                  value={filters.team}
                  onChange={(e) => setFilters({ ...filters, team: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Teams</option>
                  {TEAM_VALUES.map(team => (
                    <option key={team} value={team}>
                      {TEAM_DISPLAY_NAMES[team as keyof typeof TEAM_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Campus</label>
                <select
                  value={filters.campus}
                  onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Campuses</option>
                  {CAMPUS_VALUES.map(campus => (
                    <option key={campus} value={campus}>
                      {CAMPUS_DISPLAY_NAMES[campus as keyof typeof CAMPUS_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div>

              {/* <div>
                <label className="text-sm font-medium mb-1 block">Urgency</label>
                <select
                  value={filters.urgency}
                  onChange={(e) => setFilters({ ...filters, urgency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Urgencies</option>
                  {URGENCY_VALUES.map(urgency => (
                    <option key={urgency} value={urgency.toString()}>
                      {URGENCY_DISPLAY_NAMES[urgency as keyof typeof URGENCY_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div> */}

              <div>
                <label className="text-sm font-medium mb-1 block">Account</label>
                <select
                  value={filters.account}
                  onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Accounts</option>
                  {ACCOUNT_VALUES.map(account => (
                    <option key={account} value={account}>
                      {ACCOUNT_DISPLAY_NAMES[account as keyof typeof ACCOUNT_DISPLAY_NAMES]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Expense Type</label>
                <select
                  value={filters.expenseType}
                  onChange={(e) => setFilters({ ...filters, expenseType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Types</option>
                  {EXPENSE_TYPE_VALUES.map(type => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Categories</option>
                  {EXPENSE_CATEGORY_VALUES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Approved
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(stats?.totalApproved || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Approved expenses
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Paid
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {formatCurrency(stats?.totalPaid || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Amount paid out
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats?.pendingCount || 0}
            </div>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats?.totalExpensesCount || 0}
            </div>
            <p className="text-xs text-gray-500">
              {hasActiveFilters ? 'Filtered expenses' : 'All expenses'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Cards */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {/* Team Breakdown */}
        {stats?.teamBreakdown && stats.teamBreakdown.length > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <div className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                <CardTitle>Team Breakdown</CardTitle>
              </div>
              <CardDescription>
                Spending by team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.teamBreakdown.map((team) => (
                  <div key={team.teamName} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm sm:text-base">
                        {(() => {
                          const teamKey = team.teamName as keyof typeof TEAM_DISPLAY_NAMES
                          const display = TEAM_DISPLAY_NAMES[teamKey]
                          if (display) return display
                          if (team.teamName === 'ADMIN') return TEAM_DISPLAY_NAMES[TEAMS.ADMIN as keyof typeof TEAM_DISPLAY_NAMES]
                          if (team.teamName === 'PROTOCOL') return TEAM_DISPLAY_NAMES[TEAMS.PROTOCOL as keyof typeof TEAM_DISPLAY_NAMES]
                          return team.teamName
                        })()}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {team.count} request{team.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-sm sm:text-base">{formatCurrency(team.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campus Breakdown */}
        {stats?.campusBreakdown && stats.campusBreakdown.length > 0 && (
          <Card className="rounded-xl shadow-sm">
            <CardHeader>
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-2" />
                <CardTitle>Campus Breakdown</CardTitle>
              </div>
              <CardDescription>
                Spending by campus
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.campusBreakdown.map((campus) => (
                  <div key={campus.campusName} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm sm:text-base">
                        {CAMPUS_DISPLAY_NAMES[campus.campusName as keyof typeof CAMPUS_DISPLAY_NAMES] || campus.campusName}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        {campus.count} request{campus.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-sm sm:text-base">{formatCurrency(campus.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Status Breakdown */}
      {stats?.statusBreakdown && stats.statusBreakdown.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2" />
              <CardTitle>Status Breakdown</CardTitle>
            </div>
            <CardDescription>
              Expenses by status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {stats.statusBreakdown.map((status) => (
                <div key={status.statusName} className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium text-sm mb-1">
                    {STATUS_DISPLAY_NAMES[status.statusName as keyof typeof STATUS_DISPLAY_NAMES] || status.statusName}
                  </p>
                  <p className="text-2xl font-bold">{formatCurrency(status.total)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {status.count} expense{status.count !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {stats?.recentExpenses && stats.recentExpenses.length > 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>
              Latest expense requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm sm:text-base">{expense.title}</p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {TEAM_DISPLAY_NAMES[expense.teamName as keyof typeof TEAM_DISPLAY_NAMES] || expense.teamName} • {CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus} • {formatDate(expense.createdAt)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-row sm:items-center sm:justify-end gap-2">
                        <p className="text-xs sm:text-sm text-gray-500">Requested:</p>
                        <p className="font-medium text-sm sm:text-base">{formatCurrency(expense.amountCents)}</p>
                        <span className="text-gray-400">|</span>
                        <p className="text-xs sm:text-sm text-gray-500">Approved:</p>
                        <p className="font-medium text-sm sm:text-base text-blue-600">{formatCurrency(expense.approvedAmountCents)}</p>
                      </div>
                      <p className={`text-xs sm:text-sm ${
                        expense.status === 'APPROVED' ? 'text-green-600' :
                        expense.status === 'DENIED' ? 'text-red-600' :
                        expense.status === 'PAID' ? 'text-blue-600' :
                        expense.status === 'EXPENSE_REPORT_REQUESTED' ? 'text-indigo-600' :
                        'text-yellow-600'
                      }`}>
                        {STATUS_DISPLAY_NAMES[expense.status as keyof typeof STATUS_DISPLAY_NAMES] || expense.status}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          user={user}
          onClose={() => setShowExpenseForm(false)}
        />
      )}
    </div>
  )
}
