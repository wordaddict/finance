'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { CAMPUSES, CAMPUS_DISPLAY_NAMES } from '@/lib/constants'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState('LEADER')
  const [campus, setCampus] = useState('DMV')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Client-side validation
    if (!name.trim()) {
      setError('Full name is required')
      setLoading(false)
      return
    }

    if (!email.trim()) {
      setError('Email is required')
      setLoading(false)
      return
    }

    if (!password.trim()) {
      setError('Password is required')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (!campus) {
      setError('Campus is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), name, password, role, campus }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error) {
      setError('Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logo.svg"
              alt="Celebration Church America"
              width={120}
              height={40}
              className="h-10 w-auto"
            />
          </div>
          <CardTitle>Create Account</CardTitle>
          <CardDescription>
            Register for the expense management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Full Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Password must be at least 8 characters long</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="campus" className="block text-sm font-medium mb-1">
                Campus *
              </label>
              <select
                id="campus"
                value={campus}
                onChange={(e) => setCampus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="DMV">DMV</option>
                <option value="DALLAS">Dallas</option>
                <option value="BOSTON">Boston</option>
                <option value="AUSTIN">Austin</option>
                <option value="CCI_USA_NASHVILLE">CCI-USA Nashville</option>
                <option value="CCI_USA_OKLAHOMA">CCI-USA Oklahoma</option>
                <option value="CCI_USA_NEWYORK_NEWJERSEY">CCI-USA New York/New Jersey</option>
                <option value="CCI_USA_KNOXVILLE">CCI-USA Knoxville</option>
                <option value="CCI_USA_NORTH_CAROLINA">CCI-USA North Carolina</option>
                <option value="CCI_USA_ATLANTA">CCI-USA Atlanta</option>
                <option value="CCI_USA_BAY_AREA">CCI-USA Bay Area</option>
                <option value="CCI_USA_CHICAGO">CCI-USA Chicago</option>
              </select>
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LEADER">Leader</option>
                <option value="CAMPUS_PASTOR">Campus Pastor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            {success && (
              <div className="text-green-600 text-sm">{success}</div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
            <div className="text-center">
              <a href="/login" className="text-blue-600 hover:underline">
                Already have an account? Sign in
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
