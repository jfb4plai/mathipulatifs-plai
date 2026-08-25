import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { dyslexicFont, largeText } = useAccessibility()

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] ${textClass}`
  const labelClass = `block text-sm font-semibold text-gray-700 mb-1`

  useEffect(() => {
    // Supabase injecte la session via le lien de réinitialisation reçu par e-mail
    if (supabase) supabase.auth.getSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!supabase) {
      setError('La connexion à la base de données n\'est pas configurée.')
      setLoading(false)
      return
    }

    const { error: authError } = await supabase.auth.updateUser({ password })
    if (authError) {
      setError(authError.message)
    } else {
      setSuccess('Mot de passe mis à jour ! Redirection…')
      setTimeout(() => navigate('/tableau-de-bord', { replace: true }), 1500)
    }
    setLoading(false)
  }

  return (
    <div className={`${fontClass} ${textClass} min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-blue-500 text-sm hover:underline">← Retour à l'accueil</Link>
          <div className="text-4xl mt-4 mb-2" aria-hidden="true">🧮</div>
          <h1 className="text-2xl font-bold text-gray-800">Nouveau mot de passe</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Nouveau mot de passe *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className={inputClass}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors min-h-[44px] text-lg mt-2"
            >
              {loading ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
