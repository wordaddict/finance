'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionUser } from '@/lib/auth'
import { ExpenseForm } from './expense-form'
import { DenialModal } from './denial-modal'
import { ReportForm } from './report-form'
import { TEAM_DISPLAY_NAMES, CAMPUS_DISPLAY_NAMES, URGENCY_DISPLAY_NAMES, STATUS_DISPLAY_NAMES } from '@/lib/constants'
import { 
  Plus,
  Filter,
  Search,
  Eye,
  Check,
  X,
  DollarSign,
  FileText
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
  category?: string
  notes?: string
  paidAt?: string
  eventDate?: string
  requester: {
    name: string | null
    email: string
    zelle: string | null
  }
  attachments?: {
    id: string
    publicId: string
    secureUrl: string
    mimeType: string
  }[]
  items?: {
    id: string
    description: string
    quantity: number
    unitPriceCents: number
    amountCents: number
    approvals?: {
      id: string
      status: string
      comment?: string | null
      approver: {
        name: string | null
        email: string
      }
      createdAt: string
    }[]
  }[]
}

interface ExpensesListProps {
  user: SessionUser
}

export function ExpensesList({ user }: ExpensesListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [itemCommentModal, setItemCommentModal] = useState<{
    isOpen: boolean
    itemId: string
    action: 'APPROVED' | 'DENIED'
    comment: string
    processing: boolean
  }>({
    isOpen: false,
    itemId: '',
    action: 'APPROVED',
    comment: '',
    processing: false
  })
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
  const [reportForm, setReportForm] = useState<{
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

  const handleItemApproval = async (itemId: string, status: 'APPROVED' | 'DENIED', comment?: string) => {
    try {
      setLoading(true)
      
      const endpoint = status === 'APPROVED' ? '/api/expense-items/approve' : '/api/expense-items/deny'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          comment: comment || undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Close modal immediately
        setItemCommentModal(prev => ({ ...prev, isOpen: false, comment: '', processing: false }))
        
        // Update the specific item in the expenses state
        setExpenses(prevExpenses => {
          const updatedExpenses = prevExpenses.map(expense => {
            const updatedItems = expense.items?.map(item => 
              item.id === itemId 
                ? {
                    ...item,
                    approvals: [{
                      id: data.approval.id,
                      status: status,
                      comment: comment || null,
                      approver: {
                        name: user.name,
                        email: user.email
                      },
                      createdAt: new Date().toISOString()
                    }]
                  }
                : item
            )

            // Check approval status of all items
            const allItemsApproved = updatedItems?.every(item => 
              item.approvals?.[0]?.status === 'APPROVED'
            )

            const allItemsDenied = updatedItems?.every(item => 
              item.approvals?.[0]?.status === 'DENIED'
            )

            const someItemsApproved = updatedItems?.some(item => 
              item.approvals?.[0]?.status === 'APPROVED'
            )

            const someItemsDenied = updatedItems?.some(item => 
              item.approvals?.[0]?.status === 'DENIED'
            )

            const allItemsProcessed = updatedItems?.every(item => 
              item.approvals?.[0]?.status === 'APPROVED' || item.approvals?.[0]?.status === 'DENIED'
            )

            if (allItemsApproved && expense.status === 'SUBMITTED') {
              // Auto-approve the expense
              setTimeout(async () => {
                try {
                  const approveResponse = await fetch('/api/expenses/approve', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ expenseId: expense.id }),
                  })

                  if (approveResponse.ok) {
                    setMessage('All items approved - expense automatically approved')
                    // Refresh expenses to get updated status
                    await fetchExpenses()
                  }
                } catch (error) {
                  console.error('Error auto-approving expense:', error)
                }
              }, 1000) // Small delay to show item approval first
            } else if (allItemsDenied && expense.status === 'SUBMITTED') {
              // Auto-deny the expense
              setTimeout(async () => {
                try {
                  const denyResponse = await fetch('/api/expenses/deny', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      expenseId: expense.id,
                      reason: 'All expense items were denied'
                    }),
                  })

                  if (denyResponse.ok) {
                    setMessage('All items denied - expense automatically denied')
                    // Refresh expenses to get updated status
                    await fetchExpenses()
                  }
                } catch (error) {
                  console.error('Error auto-denying expense:', error)
                }
              }, 1000) // Small delay to show item denial first
            } else if (allItemsProcessed && someItemsApproved && someItemsDenied && expense.status === 'SUBMITTED') {
              // Set expense to PARTIALLY_APPROVED status
              setTimeout(async () => {
                try {
                  const updateResponse = await fetch('/api/expenses/update-status', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                      expenseId: expense.id,
                      status: 'PARTIALLY_APPROVED'
                    }),
                  })

                  if (updateResponse.ok) {
                    setMessage('Mixed approvals - expense set to partially approved')
                    // Refresh expenses to get updated status
                    await fetchExpenses()
                  }
                } catch (error) {
                  console.error('Error updating expense status:', error)
                }
              }, 1000) // Small delay to show item approval/denial first
            }

            return {
              ...expense,
              items: updatedItems
            }
          })
          
          // Also update the viewModal if it's showing the same expense
          const updatedExpense = updatedExpenses.find(exp => exp.id === viewModal.expense?.id)
          if (updatedExpense && viewModal.expense) {
            setViewModal(prev => ({
              ...prev,
              expense: updatedExpense
            }))
          }
          
          return updatedExpenses
        })
        
        setMessage(`Item ${status.toLowerCase()} successfully`)
      } else {
        setError(data.error || `Failed to ${status.toLowerCase()} item`)
      }
    } catch (error) {
      console.error(`Error ${status.toLowerCase()}ing item:`, error)
      setError(`Failed to ${status.toLowerCase()} item`)
    } finally {
      setLoading(false)
    }
  }

  const handleItemApprovalClick = (itemId: string, action: 'APPROVED' | 'DENIED') => {
    setItemCommentModal({
      isOpen: true,
      itemId,
      action,
      comment: '',
      processing: false
    })
  }

  const handleItemCommentSubmit = () => {
    const { itemId, action, comment } = itemCommentModal
    if (action === 'DENIED' && !comment.trim()) {
      setError('Comment is required when denying an item')
      return
    }
    
    // Set processing state
    setItemCommentModal(prev => ({ ...prev, processing: true }))
    handleItemApproval(itemId, action, comment.trim() || undefined)
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

  const openReportForm = (expense: Expense) => {
    setReportForm({
      isOpen: true,
      expense,
    })
  }

  const closeReportForm = () => {
    setReportForm({
      isOpen: false,
      expense: null,
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
      case 'PARTIALLY_APPROVED':
        return 'text-orange-600 bg-orange-50'
      case 'PAID':
        return 'text-blue-600 bg-blue-50'
      case 'SUBMITTED':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyColor = (urgency: number) => {
    if (urgency === 3) return 'text-red-600' // Very Urgent
    if (urgency === 2) return 'text-yellow-600' // Urgent
    return 'text-green-600' // Not Urgent
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
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Expense Requests</h1>
          <p className="text-gray-500 text-sm sm:text-base">
            Manage and track expense requests
          </p>
        </div>
        <Button onClick={() => setShowExpenseForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">New Expense</span>
          <span className="sm:hidden">New</span>
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
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-semibold">{expense.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {STATUS_DISPLAY_NAMES[expense.status as keyof typeof STATUS_DISPLAY_NAMES] || expense.status}
                      </span>
                      <span className={`text-xs sm:text-sm font-medium ${getUrgencyColor(expense.urgency)}`}>
                        {URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || `Urgency: ${expense.urgency}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-1 text-sm">
                    {TEAM_DISPLAY_NAMES[expense.team as keyof typeof TEAM_DISPLAY_NAMES] || expense.team} • {CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus} • {expense.requester.name || expense.requester.email}
                  </p>
                  {expense.category && (
                    <p className="text-gray-600 mt-1 text-sm font-medium">
                      Category: {expense.category}
                    </p>
                  )}
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Created: {formatDate(expense.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-lg sm:text-xl font-bold">{formatCurrency(expense.amountCents)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openViewModal(expense)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">View</span>
                    </Button>
                    {expense.status === 'SUBMITTED' && (user.role === 'ADMIN' || user.role === 'CAMPUS_PASTOR') && (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleApprove(expense.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openDenialModal(expense.id, expense.title)}
                          className="flex-1 sm:flex-none"
                        >
                          <X className="w-4 h-4 mr-1" />
                          <span className="hidden sm:inline">Deny</span>
                        </Button>
                      </>
                    )}
                    {expense.status === 'APPROVED' && user.role === 'ADMIN' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkPaid(expense.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Mark Paid</span>
                      </Button>
                    )}
                    {expense.status === 'PAID' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openReportForm(expense)}
                        className="flex-1 sm:flex-none bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Create Report</span>
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

      {/* Report Form */}
      {reportForm.isOpen && reportForm.expense && (
        <ReportForm
          expense={reportForm.expense}
          onClose={closeReportForm}
        />
      )}

      {/* View Modal */}
      {viewModal.isOpen && viewModal.expense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Expense Details</h2>
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
                <h3 className="font-semibold text-base sm:text-lg">{viewModal.expense.title}</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {formatCurrency(viewModal.expense.amountCents)}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className={`font-medium ${getStatusColor(viewModal.expense.status)}`}>
                    {STATUS_DISPLAY_NAMES[viewModal.expense.status as keyof typeof STATUS_DISPLAY_NAMES] || viewModal.expense.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Urgency</label>
                  <p className={`font-medium ${getUrgencyColor(viewModal.expense.urgency)}`}>
                    {URGENCY_DISPLAY_NAMES[viewModal.expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || `Urgency: ${viewModal.expense.urgency}`}
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
                {user.role === 'ADMIN' && viewModal.expense.requester.zelle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Zelle</label>
                    <p className="font-medium text-green-600">
                      {viewModal.expense.requester.zelle}
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="font-medium">{formatDate(viewModal.expense.createdAt)}</p>
                </div>
                {viewModal.expense.eventDate && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Event Date</label>
                    <p className="font-medium">{formatDate(viewModal.expense.eventDate)}</p>
                  </div>
                )}
              </div>

              {viewModal.expense.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm sm:text-base">{viewModal.expense.description}</p>
                </div>
              )}

              {viewModal.expense.category && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm sm:text-base">{viewModal.expense.category}</p>
                </div>
              )}

              {viewModal.expense.items && viewModal.expense.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Expense Items</label>
                  <div className="mt-2 space-y-3">
                    {viewModal.expense.items.map((item, index) => {
                      const itemApproval = item.approvals?.[0]
                      const approvalStatus = itemApproval?.status || 'PENDING'
                      
                      return (
                        <div key={item.id} className={`p-3 rounded-md border ${
                          approvalStatus === 'APPROVED' ? 'bg-green-50 border-green-200' :
                          approvalStatus === 'DENIED' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.description}</p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} × ${(item.unitPriceCents / 100).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                ${(item.amountCents / 100).toFixed(2)}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                approvalStatus === 'DENIED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {approvalStatus}
                              </span>
                            </div>
                          </div>
                          
                          {itemApproval && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <p className="text-xs text-gray-600">
                                <strong>{itemApproval.approver.name || itemApproval.approver.email}</strong>
                                {' - '}
                                {new Date(itemApproval.createdAt).toLocaleDateString()}
                              </p>
                              {itemApproval.comment && (
                                <p className="text-sm mt-1">{itemApproval.comment}</p>
                              )}
                            </div>
                          )}

                          {user.role === 'ADMIN' && viewModal.expense && viewModal.expense.status === 'SUBMITTED' && approvalStatus === 'PENDING' && (
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemApprovalClick(item.id, 'APPROVED')}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemApprovalClick(item.id, 'DENIED')}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Deny
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="bg-green-50 p-3 rounded-md border-t-2 border-green-200">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">Total Amount:</span>
                        <span className="font-bold text-lg text-green-800">
                          ${(viewModal.expense.amountCents / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {viewModal.expense.attachments && viewModal.expense.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Attachments</label>
                  <div className="mt-2 space-y-2">
                    {viewModal.expense.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          {attachment.mimeType.startsWith('image/') ? (
                            <img
                              src={attachment.secureUrl}
                              alt="Receipt"
                              className="w-12 h-12 object-cover rounded border"
                              onClick={() => window.open(attachment.secureUrl, '_blank')}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-red-100 rounded border flex items-center justify-center">
                              <FileText className="w-6 h-6 text-red-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {attachment.mimeType.startsWith('image/') ? 'Receipt Image' : 'PDF Document'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {attachment.mimeType}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(attachment.secureUrl, '_blank')}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewModal.expense.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <p className="mt-1 p-3 bg-yellow-50 rounded-md text-sm sm:text-base">{viewModal.expense.notes}</p>
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

      {/* Item Comment Modal */}
      {itemCommentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {itemCommentModal.action === 'APPROVED' ? 'Approve Item' : 'Deny Item'}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment {itemCommentModal.action === 'DENIED' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={itemCommentModal.comment}
                  onChange={(e) => setItemCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder={itemCommentModal.action === 'DENIED' 
                    ? "Please provide a reason for denial..." 
                    : "Add an optional comment..."
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setItemCommentModal(prev => ({ ...prev, isOpen: false, comment: '', processing: false }))}
                  disabled={itemCommentModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleItemCommentSubmit}
                  disabled={itemCommentModal.processing || (itemCommentModal.action === 'DENIED' && !itemCommentModal.comment.trim())}
                  className={itemCommentModal.action === 'APPROVED' 
                    ? "bg-green-600 hover:bg-green-700" 
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {itemCommentModal.processing ? 'Processing...' : (itemCommentModal.action === 'APPROVED' ? 'Approve' : 'Deny')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
