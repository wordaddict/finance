'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionUser } from '@/lib/auth'
import { ExpenseForm } from './expense-form'
import { DenialModal } from './denial-modal'
import { TEAM_DISPLAY_NAMES, CAMPUS_DISPLAY_NAMES } from '@/lib/constants'
import { 
  Plus,
  Filter,
  Search,
  Eye,
  Check,
  X,
  DollarSign
} from 'lucide-react'

interface Expense {
  id: string
  title: string
  amountCents: number
  status: string
  urgency: number
  campus: string
  createdAt: string
  updatedAt: string
  team: string
  description?: string
  notes?: string
  paidAt?: string
  requester: {
    name: string | null
    email: string
  }
}

interface ExpensesListProps {
  user: SessionUser
}

export function ExpensesList({ user }: ExpensesListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [denialModal, setDenialModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
  })
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    expense: Expense | null
  }>({
    isOpen: false,
    expense: null,
  })
  const [filters, setFilters] = useState({
    status: '',
    team: '',
    campus: '',
    search: '',
  })

  useEffect(() => {
    fetchExpenses()
  }, [filters])

  useEffect(() => {
  }, [])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.team) params.append('team', filters.team)
      if (filters.campus) params.append('campus', filters.campus)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/expenses?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses)
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (expenseId: string) => {
    try {
      const response = await fetch('/api/expenses/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expenseId }),
      })

      if (response.ok) {
        fetchExpenses() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to approve expense:', error)
    }
  }

  const handleDeny = async (reason: string) => {
    try {
      const response = await fetch('/api/expenses/deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expenseId: denialModal.expenseId, reason }),
      })

      if (response.ok) {
        fetchExpenses() // Refresh the list
        setDenialModal({ isOpen: false, expenseId: '', expenseTitle: '' })
      }
    } catch (error) {
      console.error('Failed to deny expense:', error)
    }
  }

  const openDenialModal = (expenseId: string, expenseTitle: string) => {
    setDenialModal({
      isOpen: true,
      expenseId,
      expenseTitle,
    })
  }

  const openViewModal = (expense: Expense) => {
    setViewModal({
      isOpen: true,
      expense,
    })
  }

  const closeDenialModal = () => {
    setDenialModal({ isOpen: false, expenseId: '', expenseTitle: '' })
  }

  const handleMarkPaid = async (expenseId: string) => {
    try {
      const response = await fetch('/api/expenses/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expenseId }),
      })

      if (response.ok) {
        fetchExpenses() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to mark expense as paid:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50'
      case 'DENIED':
        return 'text-red-600 bg-red-50'
      case 'PAID':
        return 'text-blue-600 bg-blue-50'
      case 'SUBMITTED':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 4) return 'text-red-600'
    if (urgency >= 3) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading expenses...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expense Requests</h1>
          <p className="text-gray-500">
            Manage and track expense requests
          </p>
        </div>
        <Button onClick={() => setShowExpenseForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Expense
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Team</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.team}
                onChange={(e) => setFilters({ ...filters, team: e.target.value })}
              >
                <option value="">All Teams</option>
                {Object.entries(TEAM_DISPLAY_NAMES).map(([value, displayName]) => (
                  <option key={value} value={value}>
                    {displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Campus</label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={filters.campus}
                onChange={(e) => setFilters({ ...filters, campus: e.target.value })}
              >
                <option value="">All Campuses</option>
                {Object.entries(CAMPUS_DISPLAY_NAMES).map(([value, displayName]) => (
                  <option key={value} value={value}>
                    {displayName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Search</label>
              <div className="relative mt-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  className="w-full pl-8 pr-3 py-2 border rounded-md"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        {expenses.map((expense) => (
          <Card key={expense.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold">{expense.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                      {expense.status}
                    </span>
                    <span className={`text-sm font-medium ${getUrgencyColor(expense.urgency)}`}>
                      Urgency: {expense.urgency}/5
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1">
                    {TEAM_DISPLAY_NAMES[expense.team as keyof typeof TEAM_DISPLAY_NAMES] || expense.team} • {CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus} • {expense.requester.name || expense.requester.email}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {formatDate(expense.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xl font-bold">{formatCurrency(expense.amountCents)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openViewModal(expense)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {expense.status === 'SUBMITTED' && (user.role === 'ADMIN' || user.role === 'CAMPUS_PASTOR') && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleApprove(expense.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDenialModal(expense.id, expense.title)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Deny
                        </Button>
                      </>
                    )}
                    {expense.status === 'APPROVED' && user.role === 'ADMIN' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkPaid(expense.id)}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expenses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No expenses found matching your criteria.</p>
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

      {/* Denial Modal */}
      <DenialModal
        isOpen={denialModal.isOpen}
        expenseTitle={denialModal.expenseTitle}
        onClose={closeDenialModal}
        onConfirm={handleDeny}
      />

      {/* View Modal */}
      {viewModal.isOpen && viewModal.expense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Expense Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewModal({ isOpen: false, expense: null })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{viewModal.expense.title}</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(viewModal.expense.amountCents)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className={`font-medium ${getStatusColor(viewModal.expense.status)}`}>
                    {viewModal.expense.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Urgency</label>
                  <p className={`font-medium ${getUrgencyColor(viewModal.expense.urgency)}`}>
                    {viewModal.expense.urgency}/5
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Team</label>
                  <p className="font-medium">
                    {TEAM_DISPLAY_NAMES[viewModal.expense.team as keyof typeof TEAM_DISPLAY_NAMES] || viewModal.expense.team}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Campus</label>
                  <p className="font-medium">
                    {CAMPUS_DISPLAY_NAMES[viewModal.expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || viewModal.expense.campus}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Requester</label>
                  <p className="font-medium">
                    {viewModal.expense.requester.name || viewModal.expense.requester.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="font-medium">{formatDate(viewModal.expense.createdAt)}</p>
                </div>
              </div>

              {viewModal.expense.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{viewModal.expense.description}</p>
                </div>
              )}

              {viewModal.expense.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <p className="mt-1 p-3 bg-yellow-50 rounded-md">{viewModal.expense.notes}</p>
                </div>
              )}

              {viewModal.expense.paidAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Paid At</label>
                  <p className="font-medium">{formatDate(viewModal.expense.paidAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
