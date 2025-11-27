'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { SessionUser } from '@/lib/auth'
import { ExpenseForm } from './expense-form'
import { DenialModal } from './denial-modal'
import { ReportForm } from './report-form'
import { TEAM_DISPLAY_NAMES, CAMPUS_DISPLAY_NAMES, URGENCY_DISPLAY_NAMES, STATUS_DISPLAY_NAMES, ACCOUNT_DISPLAY_NAMES, EXPENSE_TYPES } from '@/lib/constants'
import { 
  Plus,
  Filter,
  Search,
  Eye,
  Check,
  X,
  DollarSign,
  FileText,
  Tag
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
  paymentDate?: string
  paidBy?: string | null
  paidAmountCents?: number | null
  eventDate?: string
  eventName?: string | null
  fullEventBudgetCents?: number | null
  reportRequired: boolean
  account?: string | null
  expenseType?: string | null
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
    itemId?: string | null
  }[]
  pastorRemarks?: {
    id: string
    remark: string
    createdAt: string
    pastor: {
      id: string
      name: string | null
      email: string
    }
  }[]
  items?: {
    id: string
    description: string
    category?: string | null
    quantity: number
    unitPriceCents: number
    amountCents: number
    approvals?: {
      id: string
      status: string
      approvedAmountCents?: number | null
      comment?: string | null
      approver: {
        name: string | null
        email: string
      }
      createdAt: string
    }[]
  }[]
  reports?: {
    id: string
    title: string
    content: string
    reportDate: string
    totalApprovedAmount?: number
    expense?: {
      id: string
      title: string
      requesterId: string
      campus: string
      requester?: {
        name: string | null
        email: string
      }
    }
    attachments: {
      id: string
      publicId: string
      secureUrl: string
      mimeType: string
      itemId?: string | null
      isRefundReceipt?: boolean
    }[]
    approvedItems: {
      id: string
      originalItemId: string
      description: string
      approvedAmountCents: number
      actualAmountCents?: number | null
    }[]
    notes?: {
      id: string
      note: string
      createdAt: string
      author: {
        id: string
        name: string | null
        email: string
        role: string
      }
    }[]
    totalActualAmount?: number | null
  }[]
  expenseNotes?: {
    id: string
    note: string
    createdAt: string
    author: {
      id: string
      name: string | null
      email: string
      role: string
    }
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
    action: 'APPROVED' | 'DENIED' | 'CHANGE_REQUESTED'
    comment: string
    approvedAmount: string
    itemAmount: number
    processing: boolean
  }>({
    isOpen: false,
    itemId: '',
    action: 'APPROVED',
    comment: '',
    approvedAmount: '',
    itemAmount: 0,
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
  const [editModal, setEditModal] = useState<{
    isOpen: boolean
    expense: Expense | null
  }>({
    isOpen: false,
    expense: null
  })
  const [changeRequestModal, setChangeRequestModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    comment: string
    processing: boolean
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    comment: '',
    processing: false
  })
  const [noteInput, setNoteInput] = useState<Record<string, string>>({}) // Notes being typed per expense
  const [addingNote, setAddingNote] = useState<Record<string, boolean>>({}) // Loading state per expense
  const [reportNoteInput, setReportNoteInput] = useState<Record<string, string>>({}) // Notes being typed per report
  const [addingReportNote, setAddingReportNote] = useState<Record<string, boolean>>({}) // Loading state per report
  const [reportViewModal, setReportViewModal] = useState<{
    isOpen: boolean
    report: any | null
  }>({
    isOpen: false,
    report: null,
  })
  const [markPaidModal, setMarkPaidModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    reportRequired: boolean
    paymentDate: string
    paidBy: string
    processing: boolean
    isAdditionalPayment: boolean
    additionalPaymentAmount: number
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    reportRequired: true,
    paymentDate: '',
    paidBy: '',
    processing: false,
    isAdditionalPayment: false,
    additionalPaymentAmount: 0,
  })

  const [accountModal, setAccountModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    currentAccount: string | null
    processing: boolean
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    currentAccount: null,
    processing: false,
  })

  const [expenseTypeModal, setExpenseTypeModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    currentType: string | null
    customType: string
    processing: boolean
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    currentType: null,
    customType: '',
    processing: false,
  })
  const [approvalCommentModal, setApprovalCommentModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    comment: string
    processing: boolean
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    comment: '',
    processing: false
  })
  const [pastorRemarkModal, setPastorRemarkModal] = useState<{
    isOpen: boolean
    expenseId: string
    expenseTitle: string
    remark: string
    processing: boolean
  }>({
    isOpen: false,
    expenseId: '',
    expenseTitle: '',
    remark: '',
    processing: false
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

  const handleItemApproval = async (itemId: string, status: 'APPROVED' | 'DENIED' | 'CHANGE_REQUESTED', comment?: string, approvedAmountCents?: number) => {
    try {
      setLoading(true)
      
      const endpoint = status === 'APPROVED' ? '/api/expense-items/approve' : 
                      status === 'DENIED' ? '/api/expense-items/deny' : 
                      '/api/expense-items/change-request'
      
      const requestBody: any = {
        itemId,
        comment: comment || undefined,
      }

      // Add approved amount for approval requests
      if (status === 'APPROVED' && approvedAmountCents !== undefined) {
        requestBody.approvedAmountCents = approvedAmountCents
      }
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
                      approvedAmountCents: data.approval.approvedAmountCents || null,
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

            const someItemsChangeRequested = updatedItems?.some(item => 
              item.approvals?.[0]?.status === 'CHANGE_REQUESTED'
            )

            const allItemsChangeRequested = updatedItems?.every(item => 
              item.approvals?.[0]?.status === 'CHANGE_REQUESTED'
            )

            const allItemsProcessed = updatedItems?.every(item => 
              item.approvals?.[0]?.status === 'APPROVED' || item.approvals?.[0]?.status === 'DENIED' || item.approvals?.[0]?.status === 'CHANGE_REQUESTED'
            )

            // Removed auto-approval/denial logic - expenses must be manually approved/denied

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

  const handleItemApprovalClick = (itemId: string, action: 'APPROVED' | 'DENIED' | 'CHANGE_REQUESTED', itemAmount: number) => {
    setItemCommentModal({
      isOpen: true,
      itemId,
      action,
      comment: '',
      approvedAmount: action === 'APPROVED' ? (itemAmount / 100).toFixed(2) : '',
      itemAmount,
      processing: false
    })
  }

  const handleItemCommentSubmit = () => {
    const { itemId, action, comment, approvedAmount, itemAmount } = itemCommentModal
    
    if ((action === 'DENIED' || action === 'CHANGE_REQUESTED') && !comment.trim()) {
      setError(`Comment is required when ${action === 'DENIED' ? 'denying' : 'requesting changes to'} an item`)
      return
    }

    if (action === 'APPROVED' && approvedAmount) {
      const approvedAmountCents = Math.round(parseFloat(approvedAmount) * 100)
      if (approvedAmountCents > itemAmount) {
        setError('Approved amount cannot exceed item amount')
        return
      }
      if (approvedAmountCents < 0) {
        setError('Approved amount cannot be negative')
        return
      }
    }
    
    // Set processing state
    setItemCommentModal(prev => ({ ...prev, processing: true }))
    
    const approvedAmountCents = action === 'APPROVED' && approvedAmount 
      ? Math.round(parseFloat(approvedAmount) * 100) 
      : undefined

    handleItemApproval(itemId, action, comment.trim() || undefined, approvedAmountCents)
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

  const openChangeRequestModal = (expenseId: string, expenseTitle: string) => {
    setChangeRequestModal({
      isOpen: true,
      expenseId,
      expenseTitle,
      comment: '',
      processing: false
    })
  }

  const handleRequestChange = async () => {
    if (!changeRequestModal.comment.trim()) {
      setError('Please provide a reason for requesting changes')
      return
    }

    try {
      setChangeRequestModal(prev => ({ ...prev, processing: true }))
      setError('')
      
      const response = await fetch('/api/expenses/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expenseId: changeRequestModal.expenseId,
          comment: changeRequestModal.comment.trim()
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Change request submitted successfully. You can now add more items to this expense.')
        setChangeRequestModal({
          isOpen: false,
          expenseId: '',
          expenseTitle: '',
          comment: '',
          processing: false
        })
        fetchExpenses() // Refresh the list
      } else {
        setError(data.error || 'Failed to submit change request')
      }
    } catch (error) {
      console.error('Failed to request change:', error)
      setError('Failed to submit change request')
    } finally {
      setChangeRequestModal(prev => ({ ...prev, processing: false }))
    }
  }

  const openViewModal = (expense: Expense) => {
    setViewModal({
      isOpen: true,
      expense,
    })
  }

  const handleViewOrEditClick = (expense: Expense) => {
    // If it's a change request and the user is the original requester, open edit modal
    if (expense.status === 'CHANGE_REQUESTED' && expense.requester.email === user.email) {
      setEditModal({
        isOpen: true,
        expense
      })
    } else {
      // Otherwise, open view modal
      openViewModal(expense)
    }
  }

  const openApprovalCommentModal = (expenseId: string, expenseTitle: string) => {
    setApprovalCommentModal({
      isOpen: true,
      expenseId,
      expenseTitle,
      comment: '',
      processing: false
    })
  }

  const openPastorRemarkModal = (expenseId: string, expenseTitle: string) => {
    setPastorRemarkModal({
      isOpen: true,
      expenseId,
      expenseTitle,
      remark: '',
      processing: false
    })
  }

  const handleApprovalCommentSubmit = async () => {

    setApprovalCommentModal(prev => ({ ...prev, processing: true }))

    try {
      const response = await fetch('/api/expenses/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: approvalCommentModal.expenseId,
          comment: approvalCommentModal.comment,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setApprovalCommentModal({
          isOpen: false,
          expenseId: '',
          expenseTitle: '',
          comment: '',
          processing: false
        })
        setMessage('Expense request approved successfully')
        fetchExpenses()
      } else {
        setMessage(data.error || 'Failed to approve expense request')
      }
    } catch (error) {
      setMessage('Failed to approve expense request')
    } finally {
      setApprovalCommentModal(prev => ({ ...prev, processing: false }))
    }
  }

  const handlePastorRemarkSubmit = async () => {
    if (!pastorRemarkModal.remark.trim()) {
      setMessage('Please provide a remark')
      return
    }

    setPastorRemarkModal(prev => ({ ...prev, processing: true }))

    try {
      const response = await fetch('/api/expenses/pastor-remark', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: pastorRemarkModal.expenseId,
          remark: pastorRemarkModal.remark,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setPastorRemarkModal({
          isOpen: false,
          expenseId: '',
          expenseTitle: '',
          remark: '',
          processing: false
        })
        setMessage('Pastor remark added successfully')
        fetchExpenses()
      } else {
        setMessage(data.error || 'Failed to add pastor remark')
      }
    } catch (error) {
      setMessage('Failed to add pastor remark')
    } finally {
      setPastorRemarkModal(prev => ({ ...prev, processing: false }))
    }
  }

  const openReportForm = (expense: Expense) => {
    // Check if expense is paid before opening the form
    if (expense.status !== 'PAID') {
      setError('This expense must be marked as paid before you can create a report. Please mark it as paid first.')
      setTimeout(() => setError(''), 5000) // Clear error after 5 seconds
      return
    }
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

  const openReportViewModal = (report: any) => {
    setReportViewModal({
      isOpen: true,
      report,
    })
  }

  const closeReportViewModal = () => {
    setReportViewModal({
      isOpen: false,
      report: null,
    })
  }

  // Helper function to check if additional payment is needed
  const needsAdditionalPayment = (expense: Expense): { needed: boolean; amount: number } => {
    if (expense.status !== 'PAID' || !expense.reports || expense.reports.length === 0) {
      return { needed: false, amount: 0 }
    }
    
    const latestReport = expense.reports[0]
    
    // If report has items, calculate difference from item-level actual vs approved amounts
    if (latestReport.approvedItems && latestReport.approvedItems.length > 0) {
      let totalDifference = 0
      
      for (const item of latestReport.approvedItems) {
        const approvedAmount = item.approvedAmountCents || 0
        const actualAmount = item.actualAmountCents ?? approvedAmount
        const difference = actualAmount - approvedAmount
        
        // Only count positive differences (spent more than approved)
        if (difference > 0) {
          totalDifference += difference
        }
      }
      
      if (totalDifference > 0) {
        return {
          needed: true,
          amount: totalDifference
        }
      }
    } else {
      // For non-itemized expenses, check totalActualAmount vs totalApprovedAmount
      const totalApproved = latestReport.totalApprovedAmount || 0
      const totalActual = latestReport.totalActualAmount ?? totalApproved
      const difference = totalActual - totalApproved
      
      if (difference > 0) {
        return {
          needed: true,
          amount: difference
        }
      }
    }
    
    return { needed: false, amount: 0 }
  }

  const openMarkPaidModal = (expense: Expense, isAdditionalPayment = false) => {
    // Set default payment date to today
    const today = new Date().toISOString().split('T')[0]
    const additionalPayment = isAdditionalPayment ? needsAdditionalPayment(expense) : { needed: false, amount: 0 }
    
    setMarkPaidModal({
      isOpen: true,
      expenseId: expense.id,
      expenseTitle: expense.title,
      reportRequired: !isAdditionalPayment, // Don't require report for additional payments
      paymentDate: today,
      paidBy: '',
      processing: false,
      isAdditionalPayment: isAdditionalPayment && additionalPayment.needed,
      additionalPaymentAmount: additionalPayment.amount,
    })
  }

  const closeMarkPaidModal = () => {
    setMarkPaidModal({
      isOpen: false,
      expenseId: '',
      expenseTitle: '',
      reportRequired: true,
      paymentDate: '',
      paidBy: '',
      processing: false,
      isAdditionalPayment: false,
      additionalPaymentAmount: 0,
    })
  }

  const openAccountModal = (expense: Expense) => {
    setAccountModal({
      isOpen: true,
      expenseId: expense.id,
      expenseTitle: expense.title,
      currentAccount: expense.account || null,
      processing: false,
    })
  }

  const closeAccountModal = () => {
    setAccountModal({
      isOpen: false,
      expenseId: '',
      expenseTitle: '',
      currentAccount: null,
      processing: false,
    })
  }

  const openExpenseTypeModal = (expense: Expense) => {
    setExpenseTypeModal({
      isOpen: true,
      expenseId: expense.id,
      expenseTitle: expense.title,
      currentType: expense.expenseType || null,
      customType: '',
      processing: false,
    })
  }

  const closeExpenseTypeModal = () => {
    setExpenseTypeModal({
      isOpen: false,
      expenseId: '',
      expenseTitle: '',
      currentType: null,
      customType: '',
      processing: false,
    })
  }

  const closeDenialModal = () => {
    setDenialModal({ isOpen: false, expenseId: '', expenseTitle: '' })
  }

  const handleMarkPaid = async () => {
    setMarkPaidModal(prev => ({ ...prev, processing: true }))
    
    try {
      const response = await fetch('/api/expenses/mark-paid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: markPaidModal.expenseId,
          reportRequired: markPaidModal.reportRequired,
          paymentDate: markPaidModal.paymentDate ? new Date(markPaidModal.paymentDate).toISOString() : undefined,
          paidBy: markPaidModal.paidBy || undefined
        }),
      })

      if (response.ok) {
        fetchExpenses() // Refresh the list
        closeMarkPaidModal()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to mark expense as paid')
      }
    } catch (error) {
      console.error('Failed to mark expense as paid:', error)
      setError('Failed to mark expense as paid')
    } finally {
      setMarkPaidModal(prev => ({ ...prev, processing: false }))
    }
  }

  const handleAccountUpdate = async (newAccount: string | null) => {
    setAccountModal(prev => ({ ...prev, processing: true }))
    
    try {
      const response = await fetch('/api/expenses/update-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expenseId: accountModal.expenseId,
          account: newAccount
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        // Update the expense in the list
        setExpenses(prev => prev.map(expense => 
          expense.id === accountModal.expenseId 
            ? { ...expense, account: newAccount }
            : expense
        ))
        
        // Update the expense in the view modal if it's currently open
        if (viewModal.expense && viewModal.expense.id === accountModal.expenseId) {
          setViewModal(prev => ({
            ...prev,
            expense: prev.expense ? { ...prev.expense, account: newAccount } : null
          }))
        }
        
        closeAccountModal()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update account tag')
      }
    } catch (error) {
      console.error('Update account error:', error)
      setError('Failed to update account tag')
    } finally {
      setAccountModal(prev => ({ ...prev, processing: false }))
    }
  }

  const handleExpenseTypeUpdate = async () => {
    setExpenseTypeModal(prev => ({ ...prev, processing: true }))
    
    try {
      // Determine the final admin category
      const finalType = expenseTypeModal.currentType === 'CUSTOM' 
        ? expenseTypeModal.customType.trim() || null
        : expenseTypeModal.currentType

      const response = await fetch('/api/expenses/update-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          expenseId: expenseTypeModal.expenseId,
          expenseType: finalType
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message)
        
        // Update the expense in the list
        setExpenses(prev => prev.map(expense => 
          expense.id === expenseTypeModal.expenseId 
            ? { ...expense, expenseType: finalType }
            : expense
        ))
        
        // Update the expense in the view modal if it's currently open
        if (viewModal.expense && viewModal.expense.id === expenseTypeModal.expenseId) {
          setViewModal(prev => ({
            ...prev,
            expense: prev.expense ? { ...prev.expense, expenseType: finalType } : null
          }))
        }
        
        closeExpenseTypeModal()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update admin category')
      }
    } catch (error) {
      console.error('Update admin category error:', error)
      setError('Failed to update admin category')
    } finally {
      setExpenseTypeModal(prev => ({ ...prev, processing: false }))
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
      case 'CHANGE_REQUESTED':
        return 'text-purple-600 bg-purple-50'
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

  const calculateApprovedAmount = (expense: any) => {
    if (!expense.items || expense.items.length === 0) {
      // For non-itemized expenses, return full amount if approved, 0 if denied
      if (expense.status === 'APPROVED') return expense.amountCents
      if (expense.status === 'DENIED') return 0
      return expense.amountCents // For submitted/partial, show full amount as potential
    }

    // For itemized expenses, calculate sum of approved amounts
    return expense.items.reduce((total: number, item: any) => {
      const itemApproval = item.approvals?.[0]
      if (itemApproval?.status === 'APPROVED') {
        // Use approvedAmountCents if specified and not null, otherwise use full item amount
        return total + (itemApproval.approvedAmountCents ?? item.amountCents)
      }
      return total
    }, 0)
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
      <Card className="rounded-xl shadow-sm">
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
                className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                  className="w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
          <Card key={expense.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className="text-base sm:text-lg font-semibold">{expense.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                        {STATUS_DISPLAY_NAMES[expense.status as keyof typeof STATUS_DISPLAY_NAMES] || expense.status}
                      </span>
                      {expense.eventDate && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Event
                        </span>
                      )}
                      <span className={`text-xs sm:text-sm font-medium ${getUrgencyColor(expense.urgency)}`}>
                        {URGENCY_DISPLAY_NAMES[expense.urgency as keyof typeof URGENCY_DISPLAY_NAMES] || `Urgency: ${expense.urgency}`}
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-500 mt-1 text-sm">
                    {TEAM_DISPLAY_NAMES[expense.team as keyof typeof TEAM_DISPLAY_NAMES] || expense.team} • {CAMPUS_DISPLAY_NAMES[expense.campus as keyof typeof CAMPUS_DISPLAY_NAMES] || expense.campus} • {expense.requester.name || expense.requester.email}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Created: {formatDate(expense.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <div className="space-y-1">
                      <p className="text-lg sm:text-xl font-bold">{formatCurrency(expense.amountCents)}</p>
                      {(expense.status === 'PARTIALLY_APPROVED' || expense.status === 'DENIED') && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Approved:</span>
                          <span className={`text-sm font-semibold ${
                            expense.status === 'DENIED' ? 'text-red-600' : 'text-orange-600'
                          }`}>
                            {formatCurrency(calculateApprovedAmount(expense))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleViewOrEditClick(expense)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      <span className="hidden sm:inline">
                        {expense.status === 'CHANGE_REQUESTED' && expense.requester.email === user.email ? 'Edit' : 'View'}
                      </span>
                    </Button>
                    {expense.status === 'PAID' && expense.reportRequired && (!expense.reports || expense.reports.length === 0) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openReportForm(expense)}
                        className="flex-1 sm:flex-none bg-green-50 border-green-200 text-green-700 hover:bg-green-100 rounded-lg"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span>Create Report</span>
                      </Button>
                    )}
                    {expense.status === 'SUBMITTED' && (
                      <>
                        {user.role === 'ADMIN' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openApprovalCommentModal(expense.id, expense.title)}
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
                        {user.role === 'CAMPUS_PASTOR' && expense.campus === user.campus && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openPastorRemarkModal(expense.id, expense.title)}
                            className="flex-1 sm:flex-none"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            <span className="hidden sm:inline">Add Remark</span>
                          </Button>
                        )}
                      </>
                    )}
                    {expense.status === 'APPROVED' && expense.requester.email === user.email && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openChangeRequestModal(expense.id, expense.title)}
                        className="flex-1 sm:flex-none bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100 rounded-lg"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Request Change</span>
                      </Button>
                    )}
                    {(expense.status === 'APPROVED' || expense.status === 'PARTIALLY_APPROVED') && user.role === 'ADMIN' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => openMarkPaidModal(expense)}
                        className="flex-1 sm:flex-none"
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Mark Paid</span>
                      </Button>
                    )}
                    {expense.status === 'PAID' && (
                      <>
                        {expense.reportRequired && expense.reports && expense.reports.length > 0 && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => expense.reports && openReportViewModal(expense.reports[0])}
                              className="flex-1 sm:flex-none bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 rounded-lg"
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              <span className="hidden sm:inline">View Report</span>
                            </Button>
                            {user.role === 'ADMIN' && (() => {
                              const additionalPayment = needsAdditionalPayment(expense)
                              if (additionalPayment.needed) {
                                return (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openMarkPaidModal(expense, true)}
                                    className="flex-1 sm:flex-none bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 rounded-lg"
                                  >
                                    <DollarSign className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Pay Additional ${(additionalPayment.amount / 100).toFixed(2)}</span>
                                  </Button>
                                )
                              }
                              return null
                            })()}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {expenses.length === 0 && (
        <Card className="rounded-xl shadow-sm">
          <CardContent className="p-12 text-center">
            <p className="text-gray-500">No expenses found matching your criteria.</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center justify-between shadow-sm">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="text-red-700 hover:text-red-900 rounded-lg p-1 hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Expense Form Modal */}
      {showExpenseForm && (
        <ExpenseForm
          user={user}
          onClose={() => setShowExpenseForm(false)}
          onSuccess={() => {
            setShowExpenseForm(false)
            fetchExpenses()
          }}
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
          <div className="bg-white rounded-2xl p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
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
                <div className="space-y-1">
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    Requested: {formatCurrency(viewModal.expense.amountCents)}
                  </p>
                  {(viewModal.expense.status === 'PARTIALLY_APPROVED' || viewModal.expense.status === 'DENIED') && (
                    <p className="text-lg font-semibold text-orange-600">
                      Approved: {formatCurrency(calculateApprovedAmount(viewModal.expense))}
                    </p>
                  )}
                </div>
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
                {/* Account Information - Visible to Admins and Pastors */}
                {(user.role === 'ADMIN' || user.role === 'CAMPUS_PASTOR') && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Account</label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {viewModal.expense.account 
                          ? ACCOUNT_DISPLAY_NAMES[viewModal.expense.account as keyof typeof ACCOUNT_DISPLAY_NAMES] || viewModal.expense.account
                          : 'Not tagged'
                        }
                      </p>
                      {user.role === 'ADMIN' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openAccountModal(viewModal.expense!)}
                          className="text-xs"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          Tag Account
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {/* Admin Category Information - Admin Only */}
                {user.role === 'ADMIN' && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Admin Category</label>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {viewModal.expense.expenseType || 'Not tagged'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openExpenseTypeModal(viewModal.expense!)}
                        className="text-xs"
                      >
                        <Tag className="w-3 h-3 mr-1" />
                        Set Category
                      </Button>
                    </div>
                  </div>
                )}
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
                  <>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Event Date</label>
                      <p className="font-medium">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 mr-2">Event</span>
                        {formatDate(viewModal.expense.eventDate)}
                      </p>
                    </div>
                    {viewModal.expense.eventName && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Event Name</label>
                        <p className="font-medium">{viewModal.expense.eventName}</p>
                      </div>
                    )}
                    {viewModal.expense.fullEventBudgetCents !== null && viewModal.expense.fullEventBudgetCents !== undefined && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Event Budget</label>
                        <p className="font-medium">{formatCurrency(viewModal.expense.fullEventBudgetCents)}</p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {viewModal.expense.description && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Description</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm sm:text-base">{viewModal.expense.description}</p>
                </div>
              )}

              {viewModal.expense.pastorRemarks && viewModal.expense.pastorRemarks.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Pastor Remarks</label>
                  <div className="mt-2 space-y-3">
                    {viewModal.expense.pastorRemarks.map((remark, index) => (
                      <div key={remark.id} className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="text-sm text-blue-800">{remark.remark}</p>
                            <div className="mt-2 flex items-center gap-2 text-xs text-blue-600">
                              <span>By: {remark.pastor.name || remark.pastor.email}</span>
                              <span>•</span>
                              <span>{new Date(remark.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewModal.expense.items && viewModal.expense.items.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Expense Items</label>
                  <div className="mt-2 space-y-3">
                    {viewModal.expense.items.map((item, index) => {
                      const itemApproval = item.approvals?.[0]
                      const approvalStatus = itemApproval?.status || 'PENDING'
                      // Get attachments for this item
                      const itemAttachments = (viewModal.expense?.attachments || []).filter((att) => 
                        att.itemId && att.itemId === item.id
                      )
                      
                      return (
                        <div key={item.id} className={`p-3 rounded-lg border ${
                          approvalStatus === 'APPROVED' ? 'bg-green-50 border-green-200' :
                          approvalStatus === 'DENIED' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium text-sm">{item.description}</p>
                                {item.category && (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {item.category}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} × ${(item.unitPriceCents / 100).toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">
                                ${(item.amountCents / 100).toFixed(2)}
                              </p>
                              {itemApproval && itemApproval.status === 'APPROVED' && itemApproval.approvedAmountCents !== undefined && itemApproval.approvedAmountCents !== null && itemApproval.approvedAmountCents !== item.amountCents && (
                                <p className="text-xs text-green-600 font-medium">
                                  Approved: ${(itemApproval.approvedAmountCents / 100).toFixed(2)}
                                </p>
                              )}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                approvalStatus === 'DENIED' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {approvalStatus}
                              </span>
                            </div>
                          </div>
                          
                          {/* Attachments for this item */}
                          {itemAttachments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-300">
                              <p className="text-xs font-medium text-gray-600 mb-1">Attachments:</p>
                              <div className="space-y-1">
                                {itemAttachments.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded text-xs">
                                    <div className="flex items-center space-x-2">
                                      {attachment.mimeType.startsWith('image/') ? (
                                        <img
                                          src={attachment.secureUrl}
                                          alt="Item attachment"
                                          className="w-8 h-8 object-cover rounded border cursor-pointer"
                                          onClick={() => window.open(attachment.secureUrl, '_blank')}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 bg-blue-100 rounded border flex items-center justify-center">
                                          <FileText className="w-4 h-4 text-blue-600" />
                                        </div>
                                      )}
                                      <span className="text-xs">
                                        {attachment.mimeType.startsWith('image/') ? 'Image' : 'Document'}
                                      </span>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(attachment.secureUrl, '_blank')}
                                      className="h-6 px-2 text-xs"
                                    >
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {itemApproval && (
                            <div className="mt-2 p-2 bg-white rounded border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-xs text-gray-600">
                                    <strong>{itemApproval.approver.name || itemApproval.approver.email}</strong>
                                    {' - '}
                                    {new Date(itemApproval.createdAt).toLocaleDateString()}
                                  </p>
                                  {itemApproval.comment && (
                                    <p className="text-sm mt-1">{itemApproval.comment}</p>
                                  )}
                                </div>
                                {user.role === 'ADMIN' && viewModal.expense && viewModal.expense.status === 'SUBMITTED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (!viewModal.expense) return
                                      try {
                                        const response = await fetch('/api/expense-items/undo-approval', {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({
                                            itemId: item.id
                                          }),
                                        })

                                        const data = await response.json()

                                        if (response.ok) {
                                          setMessage('Item approval undone successfully')
                                          fetchExpenses()
                                          // Refresh the view modal
                                          const updatedExpense = await fetch(`/api/expenses?expenseId=${viewModal.expense.id}`).then(r => r.json())
                                          if (updatedExpense.expenses && updatedExpense.expenses[0]) {
                                            setViewModal({ isOpen: true, expense: updatedExpense.expenses[0] })
                                          }
                                        } else {
                                          setError(data.error || 'Failed to undo item approval')
                                        }
                                      } catch (error) {
                                        console.error('Failed to undo item approval:', error)
                                        setError('Failed to undo item approval')
                                      }
                                    }}
                                    className="text-xs text-orange-600 border-orange-300 hover:bg-orange-50"
                                  >
                                    Undo
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}

                          {user.role === 'ADMIN' && viewModal.expense && viewModal.expense.status === 'SUBMITTED' && approvalStatus === 'PENDING' && (
                            <div className="mt-2 flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemApprovalClick(item.id, 'APPROVED', item.amountCents)}
                                className="text-green-600 border-green-300 hover:bg-green-50"
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemApprovalClick(item.id, 'CHANGE_REQUESTED', item.amountCents)}
                                className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              >
                                Request Changes
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleItemApprovalClick(item.id, 'DENIED', item.amountCents)}
                                className="text-red-600 border-red-300 hover:bg-red-50"
                              >
                                Deny
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    <div className="bg-green-50 p-3 rounded-lg border-t-2 border-green-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-green-800">Total Requested:</span>
                          <span className="font-bold text-lg text-green-800">
                            ${(viewModal.expense.amountCents / 100).toFixed(2)}
                          </span>
                        </div>
                        {(viewModal.expense.status === 'PARTIALLY_APPROVED' || viewModal.expense.status === 'DENIED') && (
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-orange-800">Total Approved:</span>
                            <span className="font-bold text-lg text-orange-800">
                              ${(calculateApprovedAmount(viewModal.expense) / 100).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* General attachments (without itemId) */}
              {viewModal.expense.attachments && viewModal.expense.attachments.length > 0 && (
                (() => {
                  const generalAttachments = viewModal.expense.attachments.filter((att) => !att.itemId || att.itemId === null)
                  if (generalAttachments.length > 0) {
                    return (
                      <div>
                        <label className="text-sm font-medium text-gray-500">General Attachments</label>
                        <div className="mt-2 space-y-2">
                          {generalAttachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                    )
                  }
                  return null
                })()
              )}

              {/* Notes Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                </div>
                
                {/* Display existing notes */}
                {viewModal.expense?.expenseNotes && viewModal.expense.expenseNotes.length > 0 && (
                  <div className="mt-2 space-y-2 mb-4">
                    {viewModal.expense.expenseNotes.map((note) => {
                      const isAdmin = note.author.role === 'ADMIN'
                      const isPastor = note.author.role === 'CAMPUS_PASTOR'
                      const isRequester = note.author.email === (viewModal.expense?.requester.email || '')
                      
                      return (
                        <div 
                          key={note.id} 
                          className={`p-3 rounded-lg border ${
                            isAdmin ? 'bg-purple-50 border-purple-200' :
                            isPastor ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`text-sm ${
                                isAdmin ? 'text-purple-800' :
                                isPastor ? 'text-blue-800' :
                                'text-gray-800'
                              }`}>
                                {note.note}
                              </p>
                              <div className={`mt-2 flex items-center gap-2 text-xs ${
                                isAdmin ? 'text-purple-600' :
                                isPastor ? 'text-blue-600' :
                                'text-gray-600'
                              }`}>
                                <span>
                                  {isAdmin ? '👤 Admin' : isPastor ? '👤 Pastor' : '👤 Requester'}: {note.author.name || note.author.email}
                                </span>
                                <span>•</span>
                                <span>{formatDate(note.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add note form */}
                {(() => {
                  if (!viewModal.expense) return null
                  
                  // Check if user can add notes
                  const canAddNote = 
                    viewModal.expense.requester.email === user.email ||
                    user.role === 'ADMIN' ||
                    (user.role === 'CAMPUS_PASTOR' && viewModal.expense.campus === user.campus)
                  
                  if (!canAddNote) return null
                  
                  const expenseId = viewModal.expense.id
                  const currentNote = noteInput[expenseId] || ''
                  const isAdding = addingNote[expenseId] || false
                  
                  return (
                    <div className="mt-2">
                      <textarea
                        value={currentNote}
                        onChange={(e) => setNoteInput(prev => ({ ...prev, [expenseId]: e.target.value }))}
                        placeholder="Add a note..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                        rows={3}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!currentNote.trim()) return
                            
                            setAddingNote(prev => ({ ...prev, [expenseId]: true }))
                            try {
                              const response = await fetch('/api/expenses/notes', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  expenseId,
                                  note: currentNote.trim(),
                                }),
                              })

                              const data = await response.json()

                              if (response.ok) {
                                setNoteInput(prev => ({ ...prev, [expenseId]: '' }))
                                setMessage('Note added successfully')
                                
                                // Refresh expenses list
                                await fetchExpenses()
                                
                                // Fetch the updated expense with notes to update view modal
                                if (viewModal.expense) {
                                  try {
                                    const expenseResponse = await fetch(`/api/expenses`)
                                    const expenseData = await expenseResponse.json()
                                    if (expenseData.expenses) {
                                      const updatedExpense = expenseData.expenses.find((e: Expense) => e.id === expenseId)
                                      if (updatedExpense) {
                                        setViewModal({ isOpen: true, expense: updatedExpense })
                                      }
                                    }
                                  } catch (err) {
                                    console.error('Failed to refresh expense:', err)
                                    // Still refresh the list even if modal update fails
                                    fetchExpenses()
                                  }
                                }
                              } else {
                                setError(data.error || 'Failed to add note')
                              }
                            } catch (error) {
                              console.error('Failed to add note:', error)
                              setError('Failed to add note')
                            } finally {
                              setAddingNote(prev => ({ ...prev, [expenseId]: false }))
                            }
                          }}
                          disabled={isAdding || !currentNote.trim()}
                        >
                          {isAdding ? 'Adding...' : 'Add Note'}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {viewModal.expense?.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Admin Notes</label>
                  <p className="mt-1 p-3 bg-yellow-50 rounded-lg text-sm sm:text-base">{viewModal.expense.notes}</p>
                </div>
              )}

              {viewModal.expense?.paidAt && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Paid At</label>
                  <p className="font-medium">{formatDate(viewModal.expense.paidAt)}</p>
                </div>
              )}

              {/* Payment Date - Admin Only */}
              {user.role === 'ADMIN' && viewModal.expense?.paymentDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Date</label>
                  <p className="font-medium text-blue-600">{formatDate(viewModal.expense.paymentDate)}</p>
                </div>
              )}
              {viewModal.expense?.paidBy && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Paid By</label>
                  <p className="font-medium">{viewModal.expense.paidBy}</p>
                </div>
              )}

              {/* Approval Actions - Admin Only */}
              {user.role === 'ADMIN' && viewModal.expense && viewModal.expense.status === 'SUBMITTED' && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Actions</label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        if (!viewModal.expense) return
                        setApprovalCommentModal({
                          isOpen: true,
                          expenseId: viewModal.expense.id,
                          expenseTitle: viewModal.expense.title,
                          comment: '',
                          processing: false
                        })
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve Expense
                    </Button>
                    <Button
                      onClick={() => {
                        if (!viewModal.expense) return
                        setDenialModal({
                          isOpen: true,
                          expenseId: viewModal.expense.id,
                          expenseTitle: viewModal.expense.title
                        })
                      }}
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Deny Expense
                    </Button>
                  </div>
                </div>
              )}

              {/* Undo Approval - Admin Only */}
              {user.role === 'ADMIN' && viewModal.expense && (viewModal.expense.status === 'APPROVED' || viewModal.expense.status === 'DENIED') && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Actions</label>
                  <Button
                    onClick={async () => {
                      if (!viewModal.expense) return
                      try {
                        const response = await fetch('/api/expenses/undo-approval', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            expenseId: viewModal.expense.id
                          }),
                        })

                        const data = await response.json()

                        if (response.ok) {
                          setMessage('Approval undone successfully')
                          await fetchExpenses()
                          // Refresh the view modal with updated expense
                          const expenseId = viewModal.expense.id
                          const updatedExpenses = await fetch('/api/expenses').then(r => r.json())
                          if (updatedExpenses.expenses) {
                            const updatedExpense = updatedExpenses.expenses.find((e: Expense) => e.id === expenseId)
                            if (updatedExpense) {
                              setViewModal({ isOpen: true, expense: updatedExpense })
                            }
                          }
                        } else {
                          setError(data.error || 'Failed to undo approval')
                        }
                      } catch (error) {
                        console.error('Failed to undo approval:', error)
                        setError('Failed to undo approval')
                      }
                    }}
                    variant="outline"
                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                  >
                    Undo {viewModal.expense.status === 'APPROVED' ? 'Approval' : 'Denial'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Comment Modal */}
      {itemCommentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {itemCommentModal.action === 'APPROVED' ? 'Approve Item' : 
                 itemCommentModal.action === 'DENIED' ? 'Deny Item' : 
                 'Request Changes'}
              </h3>
              
              {itemCommentModal.action === 'APPROVED' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Approve (USD)
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={(itemCommentModal.itemAmount / 100).toFixed(2)}
                      value={itemCommentModal.approvedAmount}
                      onChange={(e) => setItemCommentModal(prev => ({ ...prev, approvedAmount: e.target.value }))}
                      placeholder={(itemCommentModal.itemAmount / 100).toFixed(2)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Item total: ${(itemCommentModal.itemAmount / 100).toFixed(2)} • Leave empty to approve full amount
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment {(itemCommentModal.action === 'DENIED' || itemCommentModal.action === 'CHANGE_REQUESTED') && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={itemCommentModal.comment}
                  onChange={(e) => setItemCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder={itemCommentModal.action === 'DENIED' 
                    ? "Please provide a reason for denial..." 
                    : itemCommentModal.action === 'CHANGE_REQUESTED'
                    ? "Please specify what changes are needed..."
                    : "Add an optional comment..."
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                  disabled={itemCommentModal.processing || ((itemCommentModal.action === 'DENIED' || itemCommentModal.action === 'CHANGE_REQUESTED') && !itemCommentModal.comment.trim())}
                  className={itemCommentModal.action === 'APPROVED' 
                    ? "bg-green-600 hover:bg-green-700" 
                    : itemCommentModal.action === 'CHANGE_REQUESTED'
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {itemCommentModal.processing ? 'Processing...' : 
                   itemCommentModal.action === 'APPROVED' ? 'Approve' : 
                   itemCommentModal.action === 'CHANGE_REQUESTED' ? 'Request Changes' :
                   'Deny'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editModal.isOpen && editModal.expense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Edit Expense Request</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModal({ isOpen: false, expense: null })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Changes Requested
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>This expense has been marked for changes. Please review the feedback and update your request accordingly.</p>
                    </div>
                  </div>
                </div>
              </div>

              <ExpenseForm
                user={user}
                onSuccess={() => {
                  setEditModal({ isOpen: false, expense: null })
                  fetchExpenses()
                }}
                onCancel={() => setEditModal({ isOpen: false, expense: null })}
                editExpense={editModal.expense}
                noModal={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Approval Comment Modal */}
      {approvalCommentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Approve Expense Request</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setApprovalCommentModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    comment: '',
                    processing: false
                  })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {approvalCommentModal.expenseTitle}
                </p>
                <p className="text-sm text-gray-500">
                  Approve this expense request. Items must be approved separately.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Comment (Optional)
                </label>
                <textarea
                  value={approvalCommentModal.comment}
                  onChange={(e) => setApprovalCommentModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Add an optional comment for this approval..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  rows={3}
                />
              </div>


              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setApprovalCommentModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    comment: '',
                    processing: false
                  })}
                  disabled={approvalCommentModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprovalCommentSubmit}
                  disabled={approvalCommentModal.processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approvalCommentModal.processing ? 'Approving...' : 'Approve Expense'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pastor Remark Modal */}
      {pastorRemarkModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Add Pastor Remark</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPastorRemarkModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    remark: '',
                    processing: false
                  })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {pastorRemarkModal.expenseTitle}
                </p>
                <p className="text-sm text-gray-500">
                  Add your campus-specific remark for this expense request.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pastor Remark <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={pastorRemarkModal.remark}
                  onChange={(e) => setPastorRemarkModal(prev => ({ ...prev, remark: e.target.value }))}
                  placeholder="Add your remark about this expense request..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setPastorRemarkModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    remark: '',
                    processing: false
                  })}
                  disabled={pastorRemarkModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePastorRemarkSubmit}
                  disabled={pastorRemarkModal.processing || !pastorRemarkModal.remark.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {pastorRemarkModal.processing ? 'Adding Remark...' : 'Add Remark'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report View Modal */}
      {reportViewModal.isOpen && reportViewModal.report && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Report Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={closeReportViewModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">{reportViewModal.report.title}</h3>
                <p className="text-sm text-gray-500">
                  Report Date: {formatDate(reportViewModal.report.reportDate)}
                </p>
              </div>

              {/* Report Content */}
              <div>
                <label className="text-sm font-medium text-gray-500">Report Content</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm sm:text-base whitespace-pre-wrap">
                  {reportViewModal.report.content}
                </p>
              </div>

              {/* Money Summary for Non-Itemized Expenses */}
              {(!reportViewModal.report.approvedItems || reportViewModal.report.approvedItems.length === 0) && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm text-green-800 mb-3">Financial Summary</h4>
                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Approved</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatCurrency(reportViewModal.report.totalApprovedAmount || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Actual</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(reportViewModal.report.totalActualAmount || reportViewModal.report.totalApprovedAmount || 0)}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Difference</p>
                      {(() => {
                        const totalApproved = reportViewModal.report.totalApprovedAmount || 0
                        const totalActual = reportViewModal.report.totalActualAmount || totalApproved
                        const difference = totalActual - totalApproved
                        return (
                          <p className={`text-sm font-bold ${
                            difference > 0 ? 'text-red-600' : 
                            difference < 0 ? 'text-blue-600' : 
                            'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                            {difference > 0 && ' (Additional payment needed)'}
                            {difference < 0 && ' (Refund required)'}
                          </p>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Approved Items Details with Actual Amounts */}
              {reportViewModal.report.approvedItems && reportViewModal.report.approvedItems.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm text-green-800 mb-3">Report Items</h4>
                  <div className="space-y-3">
                    {reportViewModal.report.approvedItems.map((item: any, index: number) => {
                      const actualAmount = item.actualAmountCents ?? item.approvedAmountCents
                      const difference = actualAmount - item.approvedAmountCents
                      // Match attachments using originalItemId (the itemId stored in attachments matches the originalItemId)
                      // Ensure we only match attachments that have an itemId set (not null/undefined)
                      const itemAttachments = reportViewModal.report.attachments?.filter((att: any) => 
                        att.itemId && att.itemId === item.originalItemId && !att.isRefundReceipt
                      ) || []
                      const itemRefundReceipts = reportViewModal.report.attachments?.filter((att: any) => 
                        att.itemId && att.itemId === item.originalItemId && att.isRefundReceipt
                      ) || []
                      
                      return (
                        <div key={item.id} className="bg-white p-4 rounded border border-green-100">
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-900">{item.description}</p>
                            <p className="text-xs text-gray-500">Item {index + 1}</p>
                          </div>
                          
                          {/* Money Details */}
                          <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-200">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Approved Amount</p>
                              <p className="text-sm font-semibold text-green-600">
                                {formatCurrency(item.approvedAmountCents)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Actual Amount Spent</p>
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(actualAmount)}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-gray-500 mb-1">Difference</p>
                              <p className={`text-sm font-bold ${
                                difference > 0 ? 'text-red-600' : 
                                difference < 0 ? 'text-blue-600' : 
                                'text-gray-600'
                              }`}>
                                {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                {difference > 0 && ' (Additional payment needed)'}
                                {difference < 0 && ' (Refund required)'}
                              </p>
                            </div>
                          </div>

                          {/* Attachments for this item */}
                          {itemAttachments.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-700 mb-2">Attachments for this item:</p>
                              <div className="space-y-2">
                                {itemAttachments.map((attachment: any) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      {attachment.mimeType.startsWith('image/') ? (
                                        <img
                                          src={attachment.secureUrl}
                                          alt="Item attachment"
                                          className="w-10 h-10 object-cover rounded border cursor-pointer"
                                          onClick={() => window.open(attachment.secureUrl, '_blank')}
                                        />
                                      ) : (
                                        <div className="w-10 h-10 bg-blue-100 rounded border flex items-center justify-center">
                                          <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs font-medium">
                                          {attachment.mimeType.startsWith('image/') ? 'Image' : 'Document'}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(attachment.secureUrl, '_blank')}
                                      className="text-xs"
                                    >
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Refund Receipts for this item */}
                          {itemRefundReceipts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-blue-700 mb-2">Refund Receipts for this item:</p>
                              <div className="space-y-2">
                                {itemRefundReceipts.map((attachment: any) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center space-x-2">
                                      {attachment.mimeType.startsWith('image/') ? (
                                        <img
                                          src={attachment.secureUrl}
                                          alt="Refund receipt"
                                          className="w-10 h-10 object-cover rounded border cursor-pointer"
                                          onClick={() => window.open(attachment.secureUrl, '_blank')}
                                        />
                                      ) : (
                                        <div className="w-10 h-10 bg-blue-100 rounded border flex items-center justify-center">
                                          <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-xs font-medium text-blue-700">
                                          {attachment.mimeType.startsWith('image/') ? 'Refund Receipt (Image)' : 'Refund Receipt (Document)'}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(attachment.secureUrl, '_blank')}
                                      className="text-xs"
                                    >
                                      View
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Check for orphaned attachments (attachments with itemId that don't match any item) */}
                  {(() => {
                    const allItemIds = new Set(reportViewModal.report.approvedItems.map((item: any) => item.originalItemId))
                    const orphanedAttachments = reportViewModal.report.attachments?.filter((att: any) => 
                      att.itemId && !allItemIds.has(att.itemId)
                    ) || []
                    
                    if (orphanedAttachments.length > 0) {
                      return (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs font-medium text-yellow-800 mb-2">
                            ⚠️ Orphaned Attachments ({orphanedAttachments.length})
                          </p>
                          <p className="text-xs text-yellow-700 mb-2">
                            These attachments are linked to items that are no longer in this report:
                          </p>
                          <div className="space-y-2">
                            {orphanedAttachments.map((attachment: any) => (
                              <div key={attachment.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-yellow-200">
                                <div className="flex items-center space-x-2">
                                  {attachment.mimeType.startsWith('image/') ? (
                                    <img
                                      src={attachment.secureUrl}
                                      alt="Orphaned attachment"
                                      className="w-8 h-8 object-cover rounded border cursor-pointer"
                                      onClick={() => window.open(attachment.secureUrl, '_blank')}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-yellow-100 rounded border flex items-center justify-center">
                                      <FileText className="w-4 h-4 text-yellow-600" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-xs font-medium">
                                      {attachment.mimeType.startsWith('image/') ? 'Image' : 'Document'}
                                    </p>
                                    <p className="text-xs text-gray-500">Item ID: {attachment.itemId}</p>
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(attachment.secureUrl, '_blank')}
                                  className="text-xs"
                                >
                                  View
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    }
                    return null
                  })()}
                  
                  {/* Totals Summary */}
                  <div className="mt-4 pt-3 border-t border-green-200 bg-white p-3 rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Approved</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(reportViewModal.report.approvedItems.reduce((sum: number, item: any) => sum + item.approvedAmountCents, 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Actual</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(reportViewModal.report.approvedItems.reduce((sum: number, item: any) => sum + (item.actualAmountCents ?? item.approvedAmountCents), 0))}
                        </p>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Total Difference</p>
                        {(() => {
                          const totalApproved = reportViewModal.report.approvedItems.reduce((sum: number, item: any) => sum + item.approvedAmountCents, 0)
                          const totalActual = reportViewModal.report.approvedItems.reduce((sum: number, item: any) => sum + (item.actualAmountCents ?? item.approvedAmountCents), 0)
                          const totalDifference = totalActual - totalApproved
                          return (
                            <p className={`text-sm font-bold ${
                              totalDifference > 0 ? 'text-red-600' : 
                              totalDifference < 0 ? 'text-blue-600' : 
                              'text-gray-600'
                            }`}>
                              {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                              {totalDifference > 0 && ' (Additional payment needed)'}
                              {totalDifference < 0 && ' (Refund required)'}
                            </p>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Non-itemized attachments (if any) */}
              {reportViewModal.report.attachments && reportViewModal.report.attachments.length > 0 && (
                (() => {
                  // Only show as non-itemized if itemId is null/undefined (not set)
                  const nonItemizedAttachments = reportViewModal.report.attachments.filter((att: any) => !att.itemId || att.itemId === null)
                  if (nonItemizedAttachments.length > 0) {
                    return (
                      <div>
                        <label className="text-sm font-medium text-gray-500">General Attachments</label>
                        <div className="mt-2 space-y-2">
                          {nonItemizedAttachments.map((attachment: any) => (
                            <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {attachment.mimeType.startsWith('image/') ? (
                                  <img
                                    src={attachment.secureUrl}
                                    alt="Report attachment"
                                    className="w-12 h-12 object-cover rounded border cursor-pointer"
                                    onClick={() => window.open(attachment.secureUrl, '_blank')}
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-red-100 rounded border flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-red-600" />
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm font-medium">
                                    {attachment.isRefundReceipt ? 'Refund Receipt - ' : ''}
                                    {attachment.mimeType.startsWith('image/') ? 'Image' : 'PDF Document'}
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
                    )
                  }
                  return null
                })()
              )}

              {/* Link to Original Expense Request */}
              {reportViewModal.report.expense && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-800 mb-1">Original Expense Request</p>
                      <p className="text-sm text-blue-700">{reportViewModal.report.expense.title}</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Requested by: {reportViewModal.report.expense.requester?.name || reportViewModal.report.expense.requester?.email || 'Unknown'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Find and open the expense in view modal
                        if (reportViewModal.report.expense) {
                          const expense = expenses.find(e => e.id === reportViewModal.report.expense.id)
                          if (expense) {
                            closeReportViewModal()
                            openViewModal(expense)
                          }
                        }
                      }}
                      className="text-blue-600 border-blue-300 hover:bg-blue-100"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Expense
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes Section */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                </div>
                
                {/* Display existing notes */}
                {reportViewModal.report.notes && reportViewModal.report.notes.length > 0 && (
                  <div className="mt-2 space-y-2 mb-4">
                    {reportViewModal.report.notes.map((note: any) => {
                      const isAdmin = note.author.role === 'ADMIN'
                      const isPastor = note.author.role === 'CAMPUS_PASTOR'
                      const isRequester = note.author.email === (reportViewModal.report.expense?.requester?.email || '')
                      
                      return (
                        <div 
                          key={note.id} 
                          className={`p-3 rounded-lg border ${
                            isAdmin ? 'bg-purple-50 border-purple-200' :
                            isPastor ? 'bg-blue-50 border-blue-200' :
                            'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`text-sm ${
                                isAdmin ? 'text-purple-800' :
                                isPastor ? 'text-blue-800' :
                                'text-gray-800'
                              }`}>
                                {note.note}
                              </p>
                              <div className={`mt-2 flex items-center gap-2 text-xs ${
                                isAdmin ? 'text-purple-600' :
                                isPastor ? 'text-blue-600' :
                                'text-gray-600'
                              }`}>
                                <span>
                                  {isAdmin ? '👤 Admin' : isPastor ? '👤 Pastor' : '👤 Requester'}: {note.author.name || note.author.email}
                                </span>
                                <span>•</span>
                                <span>{formatDate(note.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add note form */}
                {(() => {
                  if (!reportViewModal.report || !reportViewModal.report.expense) return null
                  
                  // Check if user can add notes
                  const canAddNote = 
                    reportViewModal.report.expense.requesterId === user.id ||
                    user.role === 'ADMIN' ||
                    (user.role === 'CAMPUS_PASTOR' && reportViewModal.report.expense.campus === user.campus)
                  
                  if (!canAddNote) return null
                  
                  const reportId = reportViewModal.report.id
                  const currentNote = reportNoteInput[reportId] || ''
                  const isAdding = addingReportNote[reportId] || false
                  
                  return (
                    <div className="mt-2">
                      <textarea
                        value={currentNote}
                        onChange={(e) => setReportNoteInput(prev => ({ ...prev, [reportId]: e.target.value }))}
                        placeholder="Add a note..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all"
                        rows={3}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!currentNote.trim()) return
                            
                            setAddingReportNote(prev => ({ ...prev, [reportId]: true }))
                            try {
                              const response = await fetch('/api/reports/notes', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                  reportId,
                                  note: currentNote.trim(),
                                }),
                              })

                              const data = await response.json()

                              if (response.ok) {
                                setReportNoteInput(prev => ({ ...prev, [reportId]: '' }))
                                setMessage('Note added successfully')
                                
                                // Refresh the report to get updated notes
                                try {
                                  const reportResponse = await fetch(`/api/reports?expenseId=${reportViewModal.report.expense.id}`)
                                  const reportData = await reportResponse.json()
                                  if (reportData.reports && reportData.reports.length > 0) {
                                    const updatedReport = reportData.reports.find((r: any) => r.id === reportId)
                                    if (updatedReport) {
                                      setReportViewModal({ isOpen: true, report: updatedReport })
                                    }
                                  }
                                } catch (err) {
                                  console.error('Failed to refresh report:', err)
                                }
                              } else {
                                setError(data.error || 'Failed to add note')
                              }
                            } catch (error) {
                              console.error('Failed to add note:', error)
                              setError('Failed to add note')
                            } finally {
                              setAddingReportNote(prev => ({ ...prev, [reportId]: false }))
                            }
                          }}
                          disabled={isAdding || !currentNote.trim()}
                        >
                          {isAdding ? 'Adding...' : 'Add Note'}
                        </Button>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">
                  {markPaidModal.isAdditionalPayment ? 'Process Additional Payment' : 'Mark Expense as Paid'}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeMarkPaidModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {markPaidModal.expenseTitle}
                </p>
                {markPaidModal.isAdditionalPayment ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-2">
                    <p className="text-sm font-medium text-orange-800 mb-1">
                      Additional Payment Required
                    </p>
                    <p className="text-sm text-orange-700">
                      The expense report shows spending of <strong>${((markPaidModal.additionalPaymentAmount + (expenses.find(e => e.id === markPaidModal.expenseId)?.paidAmountCents || 0)) / 100).toFixed(2)}</strong>, 
                      but only <strong>${((expenses.find(e => e.id === markPaidModal.expenseId)?.paidAmountCents || 0) / 100).toFixed(2)}</strong> was previously paid.
                    </p>
                    <p className="text-sm font-semibold text-orange-900 mt-2">
                      Additional Payment Amount: <strong>${(markPaidModal.additionalPaymentAmount / 100).toFixed(2)}</strong>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Please confirm the payment and specify if an expense report is required.
                  </p>
                )}
              </div>

              {!markPaidModal.isAdditionalPayment && (
                <div className="mb-6">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={markPaidModal.reportRequired}
                      onChange={(e) => setMarkPaidModal(prev => ({ ...prev, reportRequired: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-700">
                        Expense report is required
                      </span>
                      <p className="text-xs text-gray-500">
                        Uncheck this if no expense report is needed for this expense
                      </p>
                    </div>
                  </label>
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={markPaidModal.paymentDate}
                  onChange={(e) => setMarkPaidModal(prev => ({ ...prev, paymentDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select the date when the payment was actually made
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Person Making Payment (Optional)
                </label>
                <input
                  type="text"
                  value={markPaidModal.paidBy}
                  onChange={(e) => setMarkPaidModal(prev => ({ ...prev, paidBy: e.target.value }))}
                  placeholder="Enter name of person making the payment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional: Name of the person who made this payment
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeMarkPaidModal}
                  disabled={markPaidModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleMarkPaid}
                  disabled={markPaidModal.processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {markPaidModal.processing 
                    ? (markPaidModal.isAdditionalPayment ? 'Processing Payment...' : 'Marking as Paid...')
                    : (markPaidModal.isAdditionalPayment ? `Pay Additional $${(markPaidModal.additionalPaymentAmount / 100).toFixed(2)}` : 'Mark as Paid')
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Modal */}
      {accountModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Tag Account</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeAccountModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {accountModal.expenseTitle}
                </p>
                <p className="text-sm text-gray-500">
                  Select the account that the money came from for this expense.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account
                </label>
                <select
                  value={accountModal.currentAccount || ''}
                  onChange={(e) => setAccountModal(prev => ({ 
                    ...prev, 
                    currentAccount: e.target.value || null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select an account...</option>
                  {Object.entries(ACCOUNT_DISPLAY_NAMES).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeAccountModal}
                  disabled={accountModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleAccountUpdate(accountModal.currentAccount)}
                  disabled={accountModal.processing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {accountModal.processing ? 'Updating...' : 'Update Account'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Category Modal */}
      {expenseTypeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Set Admin Category</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeExpenseTypeModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {expenseTypeModal.expenseTitle}
                </p>
                <p className="text-sm text-gray-500">
                  Select or create a category for this expense for reporting purposes.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Category
                </label>
                <select
                  value={expenseTypeModal.currentType || ''}
                  onChange={(e) => setExpenseTypeModal(prev => ({ 
                    ...prev, 
                    currentType: e.target.value || null,
                    customType: e.target.value === 'CUSTOM' ? prev.customType : ''
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select a category...</option>
                  {Object.values(EXPENSE_TYPES).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom Category...</option>
                </select>
                
                {expenseTypeModal.currentType === 'CUSTOM' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Custom Category
                    </label>
                    <input
                      type="text"
                      value={expenseTypeModal.customType}
                      onChange={(e) => setExpenseTypeModal(prev => ({ 
                        ...prev, 
                        customType: e.target.value 
                      }))}
                      placeholder="Enter custom admin category..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                      maxLength={100}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum 100 characters
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeExpenseTypeModal}
                  disabled={expenseTypeModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExpenseTypeUpdate}
                  disabled={expenseTypeModal.processing || (expenseTypeModal.currentType === 'CUSTOM' && !expenseTypeModal.customType.trim())}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {expenseTypeModal.processing ? 'Updating...' : 'Update Category'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Request Modal */}
      {changeRequestModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Request Change</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setChangeRequestModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    comment: '',
                    processing: false
                  })}
                  disabled={changeRequestModal.processing}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Expense:</strong> {changeRequestModal.expenseTitle}
                </p>
                <p className="text-sm text-gray-500">
                  Please provide a reason for requesting changes to this approved expense. You will be able to add more items after submitting this request.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason/Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={changeRequestModal.comment}
                  onChange={(e) => setChangeRequestModal(prev => ({ 
                    ...prev, 
                    comment: e.target.value 
                  }))}
                  placeholder="Enter reason for requesting changes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  rows={4}
                  required
                />
              </div>

              {error && (
                <div className="mb-4 text-red-600 text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setChangeRequestModal({
                    isOpen: false,
                    expenseId: '',
                    expenseTitle: '',
                    comment: '',
                    processing: false
                  })}
                  disabled={changeRequestModal.processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestChange}
                  disabled={changeRequestModal.processing || !changeRequestModal.comment.trim()}
                >
                  {changeRequestModal.processing ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
