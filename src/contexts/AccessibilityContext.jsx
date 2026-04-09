import { createContext, useContext, useState, useCallback } from 'react'

const AccessibilityContext = createContext(null)

export function AccessibilityProvider({ children }) {
  const [dyslexicFont, setDyslexicFont] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [ttsEnabled, setTtsEnabled] = useState(false)

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

  const toggleDyslexicFont = () => setDyslexicFont((v) => !v)
  const toggleLargeText = () => setLargeText((v) => !v)
  const toggleFocusMode = () => setFocusMode((v) => !v)
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
  }

  return (
    <AccessibilityContext.Provider
      value={{
        dyslexicFont,
        largeText,
        focusMode,
        ttsEnabled,
        toggleDyslexicFont,
        toggleLargeText,
        toggleFocusMode,
        toggleTts,
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
