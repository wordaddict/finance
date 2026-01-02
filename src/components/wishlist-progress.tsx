'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

interface WishlistItem {
  goalCents: number
  confirmedValueCents: number
}

export function WishlistProgress() {
  const [totalValueCents, setTotalValueCents] = useState(0)
  const [totalGivenCents, setTotalGivenCents] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTotals()
    const interval = setInterval(fetchTotals, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchTotals = async () => {
    try {
      const response = await fetch('/api/dmv/wishlist')
      if (!response.ok) {
        return
      }
      const data = await response.json()
      const items: WishlistItem[] = data.items || []

      const totalValue = items.reduce(
        (sum, item) => sum + item.goalCents,
        0
      )
      const totalGiven = items.reduce(
        (sum, item) => sum + item.confirmedValueCents,
        0
      )

      setTotalValueCents(totalValue)
      setTotalGivenCents(totalGiven)
    } catch (error) {
      console.error('Failed to fetch wishlist totals:', error)
    } finally {
      setLoading(false)
    }
  }

  const progressPercent =
    totalValueCents === 0
      ? 0
      : Math.min(100, Math.round((totalGivenCents / totalValueCents) * 100))
  const remainingCents = Math.max(0, totalValueCents - totalGivenCents)

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Giving Progress</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? 'Loading...' : `${formatCurrency(totalGivenCents)} raised`}
            </p>
            <p className="text-sm text-gray-600">
              {loading
                ? 'Calculating goal...'
                : `of ${formatCurrency(totalValueCents)} goal • ${progressPercent}% funded`}
            </p>
          </div>
          <div className="text-sm text-gray-600">
            {loading
              ? '...'
              : remainingCents > 0
                ? `${formatCurrency(remainingCents)} remaining`
                : 'Goal met'}
          </div>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}

