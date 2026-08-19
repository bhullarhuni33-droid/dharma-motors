import React, { useState, useEffect } from 'react'
import './AppBanner.css'

function AppBanner() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    
    if (isInstalled) {
      return
    }

    // Check if user dismissed banner before
    const dismissed = localStorage.getItem('appBannerDismissed')
    if (dismissed === 'true') {
      return
    }

    // Check if on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    
    // Show banner on mobile after 1 second
    if (isMobile) {
      setTimeout(() => {
        setIsVisible(true)
      }, 1000)
    }
  }, [])

  const handleInstall = () => {
    // For Chrome Android
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt()
      window.deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          setIsVisible(false)
          localStorage.setItem('appInstalled', 'true')
        }
        window.deferredPrompt = null
      })
    } else {
      // For iOS Safari
      alert('📱 Tap the Share button and select "Add to Home Screen"')
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('appBannerDismissed', 'true')
  }

  if (!isVisible) return null

  return (
    <div className="app-banner">
      <button className="banner-close" onClick={handleDismiss}>✕</button>
      <div className="banner-icon">🚗</div>
      <div className="banner-content">
        <div className="banner-title">Dharma Motors</div>
        <div className="banner-subtitle">Premium Auto Service</div>
        <div className="banner-description">Install app for quick booking</div>
      </div>
      <button className="banner-install" onClick={handleInstall}>
        Install
      </button>
    </div>
  )
}

export default AppBanner