import { useState } from 'react'
import { useAccessibility, PROFILES } from '../contexts/AccessibilityContext.jsx'

export default function AccessibilityBar() {
  const {
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
  } = useAccessibility()

  const [profileOpen, setProfileOpen] = useState(false)

  const btnBase =
    'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors min-h-[36px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400'
  const activeClass   = 'bg-blue-500 text-white'
  const inactiveClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200'

  const currentProfile = activeProfile ? PROFILES[activeProfile] : null

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-100 h-12 flex items-center px-4 gap-2">
        <span className="text-xs text-gray-400 mr-2 hidden sm:block">Accessibilité :</span>

        <button
          onClick={toggleDyslexicFont}
          className={`${btnBase} ${dyslexicFont ? activeClass : inactiveClass}`}
          title="Police pour la dyslexie"
          aria-pressed={dyslexicFont}
        >
          <span aria-hidden="true">👁</span>
          <span className="hidden sm:inline">Dyslexie</span>
        </button>

        <button
          onClick={toggleLargeText}
          className={`${btnBase} ${largeText ? activeClass : inactiveClass}`}
          title="Agrandir le texte"
          aria-pressed={largeText}
        >
          <span aria-hidden="true">🔤</span>
          <span className="hidden sm:inline">Grand texte</span>
        </button>

        <button
          onClick={toggleFocusMode}
          className={`${btnBase} ${focusMode ? activeClass : inactiveClass}`}
          title="Mode focus"
          aria-pressed={focusMode}
        >
          <span aria-hidden="true">🎯</span>
          <span className="hidden sm:inline">Focus</span>
        </button>

        <button
          onClick={toggleTts}
          className={`${btnBase} ${ttsEnabled ? activeClass : inactiveClass}`}
          title="Lecture audio"
          aria-pressed={ttsEnabled}
        >
          <span aria-hidden="true">🔊</span>
          <span className="hidden sm:inline">Audio</span>
        </button>

        {/* Separator + Profile selector */}
        <div className="ml-auto flex items-center gap-2">
          <div className="h-5 w-px bg-gray-200 hidden sm:block" />
          <div className="relative">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className={`${btnBase} ${currentProfile ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : inactiveClass}`}
              title="Choisir un profil élève"
              aria-haspopup="true"
              aria-expanded={profileOpen}
            >
              <span aria-hidden="true">{currentProfile ? currentProfile.emoji : '🧩'}</span>
              <span className="hidden sm:inline text-xs">
                {currentProfile ? currentProfile.label : 'Profil'}
              </span>
              <span className="text-xs opacity-60">▾</span>
            </button>

            {/* Dropdown panel */}
            {profileOpen && (
              <div className="absolute right-0 top-10 w-64 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-bold text-gray-700">Profil élève</p>
                  <p className="text-xs text-gray-400 mt-0.5">Active les bons outils en un clic</p>
                </div>

                {Object.values(PROFILES).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => { applyProfile(profile.id); setProfileOpen(false) }}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-start gap-3 ${
                      activeProfile === profile.id ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <span className="text-xl mt-0.5 shrink-0">{profile.emoji}</span>
                    <div>
                      <div className={`text-sm font-semibold ${activeProfile === profile.id ? 'text-indigo-700' : 'text-gray-800'}`}>
                        {profile.label}
                        {activeProfile === profile.id && (
                          <span className="ml-2 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">actif</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-snug">{profile.desc}</div>
                    </div>
                  </button>
                ))}

                {activeProfile && (
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button
                      onClick={() => { clearProfile(); setProfileOpen(false) }}
                      className="w-full text-xs text-gray-400 hover:text-red-500 py-1.5 text-center transition-colors"
                    >
                      ✕ Désactiver le profil
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay to close dropdown */}
      {profileOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setProfileOpen(false)}
        />
      )}
    </>
  )
}
