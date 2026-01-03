'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, Heart, Package, ExternalLink } from 'lucide-react'
import { trackViewList } from '@/lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  contributedCents: number
  goalCents: number
  confirmedValueCents: number
  remainingValueCents: number
  allowContributions: boolean
  purchaseUrl: string
  imageUrl: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function WishlistList() {
  const router = useRouter()
  const [items, setItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    fetchItems()
    // Track list view
    trackViewList()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await fetch('/api/dmv/wishlist')
      if (response.ok) {
        const data = await response.json()
        setItems(data.items)
      }
    } catch (error) {
      console.error('Failed to fetch wishlist items:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(2)}`
  }

  const isItemAvailable = (item: WishlistItem) => {
    return item.isActive && item.remainingValueCents > 0
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)))

  // Filter items based on search and filters
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) ||
                         item.description?.toLowerCase().includes(search.toLowerCase()) ||
                         item.category?.toLowerCase().includes(search.toLowerCase())

    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter

    const matchesPriority = priorityFilter === 'all' || item.priority.toString() === priorityFilter

    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'available' && isItemAvailable(item)) ||
                         (statusFilter === 'fulfilled' && !isItemAvailable(item))

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading wish list...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative z-20">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-44 rounded-xl">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={6}
                className="z-50 rounded-2xl shadow-2xl border border-gray-200 bg-white min-w-[240px] max-h-64 overflow-auto"
              >
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={6}
                className="z-50 rounded-2xl shadow-2xl border border-gray-200 bg-white min-w-[200px] max-h-64 overflow-auto"
              >
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="3">High Priority</SelectItem>
                <SelectItem value="2">Medium Priority</SelectItem>
                <SelectItem value="1">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent
                position="popper"
                align="start"
                sideOffset={6}
                className="z-50 rounded-2xl shadow-2xl border border-gray-200 bg-white min-w-[180px] max-h-64 overflow-auto"
              >
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Still Needed</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Showing {filteredItems.length} of {items.length} items
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const remainingQuantity = Math.max(0, item.quantityNeeded - item.quantityConfirmed)
            const isAvailable = isItemAvailable(item)
            const progressPercent = item.goalCents === 0
              ? 0
              : Math.min(100, Math.round((item.confirmedValueCents / item.goalCents) * 100))

            return (
              <Card
                key={item.id}
                className={`overflow-hidden rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer ${!isAvailable ? 'opacity-60' : ''}`}
                role="link"
                tabIndex={0}
                onClick={() => router.push(`/dmv/${item.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    router.push(`/dmv/${item.id}`)
                  }
                }}
              >
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
                  {/* Priority badge removed per request */}
                </div>

                <CardHeader className="pb-2">
                  <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
                  <CardDescription>
                    {item.description || 'No description available'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-green-600">
                      {formatPrice(item.priceCents)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {remainingQuantity} of {item.quantityNeeded} needed
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-700">
                      <span>{formatPrice(item.confirmedValueCents)} raised</span>
                      <span>of {formatPrice(item.goalCents)} goal</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">
                      {item.remainingValueCents > 0
                        ? `${formatPrice(item.remainingValueCents)} still needed`
                        : 'Fully funded'}
                    </p>
                  </div>

                  {item.category && (
                    <Badge variant="outline" className="rounded-full px-3">
                      {item.category}
                    </Badge>
                  )}

                  <div className="flex gap-2">
                    <Button
                      asChild
                      className="flex-1 rounded-full"
                      disabled={!isAvailable}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link href={`/dmv/${item.id}`}>
                        <Heart className="h-4 w-4 mr-2" />
                        {isAvailable ? 'Give To This' : 'Fulfilled'}
                      </Link>
                    </Button>

                    {isAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <a
                          href="https://give.tithe.ly/?formId=9cc2d2c8-2923-48ce-b743-b3b1dbd16ad6&locationId=0cc1e1b0-39c8-45b6-b3e0-70567eb2d7f1&fundId=d7d374b5-1fd6-4979-82de-d97c53234e40"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-500 text-center">
        Disclaimer: While you may give toward a specific item, the church reserves the right to
        redirect funds based on priority so needs are met. We remain committed to completing the
        item you selected as resources allow.
      </p>
    </div>
  )
}
