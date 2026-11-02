import { createContext, useContext, useState } from 'react'
import type { AuthUser, UserRole } from './types'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BE_URL ||
  'http://127.0.0.1:8000'
).replace(/\/$/, '')

type AuthContextValue = {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<AuthUser>
  loginAs: (role: UserRole) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function fallbackMockUser(username: string): AuthUser {
  const uname = username.trim().toLowerCase()
  if (uname === 'admin') {
    return { id: 'admin-01', user_id_num: 0, username: 'admin', name: 'Hoàng Nam (Admin)', email: 'admin@prephire.vn', role: 'ADMIN' }
  }
  if (uname === 'recruiter') {
    return { id: 'recruiter-01', user_id_num: 0, username: 'recruiter', name: 'Hoàng Nam (Recruiter)', email: 'recruiter@prephire.vn', role: 'RECRUITER' }
  }
  const match = uname.match(/^user([1-9]|[1-9][0-9]|100)$/)
  const num = match ? parseInt(match[1], 10) : 1
  return {
    id: `user-${String(num).padStart(3, '0')}`,
    user_id_num: num,
    username: `user${num}`,
    name: `Ứng viên ${num}`,
    email: `user${num}@prephire.vn`,
    role: 'CANDIDATE',
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem('prephire-user')
      if (stored) return JSON.parse(stored)
      const role = sessionStorage.getItem('interviewly-role') as UserRole | null
      if (role === 'ADMIN') return fallbackMockUser('admin')
      if (role === 'CANDIDATE') return fallbackMockUser('user1')
    } catch {}
    return null
  })

  const saveUser = (u: AuthUser | null) => {
    setUser(u)
    if (u) {
      sessionStorage.setItem('prephire-user', JSON.stringify(u))
      sessionStorage.setItem('interviewly-role', u.role)
      if (u.user_id_num !== undefined) {
        sessionStorage.setItem('current_user_id', String(u.user_id_num))
      } else {
        sessionStorage.setItem('current_user_id', u.id)
      }
      sessionStorage.setItem('current_user_name', u.name)
      if (u.token) {
        sessionStorage.setItem('prephire-token', u.token)
      }
    } else {
      sessionStorage.removeItem('prephire-user')
      sessionStorage.removeItem('interviewly-role')
      sessionStorage.removeItem('current_user_id')
      sessionStorage.removeItem('current_user_name')
      sessionStorage.removeItem('prephire-token')
    }
  }

  const login = async (username: string, password: string): Promise<AuthUser> => {
    const trimmedUser = username.trim()
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmedUser, password }),
      })

      if (res.ok) {
        const data = await res.json()
        const authUser: AuthUser = {
          id: data.user.id,
          user_id_num: data.user.user_id_num,
          username: data.user.username,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role as UserRole,
          token: data.access_token,
        }
        saveUser(authUser)
        return authUser
      } else {
        let errorMsg = 'Đăng nhập không thành công'
        try {
          const err = await res.json()
          if (err.detail) errorMsg = err.detail
        } catch {}
        throw new Error(errorMsg)
      }
    } catch (netErr: any) {
      // If server unreachable, check fallback for mock user
      if (netErr?.message && !netErr.message.includes('fetch') && !netErr.message.includes('network')) {
        throw netErr
      }
      if (password === '123456') {
        const u = fallbackMockUser(trimmedUser)
        saveUser(u)
        return u
      }
      throw new Error(netErr?.message || 'Không thể kết nối đến máy chủ xác thực')
    }
  }

  const loginAs = (role: UserRole) => {
    const u = role === 'ADMIN' ? fallbackMockUser('admin') : fallbackMockUser('user1')
    saveUser(u)
  }

  const logout = () => {
    saveUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, loginAs, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
