'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionUser } from '@/lib/auth'
import { ExpenseForm } from './expense-form'
import { 
  DollarSign, 
  FileText, 
  Clock, 
  TrendingUp,
  Plus,
  Download
} from 'lucide-react'

interface DashboardStats {
  totalApproved: number
  pendingCount: number
  monthlySpend: number
  teamBreakdown: Array<{
    teamName: string
    total: number
    count: number
  }>
  recentExpenses: Array<{
    id: string
    title: string
    amountCents: number
    status: string
    createdAt: string
    teamName: string
  }>
}

interface DashboardProps {
  user: SessionUser
}

export function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
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
      const response = await fetch('/api/expenses/export-csv')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'expenses.csv'
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export CSV:', error)
    }
  }

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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">
            Welcome back, {user.name || user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setShowExpenseForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Approved
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalApproved || 0)}
            </div>
            <p className="text-xs text-gray-500">
              All time approved expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingCount || 0}
            </div>
            <p className="text-xs text-gray-500">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              This Month
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.monthlySpend || 0)}
            </div>
            <p className="text-xs text-gray-500">
              Current month spending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Teams
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.teamBreakdown.length || 0}
            </div>
            <p className="text-xs text-gray-500">
              Active teams
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Breakdown */}
      {stats?.teamBreakdown && stats.teamBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Breakdown</CardTitle>
            <CardDescription>
              Spending by team this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.teamBreakdown.map((team) => (
                <div key={team.teamName} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{team.teamName}</p>
                    <p className="text-sm text-gray-500">
                      {team.count} request{team.count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(team.total)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {stats?.recentExpenses && stats.recentExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
            <CardDescription>
              Latest expense requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{expense.title}</p>
                    <p className="text-sm text-gray-500">
                      {expense.teamName} • {formatDate(expense.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(expense.amountCents)}</p>
                    <p className={`text-sm ${
                      expense.status === 'APPROVED' ? 'text-green-600' :
                      expense.status === 'DENIED' ? 'text-red-600' :
                      expense.status === 'PAID' ? 'text-blue-600' :
                      'text-yellow-600'
                    }`}>
                      {expense.status}
                    </p>
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
