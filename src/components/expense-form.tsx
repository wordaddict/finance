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
  category: string
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
  noModal?: boolean // If true, don't render the modal wrapper (for use in existing modals)
}

export function ExpenseForm({ user, onClose, onSuccess, onCancel, editExpense, noModal = false }: ExpenseFormProps) {
  const [title, setTitle] = useState('')
  const [team, setTeam] = useState('')
  const [campus, setCampus] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState(2)
  const [isEvent, setIsEvent] = useState(false)
  const [eventDate, setEventDate] = useState('')
  const [eventName, setEventName] = useState('')
  const [fullEventBudget, setFullEventBudget] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [itemAttachments, setItemAttachments] = useState<Record<string, File[]>>({}) // New file uploads per item
  const [nonItemizedAttachments, setNonItemizedAttachments] = useState<File[]>([]) // New file uploads for expenses without items (backward compatibility)
  const [existingItemAttachments, setExistingItemAttachments] = useState<Record<string, any[]>>({}) // Existing attachments from database per item
  const [existingNonItemizedAttachments, setExistingNonItemizedAttachments] = useState<any[]>([]) // Existing attachments from database (backward compatibility)
  const [items, setItems] = useState<ExpenseItem[]>([
    { id: '1', description: '', category: '', quantity: 1, unitPrice: 0, amount: 0 }
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
      setUrgency(editExpense.urgency || 2)
      const hasEventDate = !!editExpense.eventDate
      setIsEvent(hasEventDate)
      setEventDate(editExpense.eventDate || '')
      setEventName(editExpense.eventName || '')
      setFullEventBudget((editExpense.fullEventBudgetCents || 0) / 100)

      // Populate items if they exist
      if (editExpense.items && editExpense.items.length > 0) {
        const formattedItems = editExpense.items.map((item: any, index: number) => ({
          id: item.id || (index + 1).toString(),
          description: item.description || '',
          category: item.category || editExpense.category || '', // Use item category if available, fallback to expense category
          quantity: item.quantity || 1,
          unitPrice: (item.unitPriceCents || 0) / 100,
          amount: (item.amountCents || 0) / 100,
        }))
        setItems(formattedItems)
      }

      // Populate existing attachments
      if (editExpense.attachments && editExpense.attachments.length > 0) {
        const itemAttachmentsMap: Record<string, any[]> = {}
        const nonItemized: any[] = []

        editExpense.attachments.forEach((attachment: any) => {
          if (attachment.itemId) {
            // Attachment belongs to an item
            if (!itemAttachmentsMap[attachment.itemId]) {
              itemAttachmentsMap[attachment.itemId] = []
            }
            itemAttachmentsMap[attachment.itemId].push(attachment)
          } else {
            // Non-itemized attachment
            nonItemized.push(attachment)
          }
        })

        setExistingItemAttachments(itemAttachmentsMap)
        setExistingNonItemizedAttachments(nonItemized)
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
    setItems(prev => [...prev, { id: newId, description: '', category: '', quantity: 1, unitPrice: 0, amount: 0 }])
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
      // Validate that all items have a category
      const itemsWithoutCategory = items.filter(item => !item.category || item.category.trim() === '')
      if (itemsWithoutCategory.length > 0) {
        setError('Please select a category for all expense items')
        setLoading(false)
        return
      }

      // Validate that all items have at least one attachment (existing or new)
      const itemsWithoutAttachments = items.filter(item => {
        const newAttachments = itemAttachments[item.id] || []
        const existingAttachments = existingItemAttachments[item.id] || []
        return newAttachments.length === 0 && existingAttachments.length === 0
      })
      if (itemsWithoutAttachments.length > 0) {
        const itemNumbers = itemsWithoutAttachments.map((item, index) => {
          const itemIndex = items.findIndex(i => i.id === item.id) + 1
          return itemIndex
        }).join(', ')
        setError(`Please upload at least one file for item(s): ${itemNumbers}`)
        setLoading(false)
        return
      }

      // Validate event fields if event checkbox is checked
      if (isEvent) {
        if (!eventDate) {
          setError('Event date is required when event is checked')
          setLoading(false)
          return
        }
        if (!eventName || eventName.trim() === '') {
          setError('Event name is required when event is checked')
          setLoading(false)
          return
        }
        if (!fullEventBudget || fullEventBudget <= 0) {
          setError('Full event budget is required and must be greater than 0 when event is checked')
          setLoading(false)
          return
        }
        // Validate that items total equals full event budget
        const itemsTotalCents = Math.round(totalAmount * 100)
        const fullEventBudgetCents = Math.round(fullEventBudget * 100)
        if (itemsTotalCents !== fullEventBudgetCents) {
          setError(`Items total ($${totalAmount.toFixed(2)}) must equal the full event budget ($${fullEventBudget.toFixed(2)})`)
          setLoading(false)
          return
        }
      }

      // Upload new attachments per item
      const uploadedAttachments = []
      if (items.length > 0) {
        for (const item of items) {
          const files = itemAttachments[item.id] || []
          for (const file of files) {
            const uploadResult = await handleFileUpload(file)
            uploadedAttachments.push({
              ...uploadResult,
              itemId: item.id, // Will be set to the actual item ID after creation
            })
          }
          // Include existing attachments that weren't removed
          const existingAtts = existingItemAttachments[item.id] || []
          for (const existingAtt of existingAtts) {
            uploadedAttachments.push({
              publicId: existingAtt.publicId,
              secureUrl: existingAtt.secureUrl,
              mimeType: existingAtt.mimeType,
              itemId: item.id,
            })
          }
        }
      } else {
        // Non-itemized expense (backward compatibility)
        for (const file of nonItemizedAttachments) {
          const uploadResult = await handleFileUpload(file)
          uploadedAttachments.push({
            ...uploadResult,
            itemId: null, // No item ID for non-itemized
          })
        }
        // Include existing non-itemized attachments that weren't removed
        for (const existingAtt of existingNonItemizedAttachments) {
          uploadedAttachments.push({
            publicId: existingAtt.publicId,
            secureUrl: existingAtt.secureUrl,
            mimeType: existingAtt.mimeType,
            itemId: null,
          })
        }
      }

      // Create or update expense request
      const isEditing = !!editExpense
      const url = isEditing ? `/api/expenses/update` : '/api/expenses/create'
      const method = isEditing ? 'PUT' : 'POST'
      
      // Use first item's category for the expense request category (for backward compatibility)
      const expenseCategory = items[0]?.category || ''
      
      const requestBody: any = {
        title,
        amountCents: Math.round(totalAmount * 100),
        team,
        campus,
        description,
        category: expenseCategory,
        urgency,
        eventDate: eventDate || null,
        eventName: isEvent && eventName ? eventName : null,
        fullEventBudgetCents: isEvent && fullEventBudget > 0 ? Math.round(fullEventBudget * 100) : null,
        attachments: uploadedAttachments,
        items: items.map(item => {
          // Include item ID if it's an existing item (UUID format)
          // This helps the backend distinguish between existing and new items
          const itemData: any = {
            description: item.description,
            category: item.category || null,
            quantity: item.quantity,
            unitPriceCents: Math.round(item.unitPrice * 100),
            amountCents: Math.round(item.amount * 100),
          }
          // If item.id is a UUID (existing item from database), include it
          // UUIDs are 36 characters with dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
          if (item.id && item.id.length === 36 && item.id.includes('-')) {
            itemData.id = item.id
          }
          return itemData
        }),
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

  const removeExistingItemAttachment = (itemId: string, attachmentId: string) => {
    setExistingItemAttachments(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((att: any) => att.id !== attachmentId)
    }))
  }

  const removeNonItemizedAttachment = (index: number) => {
    setNonItemizedAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const removeExistingNonItemizedAttachment = (attachmentId: string) => {
    setExistingNonItemizedAttachments(prev => prev.filter((att: any) => att.id !== attachmentId))
  }

  const formContent = (
    <Card className={`w-full max-w-2xl ${noModal ? '' : 'max-h-[90vh]'} overflow-y-auto`}>
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
            {!noModal && (
              <Button variant="outline" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium mb-1">
                Reason for Payment *
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
              <label htmlFor="team" className="block text-sm font-medium mb-1">
                Team *
              </label>
              <select
                id="team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                Description (Give a detailed description of this payment including the purpose and value) *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                required
              />
            </div>

            <div>
              <label htmlFor="urgency" className="block text-sm font-medium mb-1">
                Urgency
              </label>
              <select
                id="urgency"
                value={urgency}
                onChange={(e) => setUrgency(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value={1}>Not Urgent (Few months)</option>
                <option value={2}>Urgent (This Month)</option>
                <option value={3}>Very Urgent (This week)</option>
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={isEvent}
                  onChange={(e) => {
                    setIsEvent(e.target.checked)
                    if (!e.target.checked) {
                      setEventDate('')
                      setEventName('')
                      setFullEventBudget(0)
                    }
                  }}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium">This is an event</span>
              </label>
            </div>

            {isEvent && (
              <>
                <div>
                  <label htmlFor="eventDate" className="block text-sm font-medium mb-1">
                    Event Date *
                  </label>
                  <input
                    id="eventDate"
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Event date is required for events
                  </p>
                </div>
                <div>
                  <label htmlFor="eventName" className="block text-sm font-medium mb-1">
                    Event Name *
                  </label>
                  <input
                    id="eventName"
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter event name"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Name of the event
                  </p>
                </div>
                <div>
                  <label htmlFor="fullEventBudget" className="block text-sm font-medium mb-1">
                    Full Event Budget ($) *
                  </label>
                  <input
                    id="fullEventBudget"
                    type="number"
                    step="0.01"
                    min="0"
                    value={fullEventBudget === 0 ? '' : fullEventBudget.toString()}
                    onChange={(e) => {
                      const value = e.target.value
                      const numericValue = value === '' ? 0 : parseFloat(value) || 0
                      setFullEventBudget(numericValue)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="0.00"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Total budget for the event. Items total must equal this amount.
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                Expense Items *
              </label>
              <div className="space-y-4">
                {items.map((item, index) => {
                  const newAttachments = itemAttachments[item.id] || []
                  const existingAttachments = existingItemAttachments[item.id] || []
                  const hasAttachments = newAttachments.length > 0 || existingAttachments.length > 0
                  return (
                  <div key={item.id} className={`border rounded-lg p-4 ${!hasAttachments ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">
                        Item {index + 1}
                        {!hasAttachments && <span className="text-red-500 ml-2 text-xs">(Attachment required)</span>}
                      </h4>
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
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Budget item name *
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                            placeholder="Budget item name"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Category *
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
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
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
                            required
                          />
                        </div>
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
                    
                    {/* Attachments for this item */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Attachments for this item <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        multiple
                        accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                        onChange={(e) => handleItemFileChange(item.id, e)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm ${
                          (!itemAttachments[item.id] || itemAttachments[item.id].length === 0) 
                            ? 'border-red-300 bg-red-50' 
                            : 'border-gray-300'
                        }`}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG, PDF, Excel, CSV, ODS. Max 10MB per file. <span className="text-red-500">At least one file is required.</span>
                      </p>
                      {/* Existing attachments */}
                      {existingItemAttachments[item.id] && existingItemAttachments[item.id].length > 0 && (
                        <div className="mt-2 space-y-1">
                          {existingItemAttachments[item.id].map((attachment: any) => (
                            <div key={attachment.id} className="flex items-center justify-between bg-blue-50 p-2 rounded text-xs border border-blue-200">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-3 h-3 text-blue-500" />
                                <a 
                                  href={attachment.secureUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  {attachment.secureUrl.split('/').pop() || 'View attachment'}
                                </a>
                                <span className="text-xs text-gray-500">(existing)</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeExistingItemAttachment(item.id, attachment.id)}
                                className="h-6 px-2"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* New file uploads */}
                      {itemAttachments[item.id] && itemAttachments[item.id].length > 0 && (
                        <div className="mt-2 space-y-1">
                          {itemAttachments[item.id].map((file, fileIndex) => (
                            <div key={fileIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-3 h-3 text-gray-500" />
                                <span className="text-xs">{file.name}</span>
                                <span className="text-xs text-gray-500">(new)</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeItemAttachment(item.id, fileIndex)}
                                className="h-6 px-2"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  className="w-full"
                >
                  + Add Another Item
                </Button>
              </div>
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className={`text-lg font-bold ${isEvent && fullEventBudget > 0 && Math.abs(totalAmount - fullEventBudget) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
                {isEvent && fullEventBudget > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Full Event Budget:</span>
                      <span className={`text-lg font-bold ${Math.abs(totalAmount - fullEventBudget) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                        ${fullEventBudget.toFixed(2)}
                      </span>
                    </div>
                    {Math.abs(totalAmount - fullEventBudget) > 0.01 && (
                      <div className="mt-1 text-sm text-red-600">
                        Difference: ${Math.abs(totalAmount - fullEventBudget).toFixed(2)} - Items total must equal full event budget
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* General attachments (for backward compatibility with non-itemized expenses) */}
            {items.length === 0 && (
              <div>
                <label htmlFor="attachments" className="block text-sm font-medium mb-1">
                  Attachments (Receipts and budget documents, etc.)
                </label>
                <input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,application/vnd.oasis.opendocument.spreadsheet,.xlsx,.xls,.csv,.ods"
                  onChange={handleNonItemizedFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Allowed formats: JPG, PNG, PDF, Excel (.xlsx, .xls), CSV, OpenDocument (.ods), and Google Sheets (export as Excel or CSV). Maximum size: 10MB per file.
                </p>
                {/* Existing non-itemized attachments */}
                {existingNonItemizedAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {existingNonItemizedAttachments.map((attachment: any) => (
                      <div key={attachment.id} className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <a 
                            href={attachment.secureUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {attachment.secureUrl.split('/').pop() || 'View attachment'}
                          </a>
                          <span className="text-xs text-gray-500">(existing)</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeExistingNonItemizedAttachment(attachment.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {/* New non-itemized file uploads */}
                {nonItemizedAttachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {nonItemizedAttachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">(new)</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNonItemizedAttachment(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
  )

  if (noModal) {
    return formContent
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {formContent}
    </div>
  )
}
