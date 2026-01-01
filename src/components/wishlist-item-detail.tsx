'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Heart, DollarSign, Package, ExternalLink, Users, CheckCircle } from 'lucide-react'
import { trackViewItem, trackClickGiveLink } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

interface WishlistItemDetailProps {
  item: WishlistItem
}

export function WishlistItemDetail({ item }: WishlistItemDetailProps) {
  const [analyticsSent, setAnalyticsSent] = useState(false)

  useEffect(() => {
    // Track item view
    trackViewItem(item.id, item.title)
  }, [item.id, item.title])

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

  const getRemainingQuantity = () => {
    return Math.max(0, item.quantityNeeded - item.quantityConfirmed)
  }

  const isItemAvailable = () => {
    return item.isActive && getRemainingQuantity() > 0
  }

  const handlePurchaseLinkClick = () => {
    // Track give link click
    if (!analyticsSent) {
      trackClickGiveLink(item.id, item.title)
      setAnalyticsSent(true)
    }
  }

  const remaining = getRemainingQuantity()
  const isAvailable = isItemAvailable()

  return (
    <div className="space-y-8">
      {/* Back button */}
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dmv">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Wish List
        </Link>
      </Button>

      {/* Item header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.title}</h1>
        <div className="flex justify-center gap-2 mb-4">
          {/* Priority badge removed per request */}
          {item.category && <Badge variant="outline">{item.category}</Badge>}
        </div>
        <div className="text-2xl font-semibold text-green-600 mb-2">
          {formatPrice(item.priceCents)}
        </div>
        <div className="text-lg text-gray-600">
          {remaining} of {item.quantityNeeded} still needed
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video relative bg-gray-100 rounded-lg overflow-hidden">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress indicator */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Confirmed donations:</span>
                  <span className="font-medium">{item.quantityConfirmed}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Still needed:</span>
                  <span className="font-medium">{remaining}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (item.quantityConfirmed / item.quantityNeeded) * 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600">
                  {item.quantityConfirmed === 0
                    ? "Be the first to donate this item!"
                    : `${item.quantityConfirmed} generous donation${item.quantityConfirmed > 1 ? 's' : ''} so far!`
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Details and actions */}
        <div className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {item.description || 'No description available for this item.'}
              </CardDescription>
            </CardContent>
          </Card>

          {/* Action buttons */}
          <Card>
            <CardHeader>
              <CardTitle>How to Help</CardTitle>
              <CardDescription>
                Follow these simple steps to donate this item
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium">Purchase the item</p>
                  <p className="text-sm text-gray-600">
                    Click the purchase button below to buy from our recommended retailer
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium">Complete your purchase</p>
                  <p className="text-sm text-gray-600">
                    Complete the transaction on the retailer&apos;s website
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium">Confirm your donation</p>
                  <p className="text-sm text-gray-600">
                    Come back here and click &quot;I gave this&quot; to let us know
                  </p>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  asChild
                  size="lg"
                  className="w-full"
                  disabled={!isAvailable}
                  onClick={handlePurchaseLinkClick}
                >
                  <a
                    href={item.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <DollarSign className="h-5 w-5" />
                    Purchase on {new URL(item.purchaseUrl).hostname}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="w-full"
                  disabled={!isAvailable}
                >
                  <Link href={`/dmv/${item.id}/confirm`}>
                    <Heart className="h-5 w-5 mr-2" />
                    I Gave This
                  </Link>
                </Button>

                {!isAvailable && (
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">This item has been fulfilled! Thank you to all who contributed.</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Share */}
          <Card>
            <CardHeader>
              <CardTitle>Share This Need</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-3">
                Know someone who might want to help? Share this item with them.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: `${item.title} - CCI DMV Building Wish List`,
                      text: `Help CCI DMV by donating ${item.title} for $${(item.priceCents / 100).toFixed(2)}`,
                      url: window.location.href
                    })
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                    alert('Link copied to clipboard!')
                  }
                }}
              >
                Share Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
