'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Heart, Package, DollarSign, ExternalLink } from 'lucide-react'
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
  purchaseUrl: string
  imageUrl: string | null
  priority: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export function WishlistList() {
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

  const getRemainingQuantity = (item: WishlistItem) => {
    return Math.max(0, item.quantityNeeded - item.quantityConfirmed)
  }

  const isItemAvailable = (item: WishlistItem) => {
    return item.isActive && getRemainingQuantity(item) > 0
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
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category!}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="3">High Priority</SelectItem>
                <SelectItem value="2">Medium Priority</SelectItem>
                <SelectItem value="1">Low Priority</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="available">Still Needed</SelectItem>
                <SelectItem value="fulfilled">Fulfilled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
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
            const remaining = getRemainingQuantity(item)
            const isAvailable = isItemAvailable(item)

            return (
              <Card key={item.id} className={`overflow-hidden ${!isAvailable ? 'opacity-60' : ''}`}>
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
                  <div className="absolute top-2 right-2">
                    {getPriorityBadge(item.priority)}
                  </div>
                </div>

                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription>
                    {item.description || 'No description available'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {formatPrice(item.priceCents)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {remaining} of {item.quantityNeeded} needed
                    </div>
                  </div>

                  {item.category && (
                    <Badge variant="outline">{item.category}</Badge>
                  )}

                  <div className="flex gap-2">
                    <Button
                      asChild
                      className="flex-1"
                      disabled={!isAvailable}
                    >
                      <Link href={`/dmv/${item.id}`}>
                        <Heart className="h-4 w-4 mr-2" />
                        {isAvailable ? 'Give This' : 'Fulfilled'}
                      </Link>
                    </Button>

                    {isAvailable && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={item.purchaseUrl}
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
    </div>
  )
}
