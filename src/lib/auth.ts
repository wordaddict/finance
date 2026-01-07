import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const WISHLIST_ALLOWED_EMAILS = [
  'femi2tin@gmail.com',
  'madeyinka6@gmail.com',
]

const WISHLIST_CODE_COOKIE = 'wishlist_code_attempt'
const WISHLIST_ACCESS_COOKIE = 'wishlist_admin_access'

interface WishlistCodePayload {
  email: string
  codeHash: string
  expiresAt: number
}

interface WishlistAccessPayload {
  email: string
  expiresAt: number
}

export function isWishlistEmailAllowed(email: string) {
  return WISHLIST_ALLOWED_EMAILS.includes(email.toLowerCase())
}

export function encodeCookiePayload(payload: object) {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export function decodeCookiePayload<T>(value: string | undefined): T | null {
  if (!value) return null
  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf-8')) as T
  } catch {
    return null
  }
}

export function setWishlistCodeCookie(payload: WishlistCodePayload, response: NextResponse) {
  response.cookies.set(WISHLIST_CODE_COOKIE, encodeCookiePayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.max(0, Math.floor((payload.expiresAt - Date.now()) / 1000)),
    path: '/',
  })
}

export function clearWishlistCodeCookie(response: NextResponse) {
  response.cookies.delete(WISHLIST_CODE_COOKIE)
}

export function setWishlistAccessCookie(payload: WishlistAccessPayload, response: NextResponse) {
  response.cookies.set(WISHLIST_ACCESS_COOKIE, encodeCookiePayload(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.max(0, Math.floor((payload.expiresAt - Date.now()) / 1000)),
    path: '/',
  })
}

export function clearWishlistAccessCookie(response: NextResponse) {
  response.cookies.delete(WISHLIST_ACCESS_COOKIE)
}

function hasValidWishlistAccessCookie(): boolean {
  const cookieStore = cookies()
  const raw = cookieStore.get(WISHLIST_ACCESS_COOKIE)?.value
  const payload = decodeCookiePayload<WishlistAccessPayload>(raw)
  if (!payload) return false
  if (!isWishlistEmailAllowed(payload.email)) return false
  if (payload.expiresAt < Date.now()) return false
  return true
}

export function hasWishlistCookieAccess(): boolean {
  return hasValidWishlistAccessCookie()
}

export async function requireWishlistAdmin(): Promise<void> {
  if (hasValidWishlistAccessCookie()) {
    return
  }

  throw new Error('Insufficient permissions')
}
