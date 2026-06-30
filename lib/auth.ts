import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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

// Role helpers
export function isAdmin(role: string): boolean {
  return role === 'admin'
}

export function isExecutive(role: string): boolean {
  return ['admin', 'ceo', 'md', 'cto', 'coo'].includes(role)
}

export function isHR(role: string): boolean {
  return ['admin', 'hr'].includes(role)
}

export function isFinance(role: string): boolean {
  return ['admin', 'finance'].includes(role)
}

export function canManageUsers(role: string): boolean {
  return ['admin', 'hr'].includes(role)
}

export function canApproveLeave(role: string): boolean {
  return ['admin', 'hr', 'ceo', 'md', 'coo', 'cto', 'hod'].includes(role)
}

// Role display names
export const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ceo: 'CEO',
  md: 'Managing Director',
  cto: 'CTO',
  coo: 'COO',
  hr: 'HR Manager',
  finance: 'Finance Manager',
  hod: 'Head of Department',
  team_member: 'Team Member',
  trainee: 'Trainee',
  collaborator: 'Collaborator',
}

// Allowed roles list for dropdowns
export const ALLOWED_ROLES = Object.keys(ROLE_LABELS)
