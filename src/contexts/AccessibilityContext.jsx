import { createContext, useContext, useState, useCallback, useEffect } from 'react'

const AccessibilityContext = createContext(null)

export const PROFILES = {
  dyscalculie: {
    id: 'dyscalculie',
    label: 'Dyscalculie',
    emoji: '🔵',
    desc: 'Grand texte + audio activés. Conseillé : Cadres à 10, Réglettes Cuisenaire.',
    settings: { dyslexicFont: false, largeText: true, focusMode: false, ttsEnabled: true },
  },
  tdah: {
    id: 'tdah',
    label: 'TDAH',
    emoji: '🟡',
    desc: 'Mode focus + grand texte + audio. Réduit les distractions.',
    settings: { dyslexicFont: false, largeText: true, focusMode: true, ttsEnabled: true },
  },
  dyslexie: {
    id: 'dyslexie',
    label: 'Dyslexie',
    emoji: '🟢',
    desc: 'Police OpenDyslexic + grand texte + audio activés.',
    settings: { dyslexicFont: true, largeText: true, focusMode: false, ttsEnabled: true },
  },
}

const STORAGE_KEY = 'plai_profile'

export function AccessibilityProvider({ children }) {
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [largeText, setLargeText]       = useState(false)
  const [focusMode, setFocusMode]       = useState(false)
  const [ttsEnabled, setTtsEnabled]     = useState(false)
  const [activeProfile, setActiveProfile] = useState(null)

  // Restore profile from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && PROFILES[saved]) {
      applyProfile(saved, false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const applyProfile = (profileId, announce = true) => {
    const profile = PROFILES[profileId]
    if (!profile) return
    const s = profile.settings
    setDyslexicFont(s.dyslexicFont)
    setLargeText(s.largeText)
    setFocusMode(s.focusMode)
    setTtsEnabled(s.ttsEnabled)
    setActiveProfile(profileId)
    localStorage.setItem(STORAGE_KEY, profileId)
    if (announce && s.ttsEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(`Profil ${profile.label} activé`)
      u.lang = 'fr-FR'
      window.speechSynthesis.speak(u)
    }
  }

  const clearProfile = () => {
    setActiveProfile(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  const speak = useCallback(
    (text) => {
      if (!ttsEnabled) return
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.9
      window.speechSynthesis.speak(utterance)
    },
    [ttsEnabled]
  )

  const toggleDyslexicFont = () => { setDyslexicFont((v) => !v); clearProfile() }
  const toggleLargeText    = () => { setLargeText((v) => !v);    clearProfile() }
  const toggleFocusMode    = () => { setFocusMode((v) => !v);    clearProfile() }
  const toggleTts = () => {
    setTtsEnabled((v) => {
      const next = !v
      if (next && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance('Mode audio activé')
        utterance.lang = 'fr-FR'
        window.speechSynthesis.speak(utterance)
      }
      return next
    })
    clearProfile()
  }

  return (
    <AccessibilityContext.Provider
      value={{
        dyslexicFont,
        largeText,
        focusMode,
        ttsEnabled,
        activeProfile,
        toggleDyslexicFont,
        toggleLargeText,
        toggleFocusMode,
        toggleTts,
        applyProfile,
        clearProfile,
        speak,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
