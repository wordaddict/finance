'use client'

import { useState, useEffect } from 'react'
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

interface ReportItem {
  id: string
  description: string
  approvedAmountCents: number
  actualAmountCents: number
}

export function ReportForm({ expense, onClose }: ReportFormProps) {
  const [title, setTitle] = useState(`Report for ${expense.title}`)
  const [content, setContent] = useState('')
  const [notes, setNotes] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [itemAttachments, setItemAttachments] = useState<Record<string, File[]>>({}) // Attachments per item
  const [itemRefundReceipts, setItemRefundReceipts] = useState<Record<string, File[]>>({}) // Refund receipts per item
  const [nonItemizedAttachments, setNonItemizedAttachments] = useState<File[]>([]) // For non-itemized expenses
  const [nonItemizedRefundReceipts, setNonItemizedRefundReceipts] = useState<File[]>([]) // Refund receipts for non-itemized expenses
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reportItems, setReportItems] = useState<ReportItem[]>([])
  const [nonItemizedActualAmount, setNonItemizedActualAmount] = useState(0) // For non-itemized expenses
  const [nonItemizedInputValue, setNonItemizedInputValue] = useState('') // For non-itemized input display
  const [itemInputValues, setItemInputValues] = useState<Record<string, string>>({}) // For item input display

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

  // Initialize report items with approved amounts
  useEffect(() => {
    if (approvedItems.length > 0) {
      const items = approvedItems.map(item => ({
        id: item.id,
        description: item.description,
        approvedAmountCents: item.approvedAmountCents,
        actualAmountCents: item.approvedAmountCents, // Start with approved amount
      }))
      setReportItems(items)
      // Initialize input values
      const inputValues: Record<string, string> = {}
      items.forEach(item => {
        inputValues[item.id] = (item.actualAmountCents / 100).toFixed(2)
      })
      setItemInputValues(inputValues)
    } else {
      // Initialize non-itemized amount
      setNonItemizedActualAmount(totalApprovedAmount)
      setNonItemizedInputValue((totalApprovedAmount / 100).toFixed(2))
    }
  }, [approvedItems.length, totalApprovedAmount])

  // Calculate totals and differences
  const calculateTotals = () => {
    if (reportItems.length > 0) {
      const totalApproved = reportItems.reduce((sum, item) => sum + item.approvedAmountCents, 0)
      const totalActual = reportItems.reduce((sum, item) => sum + item.actualAmountCents, 0)
      const difference = totalActual - totalApproved
      return { totalApproved, totalActual, difference }
    } else {
      // Non-itemized expense
      const totalApproved = totalApprovedAmount
      const totalActual = nonItemizedActualAmount
      const difference = totalActual - totalApproved
      return { totalApproved, totalActual, difference }
    }
  }

  const { totalApproved, totalActual, difference } = calculateTotals()
  const hasRefund = difference < 0 // Spent less than approved
  const needsAdditionalPayment = difference > 0 // Spent more than approved

  // Update item actual amount
  const updateItemAmount = (itemId: string, value: string) => {
    // Update the input value for display
    setItemInputValues(prev => ({ ...prev, [itemId]: value }))
    
    // Parse and update the actual amount
    const numValue = parseFloat(value) || 0
    setReportItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, actualAmountCents: Math.round(numValue * 100) }
        : item
    ))
  }

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
      // Use the file's original MIME type as it's more reliable than Cloudinary's format
      // Cloudinary's format field may be undefined or inconsistent for non-image files like spreadsheets
      // Fallback to constructing from Cloudinary response if file.type is not available
      let mimeType = file.type
      if (!mimeType && uploadResult.resource_type && uploadResult.format) {
        mimeType = `${uploadResult.resource_type}/${uploadResult.format}`
      }
      if (!mimeType) {
        mimeType = 'application/octet-stream'
      }
      
      return {
        publicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        mimeType: mimeType,
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
      // Validate that amounts are valid
      if (reportItems.length > 0) {
        const invalidItems = reportItems.filter(item => item.actualAmountCents < 0)
        if (invalidItems.length > 0) {
          setError('All amounts must be positive numbers')
          setLoading(false)
          return
        }
      } else {
        // Non-itemized expense validation
        if (nonItemizedActualAmount < 0) {
          setError('Amount must be a positive number')
          setLoading(false)
          return
        }
      }

      // Validate attachment requirements
      if (reportItems.length > 0) {
        // Check that each item has at least one attachment
        const itemsWithoutAttachments = reportItems.filter(item => 
          !itemAttachments[item.id] || itemAttachments[item.id].length === 0
        )
        if (itemsWithoutAttachments.length > 0) {
          setError(`Please upload at least one attachment for each item. Missing attachments for: ${itemsWithoutAttachments.map(i => i.description).join(', ')}`)
          setLoading(false)
          return
        }
        
        // Check that items with refunds have refund receipts
        const itemsNeedingRefundReceipts = reportItems.filter(item => {
          const itemDifference = item.actualAmountCents - item.approvedAmountCents
          const needsRefund = itemDifference < 0
          const hasRefundReceipt = itemRefundReceipts[item.id] && itemRefundReceipts[item.id].length > 0
          return needsRefund && !hasRefundReceipt
        })
        if (itemsNeedingRefundReceipts.length > 0) {
          setError(`Please upload refund receipts for items where you spent less than approved: ${itemsNeedingRefundReceipts.map(i => i.description).join(', ')}`)
          setLoading(false)
          return
        }
      } else {
        // Non-itemized expense - check for attachment
        if (nonItemizedAttachments.length === 0) {
          setError('Please upload at least one attachment for this expense report.')
          setLoading(false)
          return
        }
        
        // Check for refund receipt if needed
        if (hasRefund && nonItemizedRefundReceipts.length === 0) {
          setError('You must upload a receipt or invoice showing the refund/return of money when spending less than approved.')
          setLoading(false)
          return
        }
      }

      // Upload attachments and refund receipts per item
      const uploadedAttachments = []
      if (reportItems.length > 0) {
        for (const item of reportItems) {
          // Upload regular attachments
          const files = itemAttachments[item.id] || []
          for (const file of files) {
            const uploadResult = await handleFileUpload(file)
            uploadedAttachments.push({
              ...uploadResult,
              itemId: item.id,
              isRefundReceipt: false,
            })
          }
          
          // Upload refund receipts for this item
          const refundFiles = itemRefundReceipts[item.id] || []
          for (const file of refundFiles) {
            const uploadResult = await handleFileUpload(file)
            uploadedAttachments.push({
              ...uploadResult,
              itemId: item.id,
              isRefundReceipt: true,
            })
          }
        }
      } else {
        // Non-itemized expense - itemId should be null/undefined for general attachments
        for (const file of nonItemizedAttachments) {
          const uploadResult = await handleFileUpload(file)
          uploadedAttachments.push({
            ...uploadResult,
            itemId: undefined, // Explicitly set to undefined for non-itemized attachments
            isRefundReceipt: false,
          })
        }
        
        // Upload refund receipts for non-itemized
        for (const file of nonItemizedRefundReceipts) {
          const uploadResult = await handleFileUpload(file)
          uploadedAttachments.push({
            ...uploadResult,
            itemId: undefined, // Explicitly set to undefined for non-itemized refund receipts
            isRefundReceipt: true,
          })
        }
      }

      // Create report with adjusted amounts
      const response = await fetch('/api/reports/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expenseId: expense.id,
          title,
          content,
          notes: notes || null,
          reportDate,
          attachments: uploadedAttachments,
          approvedExpenses: reportItems.length > 0 ? {
            totalApprovedAmount: totalApproved,
            totalActualAmount: totalActual,
            approvedItems: reportItems.map(item => ({
              id: item.id,
              description: item.description,
              approvedAmountCents: item.approvedAmountCents,
              actualAmountCents: item.actualAmountCents
            }))
          } : {
            totalApprovedAmount: totalApprovedAmount,
            totalActualAmount: nonItemizedActualAmount,
            approvedItems: []
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

  const handleItemFileChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet' // .ods
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, and OpenDocument (.ods) files are allowed`)
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
    
    setItemAttachments(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), ...validFiles]
    }))
    setError('') // Clear any previous errors
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleNonItemizedFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet' // .ods
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, and OpenDocument (.ods) files are allowed`)
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
    
    setNonItemizedAttachments(prev => [...prev, ...validFiles])
    setError('') // Clear any previous errors
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const removeItemAttachment = (itemId: string, index: number) => {
    setItemAttachments(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((_, i) => i !== index)
    }))
  }

  const removeNonItemizedAttachment = (index: number) => {
    setNonItemizedAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleItemRefundReceiptChange = (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet' // .ods
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, and OpenDocument (.ods) files are allowed`)
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
    
    setItemRefundReceipts(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), ...validFiles]
    }))
    setError('') // Clear any previous errors
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const handleNonItemizedRefundReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    // Validate files
    const allowedTypes = [
      'image/jpeg', 
      'image/jpg', 
      'image/png', 
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/vnd.oasis.opendocument.spreadsheet' // .ods
    ]
    const maxSize = 10 * 1024 * 1024 // 10MB
    
    const validFiles: File[] = []
    const errors: string[] = []
    
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Only JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, and OpenDocument (.ods) files are allowed`)
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
    
    setNonItemizedRefundReceipts(prev => [...prev, ...validFiles])
    setError('') // Clear any previous errors
    
    // Reset input value to allow selecting the same file again
    e.target.value = ''
  }

  const removeItemRefundReceipt = (itemId: string, index: number) => {
    setItemRefundReceipts(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((_, i) => i !== index)
    }))
  }

  const removeNonItemizedRefundReceipt = (index: number) => {
    setNonItemizedRefundReceipts(prev => prev.filter((_, i) => i !== index))
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

            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Report Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Describe the outcome, results, or details of the expense..."
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Add any additional notes or comments about this expense report..."
              />
            </div>

            {/* Non-Itemized Expense - Editable Actual Amount */}
            {reportItems.length === 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-sm text-green-800 mb-2">Adjust Actual Amount Spent</h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border border-green-100">
                    <div className="mb-2">
                      <p className="text-xs text-gray-500">Approved Amount: ${(totalApprovedAmount / 100).toFixed(2)}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Actual Amount Spent ($) *
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={nonItemizedInputValue}
                          onChange={(e) => {
                            const value = e.target.value
                            // Allow only numbers and one decimal point
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              setNonItemizedInputValue(value)
                              const numValue = parseFloat(value) || 0
                              setNonItemizedActualAmount(Math.round(numValue * 100))
                            }
                          }}
                          onBlur={(e) => {
                            // Format to 2 decimal places on blur
                            const numValue = parseFloat(e.target.value) || 0
                            setNonItemizedInputValue(numValue.toFixed(2))
                            setNonItemizedActualAmount(Math.round(numValue * 100))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          required
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="w-full">
                          <p className="text-xs text-gray-500 mb-1">Difference</p>
                          <p className={`text-sm font-semibold ${
                            difference > 0 ? 'text-red-600' : 
                            difference < 0 ? 'text-blue-600' : 
                            'text-gray-600'
                          }`}>
                            {difference > 0 ? '+' : ''}${(difference / 100).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Approved:</span>
                    <span className="text-sm font-semibold text-green-600">${(totalApproved / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-medium text-gray-700">Total Actual:</span>
                    <span className="text-sm font-semibold text-gray-900">${(totalActual / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">Difference:</span>
                    <span className={`text-sm font-bold ${
                      needsAdditionalPayment ? 'text-red-600' : 
                      hasRefund ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {needsAdditionalPayment && '+'}${(difference / 100).toFixed(2)}
                      {needsAdditionalPayment && ' (Admin will make additional payment)'}
                      {hasRefund && ' (Refund required)'}
                    </span>
                  </div>
                </div>
                {/* Attachment for non-itemized expense */}
                <div className="mt-4 pt-3 border-t border-green-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Attachments <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                    onChange={handleNonItemizedFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Allowed formats: JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, OpenDocument (.ods). Maximum size: 10MB per file.
                  </p>
                  {nonItemizedAttachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {nonItemizedAttachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-green-100">
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
                            onClick={() => removeNonItemizedAttachment(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Refund Receipt for non-itemized expense */}
                {hasRefund && (
                  <div className="mt-4 pt-3 border-t border-green-200 bg-blue-50 p-3 rounded border border-blue-200">
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Refund Receipt Required <span className="text-red-500">*</span>
                    </label>
                    <p className="text-sm text-blue-700 mb-2">
                      You spent ${Math.abs(difference / 100).toFixed(2)} less than approved. Please upload a receipt or invoice showing the refund/return of money.
                    </p>
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                      onChange={handleNonItemizedRefundReceiptChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    />
                    {nonItemizedRefundReceipts.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {nonItemizedRefundReceipts.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                            <div className="flex items-center space-x-2">
                              <FileText className="w-4 h-4 text-blue-500" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeNonItemizedRefundReceipt(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Approved Items with Editable Actual Amounts */}
            {reportItems.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-sm text-green-800 mb-2">Report Items - Adjust Actual Amounts</h3>
                <div className="space-y-4">
                  {reportItems.map((item, index) => {
                    const difference = item.actualAmountCents - item.approvedAmountCents
                    const itemFiles = itemAttachments[item.id] || []
                    const itemRefundFiles = itemRefundReceipts[item.id] || []
                    const itemNeedsRefund = difference < 0
                    return (
                      <div key={item.id} className="bg-white p-4 rounded border border-green-100">
                        <div className="mb-3">
                          <p className="text-sm font-medium text-gray-900">{item.description}</p>
                          <p className="text-xs text-gray-500">Approved: ${(item.approvedAmountCents / 100).toFixed(2)}</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Actual Amount Spent ($) *
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={itemInputValues[item.id] || (item.actualAmountCents / 100).toFixed(2)}
                              onChange={(e) => {
                                const value = e.target.value
                                // Allow only numbers and one decimal point
                                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                  updateItemAmount(item.id, value)
                                }
                              }}
                              onBlur={(e) => {
                                // Format to 2 decimal places on blur
                                const numValue = parseFloat(e.target.value) || 0
                                const formatted = numValue.toFixed(2)
                                setItemInputValues(prev => ({ ...prev, [item.id]: formatted }))
                                setReportItems(prev => prev.map(i => 
                                  i.id === item.id 
                                    ? { ...i, actualAmountCents: Math.round(numValue * 100) }
                                    : i
                                ))
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                              required
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="w-full">
                              <p className="text-xs text-gray-500 mb-1">Difference</p>
                              <p className={`text-sm font-semibold ${
                                difference > 0 ? 'text-red-600' : 
                                difference < 0 ? 'text-blue-600' : 
                                'text-gray-600'
                              }`}>
                                {difference > 0 ? '+' : ''}${(difference / 100).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>
                        {/* Attachment per item */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            Attachments for this item <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                            onChange={(e) => handleItemFileChange(item.id, e)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Upload receipt/document for this item
                          </p>
                          {itemFiles.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {itemFiles.map((file, fileIndex) => (
                                <div key={fileIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded">
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
                                    onClick={() => removeItemAttachment(item.id, fileIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Refund Receipt per item */}
                        {itemNeedsRefund && (
                          <div className="mt-3 pt-3 border-t border-gray-200 bg-blue-50 p-3 rounded border border-blue-200">
                            <label className="block text-xs font-medium text-blue-800 mb-2">
                              Refund Receipt Required <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-blue-700 mb-2">
                              You spent ${Math.abs(difference / 100).toFixed(2)} less than approved for this item. Please upload a receipt or invoice showing the refund/return of money.
                            </p>
                            <input
                              type="file"
                              multiple
                              accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                              onChange={(e) => handleItemRefundReceiptChange(item.id, e)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                            />
                            {itemRefundFiles.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {itemRefundFiles.map((file, fileIndex) => (
                                  <div key={fileIndex} className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4 text-blue-500" />
                                      <span className="text-sm">{file.name}</span>
                                      <span className="text-xs text-gray-500">
                                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                                      </span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeItemRefundReceipt(item.id, fileIndex)}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Approved:</span>
                    <span className="text-sm font-semibold text-green-600">${(totalApproved / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm font-medium text-gray-700">Total Actual:</span>
                    <span className="text-sm font-semibold text-gray-900">${(totalActual / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200">
                    <span className="text-sm font-medium text-gray-700">Difference:</span>
                    <span className={`text-sm font-bold ${
                      needsAdditionalPayment ? 'text-red-600' : 
                      hasRefund ? 'text-blue-600' : 
                      'text-gray-600'
                    }`}>
                      {needsAdditionalPayment && '+'}${(difference / 100).toFixed(2)}
                      {needsAdditionalPayment && ' (Admin will make additional payment)'}
                      {hasRefund && ' (Refund required)'}
                    </span>
                  </div>
                </div>
              </div>
            )}


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
                disabled={loading || (reportItems.length > 0 && reportItems.some(item => !itemAttachments[item.id] || itemAttachments[item.id].length === 0)) || (reportItems.length === 0 && nonItemizedAttachments.length === 0)}
                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
              >
                {loading ? 'Creating Report...' : 
                 (reportItems.length > 0 && reportItems.some(item => !itemAttachments[item.id] || itemAttachments[item.id].length === 0)) || (reportItems.length === 0 && nonItemizedAttachments.length === 0) ?
                 'Please upload attachments for all items' : 
                 'Create Report'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
