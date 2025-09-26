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
          {/* Logo and title section */}
          <div className="flex items-center space-x-3 lg:space-x-6 min-w-0 flex-shrink-0">
            <div className="flex items-center space-x-2 lg:space-x-3">
              <Image
                src="/logo.svg"
                alt="Celebration Church America"
                width={40}
                height={40}
                className="h-8 w-auto lg:h-10 flex-shrink-0"
              />
              <h1 className="text-sm sm:text-base lg:text-xl font-bold text-gray-900 truncate">
                <span className="hidden sm:inline">Expense Management</span>
                <span className="sm:hidden">Expenses</span>
              </h1>
            </div>
            
            {/* Navigation links - hidden on tablet, shown on desktop */}
            <div className="hidden xl:flex space-x-4">
              <a
                href="/"
                className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                Expenses
              </a>
              <a
                href="/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                Dashboard
              </a>
              <a
                href="/reports"
                className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
              >
                Reports
              </a>
              {canManageUsers(user) && (
                <a
                  href="/users"
                  className="text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap"
                >
                  Users
                </a>
              )}
              <a
                href="/profile"
                className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <UserCircle className="w-4 h-4" />
                Profile
              </a>
            </div>
          </div>
          
          {/* Right side actions */}
          <div className="flex items-center space-x-2 lg:space-x-3 min-w-0 flex-shrink-0">
            {/* User info - shown on desktop, hidden on smaller screens */}
            <div className="hidden lg:flex items-center space-x-2 min-w-0">
              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-700 truncate max-w-32">
                {user.name || user.email}
              </span>
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0">
                {user.role}
              </span>
            </div>
            
            {/* Mobile/tablet menu button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden flex-shrink-0"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
            
            {/* Logout button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={loading}
              className="flex items-center space-x-1 lg:space-x-2 flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">{loading ? 'Logging out...' : 'Logout'}</span>
            </Button>
          </div>
        </div>

        {/* Mobile/Tablet menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden mt-4 pb-4 border-t border-gray-200">
            <div className="flex flex-col space-y-4 pt-4">
              {/* Navigation links */}
              <div className="flex flex-col space-y-2">
                <a
                  href="/"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2 px-1 rounded-md hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Expenses
                </a>
                <a
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2 px-1 rounded-md hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </a>
                <a
                  href="/reports"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2 px-1 rounded-md hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Reports
                </a>
                {canManageUsers(user) && (
                  <a
                    href="/users"
                    className="text-gray-600 hover:text-gray-900 transition-colors py-2 px-1 rounded-md hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Users
                  </a>
                )}
                <a
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900 transition-colors py-2 px-1 rounded-md hover:bg-gray-50 flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </a>
              </div>
              
              {/* User info - shown on all screens when menu is open */}
              <div className="flex items-center space-x-2 pt-2 border-t border-gray-200">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700 truncate">
                  {user.name || user.email}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap">
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
