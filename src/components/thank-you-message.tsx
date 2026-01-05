'use client'

import { useEffect, useState } from 'react'
import { Heart, Share2, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface ThankYouMessageProps {
  itemId: string
}

export function ThankYouMessage({ itemId }: ThankYouMessageProps) {
  const [itemTitle, setItemTitle] = useState<string>('')

  useEffect(() => {
    // Try to get item details from localStorage or fetch them
    const storedItem = localStorage.getItem(`wishlist_item_${itemId}`)
    if (storedItem) {
      try {
        const item = JSON.parse(storedItem)
        setItemTitle(item.title)
      } catch (error) {
        console.error('Error parsing stored item:', error)
      }
    }
  }, [itemId])

  const shareUrl = typeof window !== 'undefined' ? window.location.origin + '/dmv' : '/dmv'

  const handleShare = () => {
    const text = "I just helped CCI DMV with their building project! Check out their wish list and see how you can contribute too."
    const url = shareUrl

    if (navigator.share) {
      navigator.share({
        title: 'CCI DMV Building Wish List',
        text,
        url
      })
    } else {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(`${text} ${url}`)
      alert('Link copied to clipboard! Share it with your friends.')
    }
  }

  return (
    <div className="space-y-8">
      {/* Success header */}
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Thank You!</h1>
        <p className="text-xl text-gray-600">
          Your generous donation has been recorded and will help build CCI DMV&apos;s future.
        </p>
      </div>

      {/* Impact message */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            Your Impact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Every contribution, no matter the size, makes a real difference in our community.
            Your willingness to give helps create spaces where faith can grow and relationships can flourish.
          </p>

          {itemTitle && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>You helped with:</strong> {itemTitle}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">🙏</div>
              <p className="text-sm text-gray-600 mt-1">Faith</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">👥</div>
              <p className="text-sm text-gray-600 mt-1">Community</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">🏠</div>
              <p className="text-sm text-gray-600 mt-1">Future</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What happens next */}
      <Card>
        <CardHeader>
          <CardTitle>What Happens Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-xs">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">We&apos;ll update our records</p>
                <p className="text-xs text-gray-600">Your donation helps us track progress toward our goals</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-3 h-3 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Item marked as fulfilled</p>
                <p className="text-xs text-gray-600">We&apos;ll remove it from the active wish list when complete</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-xs">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">We&apos;ll reach out if needed</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Call to action */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold">Help Even More?</h3>
            <p className="text-gray-600">
              There are many other items on our wish list that still need help.
              Your continued support means the world to us.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link href="/dmv">
                  <Heart className="h-4 w-4 mr-2" />
                  See Other Needs
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>

              <Button variant="outline" size="lg" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share With Friends
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer message */}
      <div className="text-center text-gray-500 text-sm">
        <p>
          &quot;Each of you should give what you have decided in your heart to give,
          not reluctantly or under compulsion, for God loves a cheerful giver.&quot;
        </p>
        <p className="mt-1 font-medium">2 Corinthians 9:7</p>
      </div>
    </div>
  )
}
