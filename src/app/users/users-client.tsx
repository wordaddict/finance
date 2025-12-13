'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { canManageUsers } from '@/lib/rbac'
import { formatRoleName } from '@/lib/utils'
import { CAMPUS_DISPLAY_NAMES } from '@/lib/constants'
import { Check, X, UserX, Eye, EyeOff, Filter } from 'lucide-react'
import { ConfirmationModal } from '@/components/confirmation-modal'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  campus: string
  createdAt: string
}

interface UsersPageClientProps {
  user: any
}

export default function UsersPageClient({ user }: UsersPageClientProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionLoading, setActionLoading] = useState<{
    userId: string | null
    action: 'approve' | 'deny' | 'suspend' | null
  }>({
    userId: null,
    action: null,
  })
  const [denyModal, setDenyModal] = useState<{
    isOpen: boolean
    userId: string | null
    userName: string | null
    reason: string
  }>({
    isOpen: false,
    userId: null,
    userName: null,
    reason: '',
  })

  const [approveModal, setApproveModal] = useState<{
    isOpen: boolean
    userId: string | null
    userName: string | null
    reason: string
  }>({
    isOpen: false,
    userId: null,
    userName: null,
    reason: '',
  })

  const [suspendModal, setSuspendModal] = useState<{
    isOpen: boolean
    userId: string | null
    userName: string | null
    reason: string
  }>({
    isOpen: false,
    userId: null,
    userName: null,
    reason: '',
  })

  useEffect(() => {
    fetchUsers()
  }, [statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter) {
        params.append('status', statusFilter)
      }
      
      const response = await fetch(`/api/users?${params.toString()}`)
      const data = await response.json()
      
      if (response.ok) {
        setUsers(data.users)
      } else {
        setError(data.error || 'Failed to fetch users')
      }
    } catch (error) {
      setError('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const openApproveModal = (userId: string, userName: string | null) => {
    setApproveModal({
      isOpen: true,
      userId,
      userName,
      reason: '',
    })
  }

  const closeApproveModal = () => {
    setApproveModal({
      isOpen: false,
      userId: null,
      userName: null,
      reason: '',
    })
  }

  const handleApprove = async () => {
    if (!approveModal.userId) return

    try {
      setActionLoading({ userId: approveModal.userId, action: 'approve' })
      const response = await fetch('/api/users/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: approveModal.userId,
          reason: approveModal.reason || undefined
        }),
      })

      if (response.ok) {
        await fetchUsers() // Refresh the list
        closeApproveModal()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to approve user')
      }
    } catch (error) {
      setError('Failed to approve user')
    } finally {
      setActionLoading({ userId: null, action: null })
    }
  }

  const openSuspendModal = (userId: string, userName: string | null) => {
    setSuspendModal({
      isOpen: true,
      userId,
      userName,
      reason: '',
    })
  }

  const closeSuspendModal = () => {
    setSuspendModal({
      isOpen: false,
      userId: null,
      userName: null,
      reason: '',
    })
  }

  const handleSuspend = async () => {
    if (!suspendModal.userId) return

    try {
      setActionLoading({ userId: suspendModal.userId, action: 'suspend' })
      const response = await fetch('/api/users/suspend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: suspendModal.userId,
          reason: suspendModal.reason
        }),
      })

      if (response.ok) {
        await fetchUsers() // Refresh the list
        closeSuspendModal()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to suspend user')
      }
    } catch (error) {
      setError('Failed to suspend user')
    } finally {
      setActionLoading({ userId: null, action: null })
    }
  }

  const openDenyModal = (userId: string, userName: string | null) => {
    setDenyModal({
      isOpen: true,
      userId,
      userName,
      reason: '',
    })
  }

  const closeDenyModal = () => {
    setDenyModal({
      isOpen: false,
      userId: null,
      userName: null,
      reason: '',
    })
  }

  const handleDeny = async () => {
    if (!denyModal.userId) return

    try {
      setActionLoading({ userId: denyModal.userId, action: 'deny' })
      const response = await fetch('/api/users/deny', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: denyModal.userId,
          reason: denyModal.reason
        }),
      })

      if (response.ok) {
        await fetchUsers() // Refresh the list
        closeDenyModal()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to deny user')
      }
    } catch (error) {
      setError('Failed to deny user')
    } finally {
      setActionLoading({ userId: null, action: null })
    }
  }


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800'
      case 'SUSPENDED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800'
      case 'CAMPUS_PASTOR':
        return 'bg-blue-100 text-blue-800'
      case 'LEADER':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getCampusColor = () => 'bg-indigo-100 text-indigo-800'

  const formatCampusName = (campus: string) =>
    CAMPUS_DISPLAY_NAMES[campus as keyof typeof CAMPUS_DISPLAY_NAMES] ||
    campus.replace(/_/g, ' ')

  if (!canManageUsers(user)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don&apos;t have permission to manage users.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
              <p className="text-gray-500 text-sm sm:text-base">
                Manage user accounts and permissions
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium mb-1">
                    Status
                  </label>
                  <select
                    id="status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Message */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <p className="text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setError('')}
                  className="mt-2"
                >
                  Dismiss
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          {loading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">Loading users...</p>
              </CardContent>
            </Card>
          ) : users.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-gray-600">No users found.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {users.map((userItem) => (
                <Card key={userItem.id}>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          <div>
                            <h3 className="text-base sm:text-lg font-semibold">
                              {userItem.name || 'No name provided'}
                            </h3>
                            <p className="text-sm text-gray-600">{userItem.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(userItem.status)}`}>
                              {userItem.status.replace('_', ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userItem.role)}`}>
                              {formatRoleName(userItem.role)}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCampusColor()}`}>
                              {formatCampusName(userItem.campus)}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Registered: {new Date(userItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2">
                        {userItem.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              onClick={() => openApproveModal(userItem.id, userItem.name)}
                              disabled={actionLoading.userId === userItem.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              {actionLoading.userId === userItem.id && actionLoading.action === 'approve' ? 'Approving...' : 'Approve'}
                            </Button>
                            <Button
                              onClick={() => openDenyModal(userItem.id, userItem.name)}
                              disabled={actionLoading.userId === userItem.id}
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              size="sm"
                            >
                              <X className="w-4 h-4 mr-1" />
                              {actionLoading.userId === userItem.id && actionLoading.action === 'deny' ? 'Denying...' : 'Deny'}
                            </Button>
                          </>
                        )}
                        
                        {userItem.status === 'ACTIVE' && userItem.id !== user.id && (
                          <Button
                            onClick={() => openSuspendModal(userItem.id, userItem.name)}
                            disabled={actionLoading.userId === userItem.id}
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            size="sm"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            {actionLoading.userId === userItem.id && actionLoading.action === 'suspend' ? 'Suspending...' : 'Suspend'}
                          </Button>
                        )}
                        
                        {userItem.status === 'SUSPENDED' && (
                          <Button
                            onClick={() => openApproveModal(userItem.id, userItem.name)}
                            disabled={actionLoading.userId === userItem.id}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {actionLoading.userId === userItem.id && actionLoading.action === 'approve' ? 'Reactivating...' : 'Reactivate'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {approveModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Approve User</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeApproveModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {approveModal.userName || 'Unknown User'}
                </p>
                <p className="text-sm text-gray-500">
                  Add an optional note for the user (this will be included in their approval email).
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Approval Note (Optional)
                </label>
                <textarea
                  value={approveModal.reason}
                  onChange={(e) => setApproveModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Add a note for the user..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeApproveModal}
                  disabled={actionLoading.userId === approveModal.userId}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading.userId === approveModal.userId}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {actionLoading.userId === approveModal.userId ? 'Approving...' : 'Approve User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {denyModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Deny User Registration</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeDenyModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {denyModal.userName || 'Unknown User'}
                </p>
                <p className="text-sm text-red-600 mb-2">
                  <strong>Warning:</strong> This action will permanently delete the user&apos;s account and cannot be undone.
                </p>
                <p className="text-sm text-gray-500">
                  Please provide a reason for the denial (this will be sent to the user via email).
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Denial <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={denyModal.reason}
                  onChange={(e) => setDenyModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide a reason for denying this user registration..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeDenyModal}
                  disabled={actionLoading.userId === denyModal.userId}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeny}
                  disabled={actionLoading.userId === denyModal.userId || !denyModal.reason.trim()}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {actionLoading.userId === denyModal.userId ? 'Denying...' : 'Deny Registration'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Suspend User</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={closeSuspendModal}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>User:</strong> {suspendModal.userName || 'Unknown User'}
                </p>
                <p className="text-sm text-orange-600 mb-2">
                  <strong>Warning:</strong> This will suspend the user&apos;s account and prevent them from accessing the system.
                </p>
                <p className="text-sm text-gray-500">
                  Please provide a reason for the suspension (this will be sent to the user via email).
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Suspension <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={suspendModal.reason}
                  onChange={(e) => setSuspendModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Please provide a reason for suspending this user..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={closeSuspendModal}
                  disabled={actionLoading.userId === suspendModal.userId}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSuspend}
                  disabled={actionLoading.userId === suspendModal.userId || !suspendModal.reason.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {actionLoading.userId === suspendModal.userId ? 'Suspending...' : 'Suspend User'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
