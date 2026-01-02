import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomInt } from 'crypto'
import { sendEmail } from '@/lib/email'
import {
  isWishlistEmailAllowed,
  setWishlistCodeCookie,
} from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const normalizedEmail = (email || '').toLowerCase().trim()

    if (!isWishlistEmailAllowed(normalizedEmail)) {
      return NextResponse.json({ error: 'Email not allowed' }, { status: 403 })
    }

    const code = randomInt(100000, 999999).toString()
    const codeHash = createHash('sha256').update(code).digest('hex')
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

    const response = NextResponse.json({ success: true, message: 'Code sent' })
    setWishlistCodeCookie({ email: normalizedEmail, codeHash, expiresAt }, response)

    await sendEmail({
      to: normalizedEmail,
      subject: 'Your Admin Wish List Access Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto;">
          <h2>Wish List Admin Access</h2>
          <p>Use the code below to access the admin wish list (valid for 10 minutes):</p>
          <div style="background:#f5f5f5;padding:16px;border-radius:8px;font-size:24px;font-weight:bold;text-align:center;letter-spacing:4px;">
            ${code}
          </div>
          <p style="color:#666;font-size:14px;margin-top:12px;">If you did not request this code, you can ignore this email.</p>
        </div>
      `,
      text: `Wish List Admin Access Code: ${code} (valid for 10 minutes)`,
    })

    return response
  } catch (error) {
    console.error('Failed to send wishlist access code:', error)
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 })
  }
}

