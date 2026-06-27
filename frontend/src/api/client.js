import axios from 'axios'

// En dev  → Vite proxy redirige '/api' vers localhost:5000
// En prod → VITE_API_URL pointe vers Railway (ex: https://eco-park.railway.app/api)
const API_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to inject token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eco_park_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle unauthorized access
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('eco_park_token')
      localStorage.removeItem('eco_park_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default client
