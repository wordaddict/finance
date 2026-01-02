import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db } from './db'
import { hash, verify } from 'argon2'
import { createHash, randomBytes } from 'crypto'
import { CampusValue } from './constants'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  role: 'ADMIN' | 'CAMPUS_PASTOR' | 'LEADER'
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED'
  campus: CampusValue
  zelle?: string | null
}

// Specific access controls
export const WISHLIST_ADMIN_USER_IDS = [
  '0ca7f7ad-c3c7-44f9-ae3e-d63c24ceff2f',
  '5626d1cd-4cd2-4a04-ade0-39e5876b572e',
]

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

export async function hashPassword(password: string): Promise<string> {
  return await hash(password)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    return await verify(hashedPassword, password)
  } catch {
    return false
  }
}

export async function createSession(userId: string, request: NextRequest): Promise<string> {
  const sessionId = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 5 * 60 * 60 * 1000) // 5 hour

  await db.session.create({
    data: {
      id: sessionId,
      userId,
      ip: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      expiresAt,
    },
  })

  return sessionId
}

export async function getSession(sessionId: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as 'ADMIN' | 'CAMPUS_PASTOR' | 'LEADER',
    status: session.user.status as 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED',
    campus: session.user.campus as CampusValue,
    zelle: session.user.zelle,
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  await db.session.delete({
    where: { id: sessionId },
  })
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies()
  const sessionId = cookieStore.get('session')?.value

  if (!sessionId) {
    return null
  }

  return await getSession(sessionId)
}

export function setSessionCookie(sessionId: string, response: NextResponse): void {
  response.cookies.set('session', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 5 * 60 * 60, // 5 hour
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete('session')
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireRole(allowedRoles: string[]): Promise<SessionUser> {
  const user = await requireAuth()
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions')
  }
  return user
}

export function hasWishlistCookieAccess(): boolean {
  return hasValidWishlistAccessCookie()
}

export async function requireWishlistAdmin(): Promise<void> {
  // Authenticated path
  const user = await getCurrentUser()
  if (user && WISHLIST_ADMIN_USER_IDS.includes(user.id)) {
    return
  }

  // Cookie-based access path (code + password flow)
  if (hasValidWishlistAccessCookie()) {
    return
  }

  throw new Error('Insufficient permissions')
}
