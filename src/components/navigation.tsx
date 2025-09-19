'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { SessionUser } from '@/lib/auth'
import { canManageUsers } from '@/lib/rbac'
import { LogOut, User, Settings, Menu, X, UserCircle } from 'lucide-react'
import Image from 'next/image'

interface NavigationProps {
  user: SessionUser
}

export function Navigation({ user }: NavigationProps) {
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <div className="flex items-center space-x-3">
              <Image
                src="/logo.svg"
                alt="Celebration Church America"
                width={40}
                height={40}
                className="h-8 w-auto sm:h-10"
              />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                <span className="hidden sm:inline">Expense Management</span>
                <span className="sm:hidden">Expenses</span>
              </h1>
            </div>
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
              <a
                href="/reports"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Reports
              </a>
              {canManageUsers(user) && (
                <a
                  href="/users"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Users
                </a>
              )}
              <a
                href="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
              >
                <UserCircle className="w-4 h-4" />
                Profile
              </a>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Mobile menu button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>

            {/* Desktop user info */}
            <div className="hidden lg:flex items-center space-x-2">
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
              <span className="hidden sm:inline">{loading ? 'Logging out...' : 'Logout'}</span>
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4 pt-4">
              {/* Mobile navigation links */}
              <div className="flex flex-col space-y-2">
                <a
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </a>
                <a
                  href="/expenses"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Expenses
                </a>
                <a
                  href="/reports"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reports
                </a>
                {canManageUsers(user) && (
                  <a
                    href="/users"
                    className="text-gray-600 hover:text-gray-900 transition-colors py-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Users
                  </a>
                )}
                <a
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </a>
              </div>
              
              {/* Mobile user info - hidden on md screens, shown on smaller screens */}
              <div className="flex md:hidden items-center space-x-2 pt-2 border-t border-gray-200">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {user.name || user.email}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {user.role}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
