'use client'

import { createContext, useContext, useEffect, useState } from 'react';
import { getCookie, setCookie } from 'cookies-next';

type PrivacyConsent = {
  necessary: boolean
  analytics: boolean
  marketing: boolean
}

type PrivacyContextType = {
  consent: PrivacyConsent
  showBanner: boolean
  acceptAll: () => void
  rejectAll: () => void
  savePreferences: (prefs: PrivacyConsent) => void
  openSettings: boolean
  setOpenSettings: (open: boolean) => void
}

const PrivacyContext = createContext<PrivacyContextType>({} as PrivacyContextType)

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
    
  const [showBanner, setShowBanner] = useState(false)
  const [openSettings, setOpenSettings] = useState(false)
  const [consent, setConsent] = useState<PrivacyConsent>({
    necessary: true,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    const savedConsent = getCookie('privacyConsent')
    if (savedConsent) {
      setConsent(JSON.parse(savedConsent as string))
      setShowBanner(false)
    } else {
      setShowBanner(true)
    }
  }, [])

  const updateConsent = (newConsent: PrivacyConsent) => {
    setCookie('privacyConsent', JSON.stringify(newConsent), {
      maxAge: 60 * 60 * 24 * 365, // 1 ano
      path: '/',
    })
    setConsent(newConsent)
    setShowBanner(false)
    setOpenSettings(false)
    
    // Carrega scripts condicionalmente
    if (newConsent.analytics) loadAnalyticsScript()
  }

  const acceptAll = () => updateConsent({ necessary: true, analytics: true, marketing: true })
  const rejectAll = () => updateConsent({ necessary: true, analytics: false, marketing: false })
  const savePreferences = (prefs: PrivacyConsent) => updateConsent({ ...prefs, necessary: true })

  return (
    <PrivacyContext.Provider
      value={{
        consent,
        showBanner,
        acceptAll,
        rejectAll,
        savePreferences,
        openSettings,
        setOpenSettings,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  )
}

export const usePrivacy = () => useContext(PrivacyContext)

const loadAnalyticsScript = () => {
  // Implemente seu carregamento de scripts de analytics aqui
  console.log('Analytics carregados')
}