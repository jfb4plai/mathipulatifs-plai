import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nom, setNom] = useState('')
  const [ecole, setEcole] = useState('')
  const [niveau, setNiveau] = useState('les deux')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const navigate = useNavigate()
  const { dyslexicFont, largeText, focusMode } = useAccessibility()

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] ${textClass}`
  const labelClass = `block text-sm font-semibold text-gray-700 mb-1`

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/tableau-de-bord', { replace: true })
    })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (!supabase) {
      setError('La connexion à la base de données n\'est pas configurée. Veuillez définir les variables d\'environnement Supabase.')
      setLoading(false)
      return
    }

    try {
      if (mode === 'login') {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
        if (authError) throw authError
        if (data.session) navigate('/tableau-de-bord', { replace: true })
      } else {
        // Register
        const { data, error: authError } = await supabase.auth.signUp({ email, password })
        if (authError) throw authError

        if (data.user) {
          const { error: dbError } = await supabase.from('teachers').insert({
            user_id: data.user.id,
            nom,
            ecole: ecole || null,
            niveau,
          })
          if (dbError) throw dbError
          setSuccess('Compte créé ! Vérifiez votre e-mail pour confirmer votre inscription, puis connectez-vous.')
          setMode('login')
        }
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${fontClass} ${textClass} min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12`}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="text-blue-500 text-sm hover:underline">← Retour à l'accueil</Link>
          <div className="text-4xl mt-4 mb-2" aria-hidden="true">🧮</div>
          <h1 className="text-2xl font-bold text-gray-800">Mathipulatifs PLAI</h1>
          <p className="text-gray-500 text-sm mt-1">Espace enseignant·e</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 font-semibold text-sm transition-colors min-h-[44px] ${mode === 'login' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Connexion
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccess(null) }}
              className={`flex-1 py-2.5 font-semibold text-sm transition-colors min-h-[44px] ${mode === 'register' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Créer un compte
            </button>
          </div>

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
            {mode === 'register' && (
              <>
                <div>
                  <label className={labelClass}>Nom complet *</label>
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    placeholder="Marie Dupont"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>École (optionnel)</label>
                  <input
                    type="text"
                    value={ecole}
                    onChange={(e) => setEcole(e.target.value)}
                    placeholder="École communale de..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Niveau enseigné</label>
                  <select
                    value={niveau}
                    onChange={(e) => setNiveau(e.target.value)}
                    className={inputClass}
                  >
                    <option value="primaire">Primaire</option>
                    <option value="secondaire">Secondaire</option>
                    <option value="les deux">Les deux</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className={labelClass}>Adresse e-mail *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vous@exemple.be"
                className={inputClass}
                autoComplete="email"
              />
            </div>

            <div>
              <label className={labelClass}>Mot de passe *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className={inputClass}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-bold rounded-xl transition-colors min-h-[44px] text-lg mt-2"
            >
              {loading
                ? 'Chargement…'
                : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
            </button>
          </form>
        </div>

        {!focusMode && (
          <p className="text-center text-xs text-gray-400 mt-6">
            Vos données sont sécurisées et ne sont pas partagées · RGPD
          </p>
        )}
      </div>
    </div>
  )
}
