import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

export default function AccessibilityBar() {
  const {
    dyslexicFont,
    largeText,
    focusMode,
    ttsEnabled,
    toggleDyslexicFont,
    toggleLargeText,
    toggleFocusMode,
    toggleTts,
  } = useAccessibility()

  const btnBase =
    'flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors min-h-[36px] min-w-[44px] focus:outline-none focus:ring-2 focus:ring-blue-400'
  const activeClass = 'bg-blue-500 text-white'
  const inactiveClass = 'bg-gray-100 text-gray-600 hover:bg-gray-200'

  return (
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
    </div>
  )
}
