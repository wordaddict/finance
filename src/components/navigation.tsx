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
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden flex-shrink-0 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="relative w-6 h-6 flex flex-col justify-center items-center">
                <span className={`block h-0.5 w-6 bg-gray-600 transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-1' : '-translate-y-1'}`} />
                <span className={`block h-0.5 w-6 bg-gray-600 transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`} />
                <span className={`block h-0.5 w-6 bg-gray-600 transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-1' : 'translate-y-1'}`} />
              </div>
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

        {/* Mobile/Tablet menu overlay */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            {/* Slide-out menu */}
            <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 xl:hidden transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <Image
                      src="/logo.svg"
                      alt="Celebration Church America"
                      width={32}
                      height={32}
                      className="h-8 w-auto"
                    />
                    <span className="font-semibold text-gray-900">Menu</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-200 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                {/* User profile section */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-sm text-gray-600 truncate">{user.email}</p>
                      <span className="inline-flex items-center px-2 py-1 mt-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Navigation links */}
                <div className="flex-1 overflow-y-auto">
                  <nav className="p-6 space-y-2">
                    <a
                      href="/"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <span className="text-green-600 font-semibold text-sm">$</span>
                      </div>
                      <span className="font-medium">Expenses</span>
                    </a>

                    <a
                      href="/dashboard"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                        <span className="text-blue-600 font-semibold text-sm">📊</span>
                      </div>
                      <span className="font-medium">Dashboard</span>
                    </a>

                    <a
                      href="/reports"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <span className="text-purple-600 font-semibold text-sm">📋</span>
                      </div>
                      <span className="font-medium">Reports</span>
                    </a>

                    {canManageUsers(user) && (
                      <a
                        href="/users"
                        className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium">Users</span>
                      </a>
                    )}

                    <a
                      href="/profile"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                        <UserCircle className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-medium">Profile</span>
                    </a>
                  </nav>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                  <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 py-3"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{loading ? 'Logging out...' : 'Logout'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </nav>
  )
}
