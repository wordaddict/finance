'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Upload, FileText } from 'lucide-react'

interface ReportFormProps {
  expense: {
    id: string
    title: string
    amountCents: number
    team: string
    campus: string
    description?: string
    eventDate?: string
    status: string
    requester: {
      name: string | null
      email: string
    }
    items?: {
      id: string
      description: string
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
  }
  onClose: () => void
}

export function ReportForm({ expense, onClose }: ReportFormProps) {
  const [title, setTitle] = useState(`Report for ${expense.title}`)
  const [content, setContent] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [attachments, setAttachments] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Calculate approved expenses and required attachments
  const calculateApprovedExpenses = () => {
    if (!expense.items || expense.items.length === 0) {
      // Non-itemized expense - return the full approved amount
      return {
        approvedItems: [],
        totalApprovedAmount: expense.amountCents,
        requiredAttachments: 1
      }
    }

    // Itemized expense - calculate approved amounts for each item
    const approvedItems = expense.items.map(item => {
      const itemApproval = item.approvals?.[0] // Get the first (and should be only) approval
      if (itemApproval && itemApproval.status === 'APPROVED') {
        return {
          ...item,
          approvedAmountCents: itemApproval.approvedAmountCents || item.amountCents
        }
      }
      return {
        ...item,
        approvedAmountCents: 0 // Not approved
      }
    }).filter(item => item.approvedAmountCents > 0) // Only include approved items

    const totalApprovedAmount = approvedItems.reduce((sum, item) => sum + item.approvedAmountCents, 0)
    
    return {
      approvedItems,
      totalApprovedAmount,
      requiredAttachments: approvedItems.length
    }
  }

  const { approvedItems, totalApprovedAmount, requiredAttachments } = calculateApprovedExpenses()

  const handleFileUpload = async (file: File) => {
    try {
      // Get Cloudinary upload signature
      const signatureResponse = await fetch('/api/uploads/cloudinary-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder: 'expense-reports' }),
      })

      if (!signatureResponse.ok) {
        throw new Error('Failed to get upload signature')
      }

      const signature = await signatureResponse.json()
      
      // Debug logging
      console.log('Cloudinary signature:', signature)
      console.log('File being uploaded:', file.name, file.size, file.type)

      // Upload to Cloudinary
      const formData = new FormData()
      formData.append('file', file)
      formData.append('api_key', signature.api_key)
      formData.append('timestamp', signature.timestamp.toString())
      formData.append('signature', signature.signature)
      formData.append('folder', signature.folder)

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloud_name}/auto/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('Cloudinary upload error:', errorText)
        throw new Error(`Upload failed: ${errorText}`)
      }

      const uploadResult = await uploadResponse.json()
      return {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        mimeType: uploadResult.format,
      }
    } catch (error) {
      console.error('File upload error:', error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate attachment requirements
      if (attachments.length < requiredAttachments) {
        setError(`This expense report requires at least ${requiredAttachments} attachment(s) because it has ${approvedItems.length > 0 ? `${approvedItems.length} approved item(s)` : 'approved expenses'}. Please upload the required documents.`)
        setLoading(false)
        return
      }

      // Upload attachments
      const uploadedAttachments = []
      for (const file of attachments) {
        const uploadResult = await handleFileUpload(file)
        uploadedAttachments.push(uploadResult)
      }

      // Create report with approved expenses data
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense.id,
          title,
          content,
          reportDate,
          attachments: uploadedAttachments,
          approvedExpenses: {
            totalApprovedAmount,
            approvedItems: approvedItems.map(item => ({
              id: item.id,
              description: item.description,
              approvedAmountCents: item.approvedAmountCents
            }))
          }
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onClose()
        // Refresh the page to show the new report
        window.location.reload()
      } else {
        setError(data.error || 'Failed to create report')
      }
    } catch (error) {
      setError('Failed to create report')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, and PDF files are allowed`)
        continue
      }
      
      if (file.size > maxSize) {
        errors.push(`${file.name}: File size must be less than 10MB`)
        continue
      }
      
      validFiles.push(file)
    }
    
    if (errors.length > 0) {
      setError(errors.join('; '))
      return
    }
    
    setAttachments(prev => [...prev, ...validFiles])
    setError('') // Clear any previous errors
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Create Expense Report</CardTitle>
              <CardDescription className="text-sm">
                Create a report for the paid expense: {expense.title}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Expense Details Preview */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Expense Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Title:</span> {expense.title}
                </div>
                <div>
                  <span className="text-gray-500">Requested Amount:</span> ${(expense.amountCents / 100).toFixed(2)}
                </div>
                <div>
                  <span className="text-gray-500">Approved Amount:</span> <span className="font-semibold text-green-600">${(totalApprovedAmount / 100).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Team:</span> {expense.team}
                </div>
                <div>
                  <span className="text-gray-500">Campus:</span> {expense.campus}
                </div>
                {expense.eventDate && (
                  <div>
                    <span className="text-gray-500">Event Date:</span> {new Date(expense.eventDate).toLocaleDateString()}
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Requester:</span> {expense.requester.name || expense.requester.email}
                </div>
              </div>
              {expense.description && (
                <div className="mt-2">
                  <span className="text-gray-500 text-sm">Description:</span>
                  <p className="text-sm mt-1">{expense.description}</p>
                </div>
              )}
            </div>

            {/* Approved Items Details */}
            {approvedItems.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-sm text-green-800 mb-2">Approved Items</h3>
                <div className="space-y-2">
                  {approvedItems.map((item, index) => (
                    <div key={item.id} className="bg-white p-3 rounded border border-green-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity} × ${(item.unitPriceCents / 100).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            ${(item.approvedAmountCents / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">Item {index + 1}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Report Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="reportDate" className="block text-sm font-medium mb-1">
                Report Date *
              </label>
              <input
                id="reportDate"
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium mb-1">
                Report Content *
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the outcome, results, or details of the expense..."
                required
              />
            </div>

            <div>
              <label htmlFor="attachments" className="block text-sm font-medium mb-1">
                Attachments <span className="text-red-500">*</span>
              </label>
              <input
                id="attachments"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="mt-1">
                <p className="text-xs text-gray-500">
                  Allowed formats: JPG, PNG, PDF. Maximum size: 10MB per file.
                </p>
                <p className="text-sm font-medium text-blue-600">
                  Required: {requiredAttachments} attachment(s) ({attachments.length}/{requiredAttachments} uploaded)
                  {requiredAttachments > 1 && (
                    <span className="text-gray-600"> - One document per approved item</span>
                  )}
                </p>
              </div>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttachment(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || attachments.length < requiredAttachments}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              >
                {loading ? 'Creating Report...' : 
                 attachments.length < requiredAttachments ? 
                 `Upload ${requiredAttachments - attachments.length} more file(s)` : 
                 'Create Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
