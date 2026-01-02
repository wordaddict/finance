'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WishlistAccessGate() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const sendCode = async () => {
    setSending(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/wishlist/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Failed to send code')
        return
      }
      setMessage('Code sent. Check your email.')
    } catch (error) {
      console.error(error)
      setMessage('Failed to send code')
    } finally {
      setSending(false)
    }
  }

  const verifyCode = async () => {
    setVerifying(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/wishlist/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage(data.error || 'Invalid code')
        return
      }
      setMessage('Access granted. Redirecting...')
      router.refresh()
    } catch (error) {
      console.error(error)
      setMessage('Failed to verify code')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <Card className="rounded-2xl border border-gray-200 shadow-md">
      <CardHeader>
        <CardTitle>Access Wishlist Admin</CardTitle>
        <CardDescription>Enter your email to receive a one-time code.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={sendCode} disabled={sending || !email} className="rounded-xl">
            {sending ? 'Sending...' : 'Send Code'}
          </Button>
          <span className="text-sm text-gray-600">We&apos;ll email a 6-digit code.</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">One-time code</Label>
          <Input
            id="code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
            className="rounded-xl"
          />
        </div>

        <Button
          className="w-full rounded-xl"
          onClick={verifyCode}
          disabled={verifying || !email || code.length < 4}
        >
          {verifying ? 'Verifying...' : 'Verify & Continue'}
        </Button>

        {message && (
          <p className="text-sm text-gray-700">{message}</p>
        )}

      </CardContent>
    </Card>
  )
}

