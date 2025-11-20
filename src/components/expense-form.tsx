'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionUser } from '@/lib/auth'
import { X, Upload, FileText } from 'lucide-react'
import { TEAMS, TEAM_DISPLAY_NAMES, CAMPUSES, CAMPUS_DISPLAY_NAMES, URGENCY_DISPLAY_NAMES, EXPENSE_CATEGORY_VALUES } from '@/lib/constants'

interface ExpenseItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  amount: number
}

// Teams are now defined as constants

interface ExpenseFormProps {
  user: SessionUser
  onClose?: () => void
  onSuccess?: () => void
  onCancel?: () => void
  editExpense?: any // Expense object for editing
}

export function ExpenseForm({ user, onClose, onSuccess, onCancel, editExpense }: ExpenseFormProps) {
  const [title, setTitle] = useState('')
  const [team, setTeam] = useState('')
  const [campus, setCampus] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [urgency, setUrgency] = useState(2)
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, amount: 0 }
  ])
  const [totalAmount, setTotalAmount] = useState(0)

  // Teams are now enums, no need to fetch them

  // Calculate total amount whenever items change
  useEffect(() => {
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    setTotalAmount(total)
  }, [items])

  // Populate form when editing
  useEffect(() => {
    if (editExpense) {
      setTitle(editExpense.title || '')
      setTeam(editExpense.team || '')
      setCampus(editExpense.campus || '')
      setDescription(editExpense.description || '')
      setCategory(editExpense.category || '')
      setUrgency(editExpense.urgency || 2)
      setEventDate(editExpense.eventDate || '')

      // Populate items if they exist
      if (editExpense.items && editExpense.items.length > 0) {
        const formattedItems = editExpense.items.map((item: any, index: number) => ({
          id: item.id || (index + 1).toString(),
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: (item.unitPriceCents || 0) / 100,
          amount: (item.amountCents || 0) / 100,
        }))
        setItems(formattedItems)
      }
    }
  }, [editExpense])

  const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice
        }
        return updated
      }
      return item
    }))
  }

  const addItem = () => {
    const newId = (Math.max(...items.map(i => parseInt(i.id))) + 1).toString()
    setItems(prev => [...prev, { id: newId, description: '', quantity: 1, unitPrice: 0, amount: 0 }])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const handleFileUpload = async (file: File) => {
    try {
      // Get Cloudinary upload signature
      const signatureResponse = await fetch('/api/uploads/cloudinary-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folder: 'expense-receipts' }),
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
      // Upload attachments
      const uploadedAttachments = []
      for (const file of attachments) {
        const uploadResult = await handleFileUpload(file)
        uploadedAttachments.push(uploadResult)
      }

      // Create or update expense request
      const isEditing = !!editExpense
      const url = isEditing ? `/api/expenses/update` : '/api/expenses/create'
      const method = isEditing ? 'PUT' : 'POST'
      
      const requestBody: any = {
        title,
        amountCents: Math.round(totalAmount * 100),
        team,
        campus,
        description,
        category,
        urgency,
        eventDate: eventDate || null,
        attachments: uploadedAttachments,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: Math.round(item.unitPrice * 100),
          amountCents: Math.round(item.amount * 100),
        })),
      }

      // Add expense ID for updates
      if (isEditing) {
        requestBody.expenseId = editExpense.id
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        if (onSuccess) {
          onSuccess()
        } else if (onClose) {
          onClose()
          // Refresh the page to show the new expense
          window.location.reload()
        }
      } else {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} expense request`)
      }
    } catch (error) {
      setError('Failed to create expense request')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
              <CardTitle className="text-lg sm:text-xl">
                {editExpense ? 'Edit Expense Request' : 'Create New Expense Request'}
              </CardTitle>
              <CardDescription className="text-sm">
                {editExpense ? 'Update your expense request' : 'Submit a new expense request for approval'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Title *
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
              <label className="block text-sm font-medium mb-1">
                Expense Items *
              </label>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Item {index + 1}</h4>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description *
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="Item description"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity === 0 ? '' : item.quantity.toString()}
                          onChange={(e) => {
                            const value = e.target.value
                            const numericValue = value === '' ? 0 : parseInt(value) || 1
                            updateItem(item.id, 'quantity', numericValue)
                          }}
                          onBlur={(e) => {
                            // Ensure minimum value of 1 when user leaves the field
                            if (item.quantity < 1) {
                              updateItem(item.id, 'quantity', 1)
                            }
                          }}
                          placeholder="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Unit Price ($) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice === 0 ? '' : item.unitPrice.toString()}
                          onChange={(e) => {
                            const value = e.target.value
                            const numericValue = value === '' ? 0 : parseFloat(value) || 0
                            updateItem(item.id, 'unitPrice', numericValue)
                          }}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          required
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-medium text-gray-700">
                        Total: ${item.amount.toFixed(2)}
                      </span>
                      {item.quantity > 1 && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({item.quantity} × ${item.unitPrice.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full"
                >
                  + Add Another Item
                </Button>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="team" className="block text-sm font-medium mb-1">
                Team *
              </label>
              <select
                id="team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a team</option>
                {Object.entries(TEAM_DISPLAY_NAMES).map(([value, displayName]) => (
                  <option key={value} value={value}>
                    {displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="campus" className="block text-sm font-medium mb-1">
                Campus *
              </label>
              <select
                id="campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a campus</option>
                {Object.entries(CAMPUS_DISPLAY_NAMES).map(([value, displayName]) => (
                  <option key={value} value={value}>
                    {displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium mb-1">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium mb-1">
                Category *
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  const newCategory = e.target.value
                  setCategory(newCategory)
                  // Clear event date if category is not Special Events and Programs
                  if (newCategory !== 'Special Events and Programs') {
                    setEventDate('')
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a category</option>
                {EXPENSE_CATEGORY_VALUES.map((categoryValue) => (
                  <option key={categoryValue} value={categoryValue}>
                    {categoryValue}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="urgency" className="block text-sm font-medium mb-1">
                Urgency
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Not Urgent (Few months)</option>
                <option value={2}>Urgent (This Month)</option>
                <option value={3}>Very Urgent (This week)</option>
              </select>
            </div>

            {category === 'Special Events and Programs' && (
              <div>
                <label htmlFor="eventDate" className="block text-sm font-medium mb-1">
                  Event Date *
                </label>
                <input
                  id="eventDate"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Event date is required for special events and programs
                </p>
              </div>
            )}

            <div>
              <label htmlFor="attachments" className="block text-sm font-medium mb-1">
                Attachments (Receipts, etc.)
              </label>
              <input
                id="attachments"
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowed formats: JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, OpenDocument (.ods), and Google Sheets (export as Excel or CSV). Maximum size: 10MB per file.
              </p>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAttachment(index)}
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
              <Button type="button" variant="outline" onClick={onCancel || onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (editExpense ? 'Updating...' : 'Creating...') : (editExpense ? 'Update Expense Request' : 'Create Expense Request')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
