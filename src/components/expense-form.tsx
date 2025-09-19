'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SessionUser } from '@/lib/auth'
import { X, Upload, FileText } from 'lucide-react'
import { TEAMS, TEAM_DISPLAY_NAMES, CAMPUSES, CAMPUS_DISPLAY_NAMES, URGENCY_DISPLAY_NAMES, EXPENSE_CATEGORY_VALUES } from '@/lib/constants'

// Teams are now defined as constants

interface ExpenseFormProps {
  user: SessionUser
  onClose: () => void
}

export function ExpenseForm({ user, onClose }: ExpenseFormProps) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [team, setTeam] = useState('ADMIN')
  const [campus, setCampus] = useState('DMV')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [urgency, setUrgency] = useState(2)
  const [eventDate, setEventDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attachments, setAttachments] = useState<File[]>([])

  // Teams are now enums, no need to fetch them

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
      // Upload attachments
      const uploadedAttachments = []
      for (const file of attachments) {
        const uploadResult = await handleFileUpload(file)
        uploadedAttachments.push(uploadResult)
      }

      // Create expense request
      const response = await fetch('/api/expenses/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          amountCents: Math.round(parseFloat(amount) * 100),
          team,
          campus,
          description,
          category,
          urgency,
          eventDate: eventDate || null,
          attachments: uploadedAttachments,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        onClose()
        // Refresh the page to show the new expense
        window.location.reload()
      } else {
        setError(data.error || 'Failed to create expense request')
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
              <CardTitle className="text-lg sm:text-xl">Create New Expense Request</CardTitle>
              <CardDescription className="text-sm">
                Submit a new expense request for approval
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <label htmlFor="amount" className="block text-sm font-medium mb-1">
                  Amount ($) *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999.99"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
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
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Allowed formats: JPG, PNG, PDF. Maximum size: 10MB per file.
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
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Expense Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
