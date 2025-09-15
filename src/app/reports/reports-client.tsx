'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { canViewAllExpenses } from '@/lib/rbac'
import { 
  FileText,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  X
} from 'lucide-react'

interface Report {
  id: string
  title: string
  content: string
  reportDate: string
  createdAt: string
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
  }[]
}

interface ReportsPageClientProps {
  user: any
}

export default function ReportsPageClient({ user }: ReportsPageClientProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    search: '',
  })
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean
    report: Report | null
  }>({
    isOpen: false,
    report: null,
  })

  useEffect(() => {
    fetchReports()
  }, [filters])

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)

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

  if (!canViewAllExpenses(user)) {
    return (
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view reports.</p>
          </CardContent>
        </Card>
      </div>
    )
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
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                            <h3 className="text-base sm:text-lg font-semibold">{report.title}</h3>
                            <p className="text-sm text-gray-600 line-clamp-2">{report.content}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          <div className="flex items-center text-gray-500">
                            <span>{formatCurrency(report.expense.amountCents)}</span>
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
      {viewModal.isOpen && viewModal.report && (
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
                <h3 className="font-semibold text-base sm:text-lg">{viewModal.report.title}</h3>
                <p className="text-sm text-gray-500">
                  Report Date: {formatDate(viewModal.report.reportDate)}
                </p>
              </div>

              {/* Expense Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-sm text-gray-700 mb-2">Related Expense</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Title:</span> {viewModal.report.expense.title}
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span> {formatCurrency(viewModal.report.expense.amountCents)}
                  </div>
                  <div>
                    <span className="text-gray-500">Team:</span> {viewModal.report.expense.team}
                  </div>
                  <div>
                    <span className="text-gray-500">Campus:</span> {viewModal.report.expense.campus}
                  </div>
                  {viewModal.report.expense.eventDate && (
                    <div>
                      <span className="text-gray-500">Event Date:</span> {formatDate(viewModal.report.expense.eventDate)}
                    </div>
                  )}
                  <div>
                    <span className="text-gray-500">Requester:</span> {viewModal.report.expense.requester.name || viewModal.report.expense.requester.email}
                  </div>
                </div>
              </div>

              {/* Report Content */}
              <div>
                <label className="text-sm font-medium text-gray-500">Report Content</label>
                <p className="mt-1 p-3 bg-gray-50 rounded-md text-sm sm:text-base whitespace-pre-wrap">
                  {viewModal.report.content}
                </p>
              </div>

              {/* Attachments */}
              {viewModal.report.attachments && viewModal.report.attachments.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Attachments</label>
                  <div className="mt-2 space-y-2">
                    {viewModal.report.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          {attachment.mimeType.startsWith('image/') ? (
                            <img
                              src={attachment.secureUrl}
                              alt="Report attachment"
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
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
