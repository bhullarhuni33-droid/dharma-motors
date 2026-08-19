import React, { useState, useEffect } from 'react'
import Login from './pages/Login'
import CustomerApp from './pages/CustomerApp'
import StaffApp from './StaffApp'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isStaffLogin, setIsStaffLogin] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
    }
    setLoading(false)
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setIsStaffLogin(false)
  }

  const toggleStaffLogin = () => {
    setIsStaffLogin(!isStaffLogin)
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <Login 
        onLogin={handleLogin} 
        isStaffMode={isStaffLogin}
        onToggleStaff={toggleStaffLogin}
      />
    )
  }

  // If user is staff, show Staff Dashboard
  if (user.role === 'staff') {
    return <StaffApp user={user} onLogout={handleLogout} />
  }

  // Customer view
  return <CustomerApp user={user} onLogout={handleLogout} />
}

export default App