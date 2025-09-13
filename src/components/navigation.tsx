'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SessionUser } from '@/lib/auth'
import { LogOut, User, Settings } from 'lucide-react'

interface NavigationProps {
  user: SessionUser
}

export function Navigation({ user }: NavigationProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-gray-900">
              CCI America Expense App
            </h1>
            <div className="hidden md:flex space-x-6">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Dashboard
              </a>
              <a
                href="/expenses"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Expenses
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {user.name || user.email}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {user.role}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? 'Logging out...' : 'Logout'}</span>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
