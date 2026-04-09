import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const manipulativeLabels = {
  base10: { label: 'Blocs base 10', color: 'bg-blue-100 text-blue-700' },
  'droite-numerique': { label: 'Droite numérique', color: 'bg-green-100 text-green-700' },
  fractions: { label: 'Fractions', color: 'bg-purple-100 text-purple-700' },
  cuisenaire: { label: 'Réglettes Cuisenaire', color: 'bg-orange-100 text-orange-700' },
}

function ResultsChart({ sessions }) {
  const correct = sessions.filter((s) => s.correct === true).length
  const incorrect = sessions.filter((s) => s.correct === false).length
  const noTarget = sessions.filter((s) => s.correct === null).length
  const total = sessions.length
  if (total === 0) return null

  const bars = [
    { label: 'Correct', count: correct, color: '#10B981' },
    { label: 'À revoir', count: incorrect, color: '#F59E0B' },
    { label: 'Libre', count: noTarget, color: '#94A3B8' },
  ].filter((b) => b.count > 0)

  const maxCount = Math.max(...bars.map((b) => b.count), 1)
  const chartH = 80
  const barW = 40
  const gap = 20

  return (
    <svg
      width={bars.length * (barW + gap)}
      height={chartH + 36}
      aria-label="Graphique des résultats"
    >
      {bars.map((bar, i) => {
        const barH = Math.max(4, Math.round((bar.count / maxCount) * chartH))
        const x = i * (barW + gap)
        const y = chartH - barH
        return (
          <g key={bar.label}>
            <rect x={x} y={y} width={barW} height={barH} fill={bar.color} rx={4} />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={12} fontWeight="bold" fill={bar.color}>
              {bar.count}
            </text>
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={10} fill="#64748B">
              {bar.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function printResults(ex, sessions) {
  const mLabel = manipulativeLabels[ex.manipulative]?.label || ex.manipulative
  const correct = sessions.filter((s) => s.correct === true).length
  const incorrect = sessions.filter((s) => s.correct === false).length
  const date = new Date().toLocaleDateString('fr-BE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const rows = sessions
    .map(
      (s, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.prenom_eleve || '—'}</td>
      <td>${s.correct === true ? '✓' : s.correct === false ? '✗' : '—'}</td>
      <td>${s.duree_secondes != null ? s.duree_secondes + 's' : '—'}</td>
      <td>${new Date(s.created_at).toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' })}</td>
    </tr>`
    )
    .join('')

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Résultats — ${ex.titre}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 2cm auto; color: #1a202c; }
    h1 { font-size: 1.4rem; margin-bottom: 0.2rem; }
    .meta { font-size: 0.85rem; color: #64748b; margin-bottom: 1rem; }
    .summary { display: flex; gap: 2rem; margin-bottom: 1.5rem; }
    .stat { background: #f1f5f9; padding: 0.6rem 1.2rem; border-radius: 8px; text-align: center; }
    .stat strong { display: block; font-size: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th { background: #f8fafc; text-align: left; padding: 0.5rem 0.75rem; border-bottom: 2px solid #e2e8f0; }
    td { padding: 0.5rem 0.75rem; border-bottom: 1px solid #f1f5f9; }
    .footer { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; text-align: center; }
  </style></head><body>
  <h1>${ex.titre}</h1>
  <div class="meta">${mLabel} · Imprimé le ${date}</div>
  ${ex.consigne ? `<p style="background:#eff6ff;padding:0.6rem 1rem;border-radius:6px;font-size:0.85rem;margin-bottom:1rem;">${ex.consigne}</p>` : ''}
  <div class="summary">
    <div class="stat"><strong>${sessions.length}</strong>Sessions</div>
    <div class="stat" style="color:#10b981"><strong>${correct}</strong>Correct</div>
    <div class="stat" style="color:#f59e0b"><strong>${incorrect}</strong>À revoir</div>
  </div>
  <table>
    <tr><th>#</th><th>Prénom</th><th>Résultat</th><th>Durée</th><th>Heure</th></tr>
    ${rows}
  </table>
  <div class="footer">Mathipulatifs PLAI · Pôle Liégeois d'Accompagnement vers une École Inclusive · FWB</div>
  </body></html>`

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 500)
}

export default function Dashboard() {
  const [teacher, setTeacher] = useState(null)
  const [exercises, setExercises] = useState([])
  const [sessionCounts, setSessionCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState(null)
  const [resultsPanel, setResultsPanel] = useState(null) // exercise id
  const [sessionsData, setSessionsData] = useState({}) // exerciseId → sessions[]
  const [loadingSessions, setLoadingSessions] = useState(false)

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

  const toggleResultsPanel = async (exId) => {
    if (resultsPanel === exId) {
      setResultsPanel(null)
      return
    }
    setResultsPanel(exId)
    if (sessionsData[exId]) return // already loaded

    setLoadingSessions(true)
    try {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('exercise_id', exId)
        .order('created_at', { ascending: false })
      setSessionsData((prev) => ({ ...prev, [exId]: data || [] }))
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingSessions(false)
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
    if (resultsPanel === id) setResultsPanel(null)
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
              const isOpen = resultsPanel === ex.id
              const sessions = sessionsData[ex.id] || []

              return (
                <div key={ex.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-gray-800">{ex.titre}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mLabel.color}`}>
                            {mLabel.label}
                          </span>
                          {ex.config?.cpaMode && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                              CPA
                            </span>
                          )}
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
                        {sessCount > 0 && (
                          <button
                            onClick={() => toggleResultsPanel(ex.id)}
                            className={`text-sm font-medium border px-3 py-2 rounded-lg transition-colors min-h-[44px] ${
                              isOpen
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'text-blue-500 hover:text-blue-700 border-blue-200 hover:border-blue-400'
                            }`}
                          >
                            {isOpen ? 'Fermer' : '📊 Résultats'}
                          </button>
                        )}
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

                  {/* Results panel */}
                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      {loadingSessions && !sessionsData[ex.id] ? (
                        <div className="text-center text-blue-500 py-4 animate-pulse">Chargement…</div>
                      ) : sessions.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">Aucune session enregistrée.</p>
                      ) : (
                        <div>
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                              <h4 className="font-semibold text-gray-700 text-sm mb-3">
                                {sessions.length} session{sessions.length > 1 ? 's' : ''}
                              </h4>
                              <ResultsChart sessions={sessions} />
                            </div>
                            <button
                              onClick={() => printResults(ex, sessions)}
                              className="text-xs bg-white border border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg transition-colors flex items-center gap-1 min-h-[36px] shrink-0"
                            >
                              🖨 Exporter PDF
                            </button>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-xs text-gray-500 border-b border-gray-200">
                                  <th className="text-left py-2 pr-4 font-semibold">Prénom</th>
                                  <th className="text-left py-2 pr-4 font-semibold">Résultat</th>
                                  <th className="text-left py-2 pr-4 font-semibold">Durée</th>
                                  <th className="text-left py-2 font-semibold">Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sessions.map((s) => (
                                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                                    <td className="py-2 pr-4 text-gray-800 font-medium">
                                      {s.prenom_eleve || <span className="text-gray-400 italic">Anonyme</span>}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {s.correct === true && <span className="text-green-600 font-bold">✓ Correct</span>}
                                      {s.correct === false && <span className="text-amber-600 font-bold">✗ À revoir</span>}
                                      {s.correct === null && <span className="text-gray-400">Libre</span>}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                      {s.duree_secondes != null ? `${s.duree_secondes}s` : '—'}
                                    </td>
                                    <td className="py-2 text-gray-400 text-xs">
                                      {new Date(s.created_at).toLocaleDateString('fr-BE', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit',
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
