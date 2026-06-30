import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ankaa-erp-jwt-secret-2026-hvsbvmfv'
)

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/debug',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const token = request.cookies.get('ankaa_token')?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const userId = payload.userId as string
    const email  = payload.email as string
    const role   = (payload.role as string) || 'collaborator'

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id',    userId)
    requestHeaders.set('x-user-email', email)
    requestHeaders.set('x-user-role',  role)

    if (pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('ankaa_token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
