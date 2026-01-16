'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { 
  FileText,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Lock
} from 'lucide-react'
import { ConfirmationModal } from '@/components/confirmation-modal'

interface Report {
  id: string
  title: string
  content: string
  reportDate: string
  createdAt: string
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CLOSED' | 'CHANGE_REQUESTED'
  totalApprovedAmount?: number
  donationAmountCents?: number | null
  expense: {
    id: string
    title: string
    amountCents: number
    team: string
    campus: string
    eventDate?: string
    requester: {
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
  totalActualAmount?: number
}

interface ReportsPageClientProps {
  user: any
}

// Client-safe helper (avoid importing server cloudinary SDK)
function getCloudinaryDownloadUrl(secureUrl: string): string {
  return secureUrl.replace('/upload/', '/upload/fl_attachment/')
}

// Unified attachment handler (matches expense requests behavior)
async function handleAttachmentClick(attachment: Report['attachments'][number]) {
  try {
    const fileName = attachment.secureUrl.split('/').pop() || 'download'

    // Images can open directly
    if (attachment.mimeType?.startsWith('image/')) {
      window.open(attachment.secureUrl, '_blank')
      return
    }

    // Use Cloudinary download URL to make PDFs/docs viewable
    const downloadUrl = getCloudinaryDownloadUrl(attachment.secureUrl)

    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Failed to handle attachment:', error)
    window.open(attachment.secureUrl, '_blank')
  }
}

export default function ReportsPageClient({ user }: ReportsPageClientProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
    status: '',
  })
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    report: Report | null
  }>({
    isOpen: false,
    report: null,
  })
  const [processingApprove, setProcessingApprove] = useState(false)
  const [processingChange, setProcessingChange] = useState(false)
  const [changeModal, setChangeModal] = useState<{
    isOpen: boolean
    reportId: string
    reportTitle: string
    comment: string
  }>({
    isOpen: false,
    reportId: '',
    reportTitle: '',
    comment: '',
  })
  const [closeConfirmModal, setCloseConfirmModal] = useState<{
    isOpen: boolean
    reportId: string
    reportTitle: string
    expenseId: string
    isLastReport: boolean
  }>({
    isOpen: false,
    reportId: '',
    reportTitle: '',
    expenseId: '',
    isLastReport: false,
  })
  const [message, setMessage] = useState('')
  const [processingClose, setProcessingClose] = useState(false)
  const selectedReport = viewModal.report ?? null

  useEffect(() => {
    fetchReports()
  }, [filters])

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.status) params.append('status', filters.status)

      const response = await fetch(`/api/reports?${params}`)
      
      if (response.ok) {
        const data = await response.json()
        setReports(data.reports)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to fetch reports')
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error)
      setError('Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  const openViewModal = (report: Report) => {
    setViewModal({
      isOpen: true,
      report,
    })
  }

  const closeViewModal = () => {
    setViewModal({
      isOpen: false,
      report: null,
    })
  }

  const openChangeModal = (reportId: string, reportTitle: string) => {
    setChangeModal({
      isOpen: true,
      reportId,
      reportTitle,
      comment: '',
    })
  }

  const closeChangeModal = () => {
    setChangeModal({
      isOpen: false,
      reportId: '',
      reportTitle: '',
      comment: '',
    })
  }

  const handleApproveReport = async (reportId: string) => {
    try {
      setProcessingApprove(true)
      const response = await fetch('/api/reports/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId }),
      })

      if (response.ok) {
        setMessage('Report approved successfully')
        closeViewModal()
        fetchReports()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to approve report')
      }
    } catch (err) {
      console.error('Failed to approve report:', err)
      setError('Failed to approve report')
    } finally {
      setProcessingApprove(false)
    }
  }

  const handleSubmitChangeRequest = async () => {
    if (!changeModal.comment.trim()) return
    try {
      setProcessingChange(true)
      const response = await fetch('/api/reports/request-change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId: changeModal.reportId, comment: changeModal.comment.trim() }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessage('Change request submitted. The requester can edit the report.')
        closeChangeModal()
        closeViewModal()
        fetchReports()
      } else {
        setError(data.error || 'Failed to request changes')
      }
    } catch (err) {
      console.error('Failed to request changes:', err)
      setError('Failed to request changes')
    } finally {
      setProcessingChange(false)
    }
  }

  const openCloseConfirmModal = (reportId: string, reportTitle: string, expenseId: string) => {
    // Check if this is the last non-closed report for the expense
    const expenseReports = reports.filter(r => r.expense.id === expenseId)
    const nonClosedReports = expenseReports.filter(r => r.status !== 'CLOSED')
    const isLastReport = nonClosedReports.length === 1 && nonClosedReports[0].id === reportId

    setCloseConfirmModal({
      isOpen: true,
      reportId,
      reportTitle,
      expenseId,
      isLastReport,
    })
  }

  const closeCloseConfirmModal = () => {
    setCloseConfirmModal({
      isOpen: false,
      reportId: '',
      reportTitle: '',
      expenseId: '',
      isLastReport: false,
    })
  }

  const handleCloseReport = async () => {
    if (!closeConfirmModal.reportId) return

    try {
      setProcessingClose(true)
      const response = await fetch('/api/reports/close', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId: closeConfirmModal.reportId }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(
          closeConfirmModal.isLastReport
            ? 'Report closed successfully. The associated expense request has also been closed.'
            : 'Report closed successfully'
        )
        closeCloseConfirmModal()
        fetchReports() // Refresh the list
      } else {
        setError(data.error || 'Failed to close report')
        closeCloseConfirmModal()
      }
    } catch (error) {
      console.error('Failed to close report:', error)
      setError('Failed to close report')
      closeCloseConfirmModal()
    } finally {
      setProcessingClose(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-green-600 bg-green-50'
      case 'DENIED':
        return 'text-red-600 bg-red-50'
      case 'CHANGE_REQUESTED':
        return 'text-yellow-700 bg-yellow-50'
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50'
      case 'CLOSED':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4" />
      case 'DENIED':
        return <XCircle className="w-4 h-4" />
      case 'CHANGE_REQUESTED':
        return <Filter className="w-4 h-4" />
      case 'PENDING':
        return <Clock className="w-4 h-4" />
      case 'CLOSED':
        return <Lock className="w-4 h-4" />
      default:
        return null
    }
  }

  // This check is redundant since the page.tsx already redirects non-admins,
  // but keeping it as a safety check
  if (user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Expense Reports</h1>
            <p className="text-gray-500 text-sm sm:text-base">
              View reports created for paid expenses
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Success!</strong>
            <span className="block sm:inline"> {message}</span>
          </div>
        )}

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
                <label htmlFor="search" className="block text-sm font-medium mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="search"
                    type="text"
                    placeholder="Search reports..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
                <select
                  id="status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DENIED">Denied</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">Loading reports...</p>
              </CardContent>
            </Card>
          ) : reports.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No reports found.</p>
                <p className="text-sm text-gray-500 mt-2">
                  Reports will appear here once they are created for paid expenses.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-base sm:text-lg font-semibold">{report.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(report.status)}`}>
                                {getStatusIcon(report.status)}
                                {report.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{report.content}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center text-gray-500">
                            <span>Requested: {formatCurrency(report.expense.amountCents)}</span>
                          </div>
                          <div className="flex items-center text-gray-500">
                            <span>Approved: <span className="font-semibold text-green-600">{formatCurrency(report.totalApprovedAmount || report.expense.amountCents)}</span></span>
                          </div>
                          <div className="flex items-center text-gray-500">
                            <User className="w-4 h-4 mr-1" />
                            <span>{report.expense.requester.name || report.expense.requester.email}</span>
                          </div>
                          <div className="flex items-center text-gray-500">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>Report: {formatDate(report.reportDate)}</span>
                          </div>
                          {report.attachments.length > 0 && (
                            <div className="flex items-center text-gray-500">
                              <FileText className="w-4 h-4 mr-1" />
                              <span>{report.attachments.length} attachment(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openViewModal(report)}
                          className="flex items-center space-x-2"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        {user.role === 'ADMIN' && (report.status === 'APPROVED' || report.status === 'PENDING') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCloseConfirmModal(report.id, report.title, report.expense.id)}
                            className="flex items-center space-x-2 bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                          >
                            <Lock className="w-4 h-4" />
                            <span className="hidden sm:inline">Close</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Modal */}
      {viewModal.isOpen && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Report Details</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={closeViewModal}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-base sm:text-lg">{selectedReport.title}</h3>
                <p className="text-sm text-gray-500">
                  Report Date: {formatDate(selectedReport.reportDate)}
                </p>
              </div>

              {/* Admin actions for pending reports */}
              {selectedReport.status === 'PENDING' && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => openChangeModal(selectedReport.id, selectedReport.title)}
                    className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100"
                    disabled={processingApprove || processingChange}
                  >
                    {processingChange ? 'Requesting...' : 'Request Changes'}
                  </Button>
                  <Button
                    onClick={() => handleApproveReport(selectedReport.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={processingApprove || processingChange}
                  >
                    {processingApprove ? 'Approving...' : 'Approve Report'}
                  </Button>
                </div>
              )}

              {/* Expense Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Related Expense</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Title:</span> {selectedReport.expense.title}
                  </div>
                  <div>
                    <span className="text-gray-500">Requested Amount:</span> {formatCurrency(selectedReport.expense.amountCents)}
                  </div>
                  <div>
                    <span className="text-gray-500">Approved Amount:</span> <span className="font-semibold text-green-600">{formatCurrency(selectedReport.totalApprovedAmount || selectedReport.expense.amountCents)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Team:</span> {selectedReport.expense.team}
                  </div>
                  <div>
                    <span className="text-gray-500">Campus:</span> {selectedReport.expense.campus}
                  </div>
                  {selectedReport.expense.eventDate && (
                    <div>
                      <span className="text-gray-500">Event Date:</span> {formatDate(selectedReport.expense.eventDate)}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Requester:</span> {selectedReport.expense.requester.name || selectedReport.expense.requester.email}
                  </div>
                </div>
              </div>

              {/* Approved Items Details with Actual Amounts and Attachments */}
              {selectedReport.approvedItems && selectedReport.approvedItems.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-sm text-green-800 mb-3">Report Items</h4>
                  {selectedReport.donationAmountCents ? (
                    <div className="mb-3 text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 rounded p-3">
                      Donation applied: {formatCurrency(selectedReport.donationAmountCents)}
                    </div>
                  ) : null}
                  <div className="space-y-3">
                    {selectedReport.approvedItems.map((item, index) => {
                      const actualAmount = item.actualAmountCents ?? item.approvedAmountCents
                      const difference = actualAmount - item.approvedAmountCents
                      // Match attachments using originalItemId (the itemId stored in attachments matches the originalItemId)
                      const itemAttachments = selectedReport.attachments?.filter((att) => 
                        att.itemId && att.itemId === item.originalItemId && !att.isRefundReceipt
                      ) || []
                      const itemRefundReceipts = selectedReport.attachments?.filter((att) => 
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
                              {(() => {
                                const donation = selectedReport.donationAmountCents || 0
                                const totalApproved = selectedReport.totalApprovedAmount || 0
                                const totalActual = selectedReport.totalActualAmount ?? totalApproved
                                const totalOverage = Math.max(0, totalActual - totalApproved)
                                const remainingOverage = Math.max(0, totalOverage - donation)
                                const coveredByDonation = donation > 0 && remainingOverage === 0 && difference > 0
                                return (
                                  <p className={`text-sm font-bold ${
                                    coveredByDonation ? 'text-amber-700' :
                                    difference > 0 ? 'text-red-600' : 
                                    difference < 0 ? 'text-blue-600' : 
                                    'text-gray-600'
                                  }`}>
                                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                                    {coveredByDonation
                                      ? ' (Covered by donation)'
                                      : difference > 0
                                        ? ' (Additional payment needed)'
                                        : difference < 0
                                          ? ' (Refund required)'
                                          : ''}
                                  </p>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Attachments for this item */}
                          {itemAttachments.length > 0 && (
                            <div className="mb-2">
                              <p className="text-xs font-medium text-gray-700 mb-2">Attachments for this item:</p>
                              <div className="space-y-2">
                                {itemAttachments.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      {attachment.mimeType.startsWith('image/') ? (
                                        <img
                                          src={attachment.secureUrl}
                                          alt="Item attachment"
                                          className="w-10 h-10 object-cover rounded border cursor-pointer"
                                          onClick={async () => await handleAttachmentClick(attachment)}
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
                                      onClick={async () => await handleAttachmentClick(attachment)}
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
                                {itemRefundReceipts.map((attachment) => (
                                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center space-x-2">
                                      {attachment.mimeType.startsWith('image/') ? (
                                        <img
                                          src={attachment.secureUrl}
                                          alt="Refund receipt"
                                          className="w-10 h-10 object-cover rounded border cursor-pointer"
                                          onClick={async () => await handleAttachmentClick(attachment)}
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
                                      onClick={async () => await handleAttachmentClick(attachment)}
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
                  
                  {/* Totals Summary */}
                  <div className="mt-4 pt-3 border-t border-green-200 bg-white p-3 rounded">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Approved</p>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(selectedReport.approvedItems.reduce((sum, item) => sum + item.approvedAmountCents, 0))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Actual</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(selectedReport.approvedItems.reduce((sum, item) => sum + (item.actualAmountCents ?? item.approvedAmountCents), 0))}
                        </p>
                      </div>
                  {selectedReport.donationAmountCents ? (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Donation</p>
                      <p className="text-sm font-semibold text-amber-700">
                        {formatCurrency(selectedReport.donationAmountCents)}
                      </p>
                    </div>
                  ) : (
                    <div />
                  )}
                      <div className="col-span-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Total Difference</p>
                        {(() => {
                          const totalApproved = selectedReport.approvedItems.reduce((sum, item) => sum + item.approvedAmountCents, 0)
                          const totalActual = selectedReport.approvedItems.reduce((sum, item) => sum + (item.actualAmountCents ?? item.approvedAmountCents), 0)
                      const donation = selectedReport.donationAmountCents || 0
                      const totalOverage = Math.max(0, totalActual - totalApproved)
                      const remainingOverage = Math.max(0, totalOverage - donation)
                      const totalDifference = totalActual - totalApproved
                      const adjusted = totalDifference > 0 ? remainingOverage : totalDifference
                          return (
                            <p className={`text-sm font-bold ${
                          adjusted > 0 ? 'text-red-600' : 
                          adjusted < 0 ? 'text-blue-600' : 
                              'text-gray-600'
                            }`}>
                          {adjusted > 0 ? '+' : ''}{formatCurrency(adjusted)}
                          {adjusted > 0 && ' (Additional payment needed)'}
                          {adjusted < 0 && ' (Refund required)'}
                            </p>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Report Content */}
              <div>
                <label className="text-sm font-medium text-gray-500">Report Content</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-lg text-sm sm:text-base whitespace-pre-wrap">
                  {selectedReport.content}
                </p>
              </div>

              {/* Non-itemized attachments (if any) - only show if there are no items or attachments without itemId */}
              {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                (() => {
                  // Only show as non-itemized if itemId is null/undefined (not set)
                  const nonItemizedAttachments = selectedReport.attachments.filter((att) => !att.itemId || att.itemId === null)
                  if (nonItemizedAttachments.length > 0) {
                    return (
                      <div>
                        <label className="text-sm font-medium text-gray-500">General Attachments</label>
                        <div className="mt-2 space-y-2">
                          {nonItemizedAttachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {attachment.mimeType.startsWith('image/') ? (
                                  <img
                                    src={attachment.secureUrl}
                                    alt="Report attachment"
                                    className="w-12 h-12 object-cover rounded border cursor-pointer"
                                    onClick={async () => await handleAttachmentClick(attachment)}
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
                                onClick={async () => await handleAttachmentClick(attachment)}
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
            </div>
          </div>
        </div>
      )}

      {/* Close Report Confirmation Modal */}
      <ConfirmationModal
        isOpen={closeConfirmModal.isOpen}
        onClose={closeCloseConfirmModal}
        onConfirm={handleCloseReport}
        title="Close Report"
        message={
          closeConfirmModal.isLastReport
            ? `Are you sure you want to close "${closeConfirmModal.reportTitle}"? This will mark the report as closed and will also close the associated expense request since this is the last report.`
            : `Are you sure you want to close "${closeConfirmModal.reportTitle}"? This will mark the report as closed.`
        }
        confirmText="Close Report"
        cancelText="Cancel"
        variant="warning"
        loading={processingClose}
      />

      {/* Change Request Modal */}
      {changeModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Request Report Changes
              </h2>
              <button
                onClick={closeChangeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  You are about to request changes for the expense report:
                </p>
                <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {changeModal.reportTitle}
                </p>
              </div>

              <div className="mb-6">
                <label htmlFor="changeComment" className="block text-sm font-medium text-gray-700 mb-2">
                  What needs to change? *
                </label>
                <textarea
                  id="changeComment"
                  value={changeModal.comment}
                  onChange={(e) => setChangeModal(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Describe what needs to be updated in this report..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The requester will see this and be able to edit their report.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeChangeModal}
                  disabled={processingChange}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitChangeRequest}
                  disabled={processingChange || !changeModal.comment.trim()}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  {processingChange ? 'Submitting...' : 'Request Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
