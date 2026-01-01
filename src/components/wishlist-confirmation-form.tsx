'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { ArrowLeft, Heart, CheckCircle, Loader2 } from 'lucide-react'
import { trackSubmitConfirmation } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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

interface WishlistConfirmationFormProps {
  item: WishlistItem
  maxQuantity: number
}

export function WishlistConfirmationForm({ item, maxQuantity }: WishlistConfirmationFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    quantity: 1,
    donorName: '',
    donorEmail: '',
    note: '',
    purchaseCompleted: false
  })

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.purchaseCompleted) {
      alert('Please confirm that you have completed your purchase.')
      return
    }

    if (formData.quantity < 1 || formData.quantity > maxQuantity) {
      alert(`Please enter a quantity between 1 and ${maxQuantity}.`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/dmv/wishlist/${item.id}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity: formData.quantity,
          donorName: formData.donorName || null,
          donorEmail: formData.donorEmail || null,
          note: formData.note || null,
        }),
      })

      if (response.ok) {
        // Track confirmation submission
        trackSubmitConfirmation(
          item.id,
          item.title,
          formData.quantity,
          formData.donorName,
          formData.donorEmail
        )

        // Redirect to thank you page
        router.push(`/dmv/${item.id}/thank-you`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit confirmation. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting confirmation:', error)
      alert('Failed to submit confirmation. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Button variant="ghost" asChild>
        <Link href={`/dmv/${item.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Item Details
        </Link>
      </Button>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Confirm Your Donation</h1>
        <p className="text-lg text-gray-600">
          Thank you for helping CCI DMV with <strong>{item.title}</strong>
        </p>
        <div className="text-xl font-semibold text-green-600 mt-2">
          {formatPrice(item.priceCents)} × {formData.quantity} = {formatPrice(item.priceCents * formData.quantity)}
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Donation Details
          </CardTitle>
          <CardDescription>
            Please provide details about your generous donation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">How many did you purchase? *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={maxQuantity}
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  quantity: parseInt(e.target.value) || 1
                }))}
                required
              />
              <p className="text-sm text-gray-600">
                Maximum available: {maxQuantity}
              </p>
            </div>

            {/* Donor Name */}
            <div className="space-y-2">
              <Label htmlFor="donorName">Your Name (Optional)</Label>
              <Input
                id="donorName"
                type="text"
                value={formData.donorName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  donorName: e.target.value
                }))}
                placeholder="Anonymous donor"
              />
            </div>

            {/* Donor Email */}
            <div className="space-y-2">
              <Label htmlFor="donorEmail">Your Email (Optional)</Label>
              <Input
                id="donorEmail"
                type="email"
                value={formData.donorEmail}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  donorEmail: e.target.value
                }))}
                placeholder="your.email@example.com"
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  note: e.target.value
                }))}
                placeholder="Any special instructions or notes for pickup/delivery..."
                rows={3}
              />
            </div>

            {/* Purchase Confirmation */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="purchaseCompleted"
                checked={formData.purchaseCompleted}
                onCheckedChange={(checked: CheckedState) =>
                  setFormData(prev => ({
                    ...prev,
                    purchaseCompleted: checked === true
                  }))
                }
              />
              <Label htmlFor="purchaseCompleted" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I confirm that I have completed my purchase *
              </Label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={loading || !formData.purchaseCompleted}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirm My Donation
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-sm">Your confirmation is recorded</p>
              <p className="text-xs text-gray-600">We'll mark this item as partially or fully fulfilled</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-xs">2</span>
            </div>
            <div>
              <p className="font-medium text-sm">We'll coordinate pickup/delivery</p>
              <p className="text-xs text-gray-600">Our team will reach out if we need delivery details</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600 font-semibold text-xs">3</span>
            </div>
            <div>
              <p className="font-medium text-sm">Thank you for your generosity!</p>
              <p className="text-xs text-gray-600">Your contribution helps build our community</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
