import React, { useState } from 'react'
import axios from 'axios'
import './Auth.css'

const API = axios.create({
  baseURL: 'https://dharma-motors-backend.onrender.com/api'
})

function Login({ onLogin, isStaffMode, onToggleStaff }) {
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    email: '',
    password: '',
    staff_password: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      let response
      
      if (isStaffMode) {
        response = await API.post('/auth/staff-login', {
          mobile: formData.mobile,
          password: formData.password,
          staff_password: formData.staff_password
        })
      } else if (isLogin) {
        response = await API.post('/auth/login', {
          mobile: formData.mobile,
          password: formData.password
        })
      } else {
        response = await API.post('/auth/register', {
          full_name: formData.full_name,
          mobile: formData.mobile,
          email: formData.email,
          password: formData.password
        })
      }

      if (response.data.success) {
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(response.data.user))
        onLogin(response.data.user)
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container" style={{ 
      background: 'linear-gradient(135deg, #1A56DB 0%, #1E293B 100%)'
    }}>
      <div className="auth-card" style={{ 
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '40px 32px',
        maxWidth: '420px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
  <img 
    src="/logo.png" 
    alt="Dharma Motors"
    style={{ 
      width: '120px',
      height: 'auto',
      marginBottom: '12px'
    }}
  />
  <h1 style={{ 
    fontSize: '28px', 
    fontWeight: '700', 
    color: '#1A1A2E',
    letterSpacing: '2px',
    margin: 0
  }}>
    DHARMA MOTORS
  </h1>
          <p style={{ 
            color: '#C9A84C', 
            fontSize: '12px',
            fontWeight: '500',
            letterSpacing: '4px',
            margin: '4px 0 0 0'
          }}>
            PREMIUM AUTO SERVICE
          </p>
          <div style={{ 
            width: '60px', 
            height: '3px', 
            background: '#C9A84C',
            margin: '12px auto',
            borderRadius: '2px'
          }}></div>
          <p style={{ 
            fontSize: '16px',
            color: '#64748B',
            margin: '8px 0 0 0'
          }}>
            {isStaffMode ? '🔧 Staff Login' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </p>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginBottom: '12px'
        }}>
          <button
            onClick={onToggleStaff}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '12px',
              color: isStaffMode ? '#1A56DB' : '#94A3B8',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#EFF6FF'}
            onMouseLeave={(e) => e.target.style.background = 'none'}
          >
            {isStaffMode ? '← Customer Login' : '🔑 Admin'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && !isStaffMode && (
            <input
              type="text"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              required
            />
          )}

          <input
            type="tel"
            placeholder="Mobile Number"
            value={formData.mobile}
            onChange={(e) => setFormData({...formData, mobile: e.target.value})}
            required
          />

          {!isLogin && !isStaffMode && (
            <input
              type="email"
              placeholder="Email (optional)"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          )}

          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />

          {isStaffMode && (
            <input
              type="password"
              placeholder="Staff Secret Key *"
              value={formData.staff_password}
              onChange={(e) => setFormData({...formData, staff_password: e.target.value})}
              required
            />
          )}

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Loading...' : (isStaffMode ? 'Staff Login' : (isLogin ? 'Login' : 'Create Account'))}
          </button>
        </form>

        {!isStaffMode && (
          <div className="auth-footer">
            <p>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                className="auth-switch" 
                onClick={() => setIsLogin(!isLogin)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1A56DB',
                  fontWeight: '600',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginLeft: '6px'
                }}
              >
                {isLogin ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </div>
        )}

        {isStaffMode && (
          <div className="auth-footer">
            <p style={{ fontSize: '12px', color: '#94A3B8' }}>
              🔒 Staff access is restricted to workshop owners only
            </p>
          </div>
        )}

        <div className="auth-features" style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '24px',
          paddingTop: '20px',
          borderTop: '1px solid #E2E8F0'
        }}>
          <div className="feature" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748B' }}>
            <span style={{ fontSize: '18px' }}>🔒</span>
            <span>Secure</span>
          </div>
          <div className="feature" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748B' }}>
            <span style={{ fontSize: '18px' }}>📱</span>
            <span>Mobile Ready</span>
          </div>
          <div className="feature" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#64748B' }}>
            <span style={{ fontSize: '18px' }}>⭐</span>
            <span>Trusted Service</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login