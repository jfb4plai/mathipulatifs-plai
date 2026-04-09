import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const manipulativeLabels = {
  base10: { label: 'Blocs base 10', color: 'bg-blue-100 text-blue-700' },
  'droite-numerique': { label: 'Droite numérique', color: 'bg-green-100 text-green-700' },
  fractions: { label: 'Fractions', color: 'bg-purple-100 text-purple-700' },
}

export default function Dashboard() {
  const [teacher, setTeacher] = useState(null)
  const [exercises, setExercises] = useState([])
  const [sessionCounts, setSessionCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState(null)

  const navigate = useNavigate()
  const { dyslexicFont, largeText, focusMode } = useAccessibility()
  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/connexion'); return }

      const { data: teacherData } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', user.id)
        .single()

      setTeacher(teacherData)

      if (teacherData) {
        const { data: exData } = await supabase
          .from('exercises')
          .select('*')
          .eq('teacher_id', teacherData.id)
          .order('created_at', { ascending: false })

        setExercises(exData || [])

        // Count sessions per exercise
        if (exData && exData.length > 0) {
          const { data: sessData } = await supabase
            .from('sessions')
            .select('exercise_id')
            .in('exercise_id', exData.map((e) => e.id))

          const counts = {}
          ;(sessData || []).forEach((s) => {
            counts[s.exercise_id] = (counts[s.exercise_id] || 0) + 1
          })
          setSessionCounts(counts)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cet exercice ? Cette action est irréversible.')) return
    await supabase.from('exercises').delete().eq('id', id)
    setExercises((prev) => prev.filter((e) => e.id !== id))
  }

  const copyUrl = (token) => {
    const url = `${window.location.origin}/exercice/${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(token)
      setTimeout(() => setCopyFeedback(null), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-blue-600 text-lg animate-pulse">Chargement…</div>
      </div>
    )
  }

  if (!supabase) {
    return (
      <div className={`${fontClass} ${textClass} max-w-2xl mx-auto px-4 py-12`}>
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⚙️</div>
          <h2 className="text-xl font-bold text-yellow-800 mb-2">Configuration requise</h2>
          <p className="text-yellow-700 text-sm">
            Veuillez configurer les variables d'environnement Supabase pour utiliser l'espace enseignant.
            Copiez <code>.env.example</code> vers <code>.env</code> et renseignez vos clés.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${fontClass} ${textClass} min-h-screen bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Bonjour{teacher ? `, ${teacher.nom}` : ''} 👋
            </h1>
            {!focusMode && teacher?.ecole && (
              <p className="text-sm text-gray-500">{teacher.ecole}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              to="/exercice/creer"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-xl text-sm transition-colors min-h-[44px] flex items-center"
            >
              + Créer un exercice
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 text-sm border border-gray-200 hover:border-red-200 py-2 px-4 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-lg font-bold text-gray-700 mb-4">
          Mes exercices ({exercises.length})
        </h2>

        {exercises.length === 0 ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3" aria-hidden="true">📝</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Aucun exercice pour l'instant</h3>
            {!focusMode && (
              <p className="text-gray-500 text-sm mb-6">
                Créez votre premier exercice et partagez-le avec vos élèves en un clic.
              </p>
            )}
            <Link
              to="/exercice/creer"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors inline-block min-h-[44px]"
            >
              Créer mon premier exercice
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {exercises.map((ex) => {
              const mLabel = manipulativeLabels[ex.manipulative] || { label: ex.manipulative, color: 'bg-gray-100 text-gray-700' }
              const studentUrl = `${window.location.origin}/exercice/${ex.token}`
              const sessCount = sessionCounts[ex.id] || 0

              return (
                <div key={ex.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-gray-800">{ex.titre}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mLabel.color}`}>
                          {mLabel.label}
                        </span>
                        {sessCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                            {sessCount} réponse{sessCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {ex.consigne && !focusMode && (
                        <p className="text-sm text-gray-500 truncate mb-2">{ex.consigne}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 truncate max-w-xs block">
                          {studentUrl}
                        </code>
                        <button
                          onClick={() => copyUrl(ex.token)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-lg transition-colors min-h-[36px] shrink-0"
                          title="Copier le lien"
                        >
                          {copyFeedback === ex.token ? '✓ Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/exercice/${ex.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-3 py-2 rounded-lg transition-colors min-h-[44px] flex items-center"
                      >
                        Aperçu
                      </a>
                      <button
                        onClick={() => handleDelete(ex.id)}
                        className="text-sm text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors min-h-[44px]"
                        title="Supprimer"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
