import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'
import {
  clearWishlistCodeCookie,
  clearWishlistAccessCookie,
  decodeCookiePayload,
  isWishlistEmailAllowed,
  setWishlistAccessCookie,
} from '@/lib/auth'

interface CodePayload {
  email: string
  codeHash: string
  expiresAt: number
}

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()
    const normalizedEmail = (email || '').toLowerCase().trim()
    const providedCode = (code || '').trim()

    if (!isWishlistEmailAllowed(normalizedEmail)) {
      return NextResponse.json({ error: 'Email not allowed' }, { status: 403 })
    }

    if (!providedCode) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const codeCookie = cookies().get('wishlist_code_attempt')?.value
    const payload = decodeCookiePayload<CodePayload>(codeCookie)

    if (!payload || payload.email !== normalizedEmail) {
      return NextResponse.json({ error: 'No valid code. Please request a new one.' }, { status: 400 })
    }

    if (payload.expiresAt < Date.now()) {
      const expiredResponse = NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
      clearWishlistCodeCookie(expiredResponse)
      return expiredResponse
    }

    const hash = createHash('sha256').update(providedCode).digest('hex')
    if (hash !== payload.codeHash) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    const accessExpiresAt = Date.now() + 4 * 60 * 60 * 1000 // 4 hours
    const response = NextResponse.json({ success: true })
    setWishlistAccessCookie({ email: normalizedEmail, expiresAt: accessExpiresAt }, response)
    clearWishlistCodeCookie(response)
    return response
  } catch (error) {
    console.error('Failed to verify wishlist code:', error)
    const response = NextResponse.json({ error: 'Failed to verify code' }, { status: 500 })
    clearWishlistAccessCookie(response)
    return response
  }
}

