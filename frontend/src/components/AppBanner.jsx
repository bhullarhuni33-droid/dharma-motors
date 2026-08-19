import React, { useState, useEffect } from 'react'
import './AppBanner.css'

function AppBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Check if already installed
    if (window.navigator.standalone) {
      setIsInstalled(true)
      return
    }

    // Check if user dismissed banner before
    const dismissed = localStorage.getItem('appBannerDismissed')
    if (dismissed) {
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed (for iOS)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') {
        setIsVisible(false)
        localStorage.setItem('appInstalled', 'true')
      }
      setDeferredPrompt(null)
    } else {
      // iOS fallback - show instructions
      alert('📱 Tap the Share button and select "Add to Home Screen"')
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('appBannerDismissed', 'true')
  }

  if (!isVisible || isInstalled) return null

  return (
    <div className="app-banner">
      <button className="banner-close" onClick={handleDismiss}>✕</button>
      <div className="banner-icon">📱</div>
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