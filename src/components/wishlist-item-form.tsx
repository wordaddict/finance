'use client'

import { useState, useEffect } from 'react'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

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

interface WishlistItemFormProps {
  item?: WishlistItem | null
  onSuccess: () => void
  onCancel: () => void
}

const CATEGORIES = [
  'Furniture',
  'Audio',
  'Decor',
  'Kitchen',
  'Maintenance',
  'Music',
  'Safety',
  'Security',
  'Signage',
  'Storage',
  'Technology',
  'Other'
]

export function WishlistItemForm({ item, onSuccess, onCancel }: WishlistItemFormProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priceCents: 0,
    currency: 'USD',
    quantityNeeded: 1,
    purchaseUrl: '',
    imageUrl: '',
    priority: 1,
    isActive: true
  })

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        description: item.description || '',
        category: item.category || '',
        priceCents: item.priceCents,
        currency: item.currency,
        quantityNeeded: item.quantityNeeded,
        purchaseUrl: item.purchaseUrl,
        imageUrl: item.imageUrl || '',
        priority: item.priority,
        isActive: item.isActive
      })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.purchaseUrl.trim()) {
      alert('Title and purchase URL are required.')
      return
    }

    if (formData.priceCents <= 0) {
      alert('Price must be greater than 0.')
      return
    }

    if (formData.quantityNeeded <= 0) {
      alert('Quantity needed must be greater than 0.')
      return
    }

    setLoading(true)

    try {
      const url = item ? `/api/admin/wishlist/${item.id}` : '/api/admin/wishlist'
      const method = item ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          description: formData.description || null,
          category: formData.category || null,
          imageUrl: formData.imageUrl || null,
        }),
      })

      if (response.ok) {
        onSuccess()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save item. Please try again.')
      }
    } catch (error) {
      console.error('Error saving item:', error)
      alert('Failed to save item. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="e.g., Office Chair"
            required
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No category</SelectItem>
              {CATEGORIES.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={formData.priority.toString()}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priority: parseInt(value) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Low Priority</SelectItem>
              <SelectItem value="2">Medium Priority</SelectItem>
              <SelectItem value="3">High Priority</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="priceCents">Price (cents) *</Label>
          <Input
            id="priceCents"
            type="number"
            min="1"
            value={formData.priceCents}
            onChange={(e) => setFormData(prev => ({ ...prev, priceCents: parseInt(e.target.value) || 0 }))}
            placeholder="5000 (for $50.00)"
            required
          />
          <p className="text-xs text-gray-600">
            Enter price in cents (e.g., 5000 = $50.00)
          </p>
        </div>

        {/* Quantity Needed */}
        <div className="space-y-2">
          <Label htmlFor="quantityNeeded">Quantity Needed *</Label>
          <Input
            id="quantityNeeded"
            type="number"
            min="1"
            value={formData.quantityNeeded}
            onChange={(e) => setFormData(prev => ({ ...prev, quantityNeeded: parseInt(e.target.value) || 1 }))}
            required
          />
        </div>

        {/* Purchase URL */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="purchaseUrl">Purchase URL *</Label>
          <Input
            id="purchaseUrl"
            type="url"
            value={formData.purchaseUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, purchaseUrl: e.target.value }))}
            placeholder="https://amazon.com/example-product"
            required
          />
          <p className="text-xs text-gray-600">
            Link to where people can purchase this item
          </p>
        </div>

        {/* Image URL */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            type="url"
            value={formData.imageUrl}
            onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
            placeholder="https://example.com/image.jpg"
          />
          <p className="text-xs text-gray-600">
            Optional: Link to an image of the item
          </p>
        </div>

        {/* Description */}
        <div className="md:col-span-2 space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe the item and why it's needed..."
            rows={3}
          />
        </div>

        {/* Active Status */}
        <div className="md:col-span-2 flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked: CheckedState) =>
              setFormData(prev => ({ ...prev, isActive: checked === true }))
            }
          />
          <Label htmlFor="isActive" className="text-sm font-medium">
            Item is active (visible on wish list)
          </Label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {item ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            item ? 'Update Item' : 'Create Item'
          )}
        </Button>
      </div>
    </form>
  )
}
