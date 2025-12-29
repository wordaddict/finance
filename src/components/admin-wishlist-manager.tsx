'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Eye, Package, Users, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { WishlistItemForm } from '@/components/wishlist-item-form'
import { ConfirmationsList } from '@/components/confirmations-list'
import Image from 'next/image'
import Link from 'next/link'

interface WishlistItem {
  id: string
  title: string
  description: string | null
  category: string | null
  priceCents: number
  currency: string
  quantityNeeded: number
  quantityConfirmed: number
  purchaseUrl: string
  imageUrl: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function AdminWishlistManager() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isConfirmationsOpen, setIsConfirmationsOpen] = useState(false)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/admin/wishlist')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`
  }

  const getPriorityBadge = (priority: number) => {
    const variants = {
      3: 'destructive',
      2: 'default',
      1: 'secondary'
    } as const

    const labels = {
      3: 'High Priority',
      2: 'Medium Priority',
      1: 'Low Priority'
    }

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {labels[priority as keyof typeof labels] || 'Low Priority'}
      </Badge>
    )
  }

  const getStatusBadge = (item: WishlistItem) => {
    const remaining = Math.max(0, item.quantityNeeded - item.quantityConfirmed)

    if (!item.isActive) {
      return <Badge variant="outline">Inactive</Badge>
    }

    if (remaining <= 0) {
      return <Badge variant="secondary">Fulfilled</Badge>
    }

    return <Badge variant="default">Active</Badge>
  }

  const handleCreateItem = () => {
    setSelectedItem(null)
    setIsFormOpen(true)
  }

  const handleEditItem = (item: WishlistItem) => {
    setSelectedItem(item)
    setIsFormOpen(true)
  }

  const handleViewConfirmations = (item: WishlistItem) => {
    setSelectedItem(item)
    setIsConfirmationsOpen(true)
  }

  const handleDeleteItem = async (item: WishlistItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/wishlist/${item.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setItems(items.filter(i => i.id !== item.id))
      } else {
        alert('Failed to delete item. Please try again.')
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item. Please try again.')
    }
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    fetchItems()
  }

  const totalItems = items.length
  const activeItems = items.filter(item => item.isActive).length
  const fulfilledItems = items.filter(item => item.quantityConfirmed >= item.quantityNeeded).length
  const totalValue = items.reduce((sum, item) => sum + (item.priceCents * item.quantityNeeded), 0) / 100

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading wish list items...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-gray-900">{activeItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fulfilled</p>
                <p className="text-2xl font-bold text-gray-900">{fulfilledItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">All Items</h2>
        <Button onClick={handleCreateItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Item
        </Button>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No wish list items yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first item to the wish list.</p>
            <Button onClick={handleCreateItem}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Item
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const remaining = Math.max(0, item.quantityNeeded - item.quantityConfirmed)

            return (
              <Card key={item.id} className={`overflow-hidden ${!item.isActive ? 'opacity-60' : ''}`}>
                <div className="aspect-video relative bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
                    {getStatusBadge(item)}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {item.description || 'No description'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-green-600">
                      {formatPrice(item.priceCents)}
                    </span>
                    <span className="text-gray-600">
                      {remaining} of {item.quantityNeeded} needed
                    </span>
                  </div>

                  <div className="flex gap-1">
                    {getPriorityBadge(item.priority)}
                    {item.category && <Badge variant="outline">{item.category}</Badge>}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewConfirmations(item)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      {item.quantityConfirmed}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <Link href={`/dmv/${item.id}`} target="_blank">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteItem(item)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Item Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? 'Edit Wish List Item' : 'Add New Wish List Item'}
            </DialogTitle>
            <DialogDescription>
              {selectedItem
                ? 'Update the details for this wish list item.'
                : 'Create a new item for the building wish list.'
              }
            </DialogDescription>
          </DialogHeader>
          <WishlistItemForm
            item={selectedItem}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmations Dialog */}
      <Dialog open={isConfirmationsOpen} onOpenChange={setIsConfirmationsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Donation Confirmations - {selectedItem?.title}
            </DialogTitle>
            <DialogDescription>
              View all donation confirmations for this item.
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <ConfirmationsList itemId={selectedItem.id} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
