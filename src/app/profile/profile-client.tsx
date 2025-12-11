'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Navigation } from '@/components/navigation'
import { SessionUser } from '@/lib/auth'
import { formatRoleName } from '@/lib/utils'
import { User, Mail, Phone, DollarSign } from 'lucide-react'

interface ProfileClientProps {
  user: SessionUser
}

export function ProfileClient({ user }: ProfileClientProps) {
  const router = useRouter()
  const [zelle, setZelle] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load current Zelle info
  useEffect(() => {
    if (user.zelle) {
      setZelle(user.zelle)
    }
  }, [user.zelle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ zelle }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Profile updated successfully!')
        // Update the user object to reflect changes
        user.zelle = zelle
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (error) {
      setError('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const isValidZelle = (value: string) => {
    // Zelle can be either an email or phone number
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/ // International phone format
    
    return emailRegex.test(value) || phoneRegex.test(value.replace(/\D/g, ''))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-gray-600 mt-2">Manage your account information and payment details</p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Account Information
          </CardTitle>
          <CardDescription>
            Your basic account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-lg font-medium">{user.name || 'Not provided'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-lg font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {user.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <p className="text-lg font-medium">{formatRoleName(user.role)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Status</label>
              <p className="text-lg font-medium">{user.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payment Information
          </CardTitle>
          <CardDescription>
            Add your Zelle information for expense reimbursements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="zelle" className="block text-sm font-medium mb-1">
                Zelle Information
              </label>
              <div className="relative">
                <input
                  id="zelle"
                  type="text"
                  value={zelle}
                  onChange={(e) => setZelle(e.target.value)}
                  placeholder="Enter your email or phone number for Zelle"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    zelle && !isValidZelle(zelle) ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {zelle && isValidZelle(zelle) && (
                  <div className="absolute right-3 top-2.5">
                    {zelle.includes('@') ? (
                      <Mail className="w-4 h-4 text-green-500" />
                    ) : (
                      <Phone className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter either your email address or phone number associated with your Zelle account
              </p>
              {zelle && !isValidZelle(zelle) && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter a valid email address or phone number
                </p>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-200">
                {message}
              </div>
            )}

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={loading || (zelle ? !isValidZelle(zelle) : false)}
                className="min-w-32"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">About Zelle</h3>
            <p className="text-sm text-blue-800">
              Zelle is a digital payment network used by many banks and credit unions. 
              When your expense requests are approved and paid, the reimbursement will be sent 
              to the Zelle information you provide here. Make sure this information matches 
              your bank account details.
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
