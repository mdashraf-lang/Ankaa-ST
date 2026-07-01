import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

// Re-export client-safe helpers from roles.ts so server code can still import them from here
export {
  isAdmin, isExecutive, isHR, isFinance, canManageUsers, canApproveLeave,
  ROLE_LABELS, ALLOWED_ROLES,
} from '@/lib/roles'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ankaa-erp-jwt-secret-2026-hvsbvmfv'
)
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h'

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as string) || 'collaborator',
    }
  } catch {
    return null
  }
}

export async function getServerSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('ankaa_token')?.value
  if (!token) return null
  return verifyToken(token)
}
