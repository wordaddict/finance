'use client'

import { useState, useEffect } from 'react'
import { Users, Calendar, User, Mail, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface WishlistConfirmation {
  id: string
  itemId: string
  quantity: number
  donorName: string | null
  donorEmail: string | null
  note: string | null
  createdAt: string
}

interface ConfirmationsListProps {
  itemId: string
}

export function ConfirmationsList({ itemId }: ConfirmationsListProps) {
  const [confirmations, setConfirmations] = useState<WishlistConfirmation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfirmations()
  }, [itemId])

  const fetchConfirmations = async () => {
    try {
      const response = await fetch(`/api/admin/wishlist/${itemId}/confirmations`)
      if (response.ok) {
        const data = await response.json()
        setConfirmations(data.confirmations)
      }
    } catch (error) {
      console.error('Failed to fetch confirmations:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalQuantity = confirmations.reduce((sum, conf) => sum + conf.quantity, 0)

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading confirmations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Confirmations</p>
              <p className="text-2xl font-bold text-blue-600">{confirmations.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Quantity</p>
              <p className="text-2xl font-bold text-green-600">{totalQuantity}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmations List */}
      {confirmations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No confirmations yet</h3>
            <p className="text-gray-600">When people donate this item, their confirmations will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {confirmations.map((confirmation) => (
            <Card key={confirmation.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      {confirmation.donorName || 'Anonymous Donor'}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(confirmation.createdAt)}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="ml-2">
                    {confirmation.quantity} item{confirmation.quantity > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Donor Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {confirmation.donorName && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Name:</span>
                      <span className="font-medium">{confirmation.donorName}</span>
                    </div>
                  )}

                  {confirmation.donorEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600">Email:</span>
                      <span className="font-medium">{confirmation.donorEmail}</span>
                    </div>
                  )}
                </div>

                {/* Note */}
                {confirmation.note && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Note:</p>
                        <p className="text-sm text-gray-600">{confirmation.note}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quantity Badge */}
                <div className="flex justify-end">
                  <Badge variant="secondary">
                    Quantity: {confirmation.quantity}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
