'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { X } from 'lucide-react'

interface ReportDenialModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (comment: string) => void
  reportTitle: string
}

export function ReportDenialModal({ isOpen, onClose, onConfirm, reportTitle }: ReportDenialModalProps) {
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comment.trim()) return

    setLoading(true)
    try {
      await onConfirm(comment.trim())
      setComment('')
      onClose()
    } catch (error) {
      console.error('Failed to deny report:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setComment('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Deny Expense Report
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              You are about to deny the following expense report:
            </p>
            <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {reportTitle}
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for denial *
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Please provide a reason for denying this expense report..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This comment will be recorded with the denial.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={loading || !comment.trim()}
            >
              {loading ? 'Denying...' : 'Deny Report'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

