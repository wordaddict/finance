import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_PATHS = ['/', '/login', '/admin/wishlist']
const ALLOWED_PREFIXES = [
  '/_next', // Next.js assets
  '/favicon.ico',
  '/logo.svg',
  '/dmv', // public wishlist pages and detail/confirm routes
]
const ALLOWED_API_PREFIXES = [
  '/api/dmv/wishlist', // public wishlist APIs
  '/api/admin/wishlist', // admin wishlist APIs
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // APIs: only allow wishlist-related APIs
  if (pathname.startsWith('/api')) {
    const isAllowedApi = ALLOWED_API_PREFIXES.some(
      prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    if (!isAllowedApi) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Always allow static assets
  const isAllowedPrefix = ALLOWED_PREFIXES.some(
    prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
  if (isAllowedPrefix) {
    return NextResponse.next()
  }

  // Allow explicit paths
  if (ALLOWED_PATHS.includes(pathname)) {
    return NextResponse.next()
  }

  // Everything else is blocked
  return NextResponse.redirect(new URL('/', request.url))
}

// Apply to all routes so we can centrally gate access
export const config = {
  matcher: '/:path*',
}

