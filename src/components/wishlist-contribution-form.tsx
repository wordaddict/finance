'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CheckedState } from '@radix-ui/react-checkbox'
import { ArrowLeft, Heart, CheckCircle, Loader2 } from 'lucide-react'
import { trackSubmitContribution } from '@/lib/analytics'
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
  priceCents: number
  goalCents: number
  confirmedValueCents: number
  remainingValueCents: number
}

interface WishlistContributionFormProps {
  item: WishlistItem
}

export function WishlistContributionForm({ item }: WishlistContributionFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    amountDollars: Math.max(0.01, Math.min(item.remainingValueCents, item.priceCents) / 100),
    donorName: '',
    donorEmail: '',
    note: '',
    purchaseCompleted: false
  })

  const formatPrice = (priceCents: number) => `$${(priceCents / 100).toFixed(2)}`
  const formatDollars = (value: number) => `$${value.toFixed(2)}`
  const amountCents = Math.round((formData.amountDollars || 0) * 100)
  const remainingAfterGiftCents = Math.max(0, item.remainingValueCents - amountCents)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.purchaseCompleted) {
      alert('Please confirm that you have completed your contribution.')
      return
    }

    if (amountCents < 1) {
      alert('Please enter at least $0.01.')
      return
    }

    if (amountCents > item.remainingValueCents) {
      alert(`Please enter ${formatPrice(item.remainingValueCents)} or less for this item.`)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/dmv/wishlist/${item.id}/contribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountCents,
          donorName: formData.donorName || null,
          donorEmail: formData.donorEmail || null,
          note: formData.note || null,
        }),
      })

      if (response.ok) {
        trackSubmitContribution(
          item.id,
          item.title,
          amountCents,
          formData.donorName,
          formData.donorEmail
        )

        router.push(`/dmv/${item.id}/thank-you`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit contribution. Please try again.')
      }
    } catch (error) {
      console.error('Error submitting contribution:', error)
      alert('Failed to submit contribution. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" asChild>
        <Link href={`/dmv/${item.id}`}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Item Details
        </Link>
      </Button>

      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contribute toward this goal</h1>
        <p className="text-lg text-gray-600">
          Help fund <strong>{item.title}</strong>
        </p>
        <div className="text-xl font-semibold text-green-600 mt-2">
          Remaining need: {formatPrice(item.remainingValueCents)} of {formatPrice(item.goalCents)}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Contribution Details
          </CardTitle>
          <CardDescription>
            Record your gift so we can track progress toward this item.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="amountDollars">Contribution amount (in dollars) *</Label>
              <Input
                id="amountDollars"
                type="number"
                min={0.01}
                step="0.01"
                max={item.remainingValueCents / 100}
                value={formData.amountDollars}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  amountDollars: parseFloat(e.target.value) || 0
                }))}
                required
              />
              <p className="text-sm text-gray-600">
                Remaining need: {formatPrice(item.remainingValueCents)}
              </p>
              <p className="text-sm text-gray-700">
                After this gift: {formatPrice(remainingAfterGiftCents)}
              </p>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={formData.note}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  note: e.target.value
                }))}
                rows={3}
              />
            </div>

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
                I confirm that I have completed my contribution via Tithely *
              </Label>
            </div>

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
                  Record My Contribution
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

