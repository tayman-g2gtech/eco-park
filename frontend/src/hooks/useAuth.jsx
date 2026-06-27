import React, { createContext, useContext, useState, useEffect } from 'react'
import client from '@/api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('eco_park_user')
    const token = localStorage.getItem('eco_park_token')
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser))
      } catch (e) {
        localStorage.removeItem('eco_park_user')
        localStorage.removeItem('eco_park_token')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      const response = await client.post('/auth/login', { email, password })
      const { token, user: userData } = response.data
      localStorage.setItem('eco_park_token', token)
      localStorage.setItem('eco_park_user', JSON.stringify(userData))
      setUser(userData)
      return { success: true, role: userData.role }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        message: error.response?.data?.message || 'Identifiants incorrects'
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('eco_park_token')
    localStorage.removeItem('eco_park_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
