import React, { useState } from 'react'
import axios from 'axios'
import './Auth.css'

const API = axios.create({
  baseURL: 'http://localhost:5000/api'
})

function StaffLogin({ onLogin }) {
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    password: '',
    secret_key: '' // Secret key for staff registration
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isRegister) {
        // Staff Registration
        const response = await API.post('/auth/staff-register', {
          full_name: formData.full_name,
          mobile: formData.mobile,
          email: formData.email,
          password: formData.password,
          secret_key: formData.secret_key
        })

        if (response.data.success) {
          alert('✅ Staff account created! Please login.')
          setIsRegister(false)
          setFormData({ full_name: '', mobile: '', email: '', password: '', secret_key: '' })
        }
      } else {
        // Staff Login
        const response = await API.post('/auth/staff-login', {
          mobile: formData.mobile,
          password: formData.password
        })

        if (response.data.success) {
          localStorage.setItem('token', response.data.token)
          localStorage.setItem('user', JSON.stringify(response.data.user))
          onLogin(response.data.user)
        }
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
      <div className="auth-card" style={{ maxWidth: '420px' }}>
        <div className="auth-header">
          <div className="auth-logo">🔧</div>
          <h1>{isRegister ? 'Create Staff Account' : 'Staff Login'}</h1>
          <p>{isRegister ? 'Only workshop owners can register' : 'Access the workshop management dashboard'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="Full Name *"
                value={formData.full_name}
                onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                required
              />
              <input
                type="text"
                placeholder="Secret Key *"
                value={formData.secret_key}
                onChange={(e) => setFormData({...formData, secret_key: e.target.value})}
                required
              />
            </>
          )}

          <input
            type="tel"
            placeholder="Mobile Number *"
            value={formData.mobile}
            onChange={(e) => setFormData({...formData, mobile: e.target.value})}
            required
          />

          {isRegister && (
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          )}

          <input
            type="password"
            placeholder="Password *"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Loading...' : (isRegister ? 'Create Staff Account' : 'Staff Login')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isRegister ? 'Already have staff access?' : 'Need staff access?'}
            <button 
              className="auth-switch" 
              onClick={() => {
                setIsRegister(!isRegister)
                setFormData({ full_name: '', mobile: '', email: '', password: '', secret_key: '' })
              }}
            >
              {isRegister ? 'Login' : 'Register'}
            </button>
          </p>
          <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            🔒 Staff access is restricted to workshop owners only
          </p>
        </div>
      </div>
    </div>
  )
}

export default StaffLogin