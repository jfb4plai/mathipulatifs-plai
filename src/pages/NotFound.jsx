import { Link } from 'react-router-dom'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

export default function NotFound() {
  const { dyslexicFont, largeText } = useAccessibility()
  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} min-h-screen flex items-center justify-center bg-gray-50 px-4`}>
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6" aria-hidden="true">🔍</div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Page introuvable</h2>
        <p className="text-gray-500 mb-8">
          La page que tu cherches n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-colors min-h-[44px]"
        >
          ← Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
