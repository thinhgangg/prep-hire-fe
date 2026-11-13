export type UserRole = 'ADMIN' | 'RECRUITER' | 'CANDIDATE'

export type AuthUser = {
  id: string
  user_id_num?: number
  username?: string
  name: string
  email: string
  role: UserRole
  token?: string
  avatar?: string | null
  phone?: string | null
  current_role?: string | null
  location?: string | null
}

export const HOME_BY_ROLE: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  RECRUITER: '/admin/dashboard',
  CANDIDATE: '/app',
}
