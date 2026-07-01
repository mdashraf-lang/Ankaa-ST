// Client-safe role constants and helpers — no server imports here

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

export const ROLE_LABELS: Record<string, string> = {
  admin:       'Admin',
  ceo:         'CEO',
  md:          'Managing Director',
  cto:         'CTO',
  coo:         'COO',
  hr:          'HR Manager',
  finance:     'Finance Manager',
  hod:         'Head of Department',
  team_member: 'Team Member',
  trainee:     'Trainee',
  collaborator:'Collaborator',
}

export const ALLOWED_ROLES = Object.keys(ROLE_LABELS)
