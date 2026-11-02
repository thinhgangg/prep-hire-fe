export type UserRole = 'ADMIN' | 'RECRUITER' | 'CANDIDATE'

export type AuthUser = {
  id: string
  user_id_num?: number
  username?: string
  name: string
  email: string
  role: UserRole
  token?: string
}

export const HOME_BY_ROLE: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  RECRUITER: '/admin/dashboard',
  CANDIDATE: '/app',
}
