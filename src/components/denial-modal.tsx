'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { X } from 'lucide-react'

interface DenialModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  expenseTitle: string
}

export function DenialModal({ isOpen, onClose, onConfirm, expenseTitle }: DenialModalProps) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return

    setLoading(true)
    try {
      await onConfirm(reason.trim())
      setReason('')
      onClose()
    } catch (error) {
      console.error('Failed to deny expense:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReason('')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Deny Expense Request
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
              You are about to deny the following expense request:
            </p>
            <p className="font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-200">
              {expenseTitle}
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Reason for denial *
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for denying this expense request..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This reason will be sent to the requester via email.
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
              disabled={loading || !reason.trim()}
            >
              {loading ? 'Denying...' : 'Deny Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
