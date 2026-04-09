import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const MANIP_LABELS = {
  base10:            { label: 'Blocs base 10',       color: 'bg-blue-100 text-blue-700' },
  'droite-numerique':{ label: 'Droite numérique',    color: 'bg-green-100 text-green-700' },
  fractions:         { label: 'Fractions',           color: 'bg-purple-100 text-purple-700' },
  cuisenaire:        { label: 'Réglettes Cuisenaire',color: 'bg-orange-100 text-orange-700' },
  cadres10:          { label: 'Cadres à 10',         color: 'bg-red-100 text-red-700' },
  grille100:         { label: 'Grille des 100',      color: 'bg-teal-100 text-teal-700' },
}

const NIVEAUX_PRIMAIRE  = ['P1','P2','P3','P4','P5','P6']
const NIVEAUX_SECONDAIRE = ['S1','S2','S3','S4','S5','S6','S7']
const ALL_NIVEAUX = ['tous', ...NIVEAUX_PRIMAIRE, ...NIVEAUX_SECONDAIRE]

export default function Gallery() {
  const { dyslexicFont, largeText, focusMode } = useAccessibility()
  const navigate = useNavigate()

  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [teacher, setTeacher]   = useState(null)
  const [niveau, setNiveau]     = useState('tous')
  const [manipFilter, setManipFilter] = useState('tous')
  const [copying, setCopying]   = useState(null)
  const [copied, setCopied]     = useState(null)

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  useEffect(() => {
    loadGallery()
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (!supabase) return
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('teachers').select('id').eq('user_id', user.id).single()
      setTeacher(data)
    }
  }

  const loadGallery = async () => {
    if (!supabase) { setLoading(false); return }
    const { data } = await supabase
      .from('gallery')
      .select('*, teachers(nom, ecole)')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  const handleCopy = async (item) => {
    if (!teacher || !supabase) return
    setCopying(item.id)
    try {
      await supabase.from('exercises').insert({
        teacher_id: teacher.id,
        titre: item.titre,
        consigne: item.consigne,
        manipulative: item.manipulative,
        config: item.config,
      })
      setCopied(item.id)
      setTimeout(() => setCopied(null), 3000)
    } catch (err) {
      console.error(err)
    } finally {
      setCopying(null)
    }
  }

  const filtered = items.filter((item) => {
    const niveauOk = niveau === 'tous' || item.niveau === niveau || item.niveau === 'tous'
    const manipOk  = manipFilter === 'tous' || item.manipulative === manipFilter
    return niveauOk && manipOk
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-blue-600 text-lg animate-pulse">Chargement de la galerie…</div>
      </div>
    )
  }

  return (
    <div className={`${fontClass} ${textClass} min-h-screen bg-gray-50`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm border border-gray-200 hover:border-gray-300 py-1.5 px-3 rounded-lg min-h-[36px] flex items-center">
              ← Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-3">Galerie FWB 🏫</h1>
          {!focusMode && (
            <p className="text-gray-500 text-sm mt-1">
              Exercices créés et partagés par des enseignant·e·s de la Fédération Wallonie-Bruxelles.
              Copiez-les directement dans votre espace.
            </p>
          )}
          {teacher && (
            <Link
              to="/tableau-de-bord"
              className="inline-block mt-3 text-xs text-blue-500 hover:underline"
            >
              → Partager mes exercices depuis mon tableau de bord
            </Link>
          )}
          {!teacher && supabase && (
            <Link
              to="/connexion"
              className="inline-block mt-3 text-xs text-blue-500 hover:underline"
            >
              → Connectez-vous pour copier ou partager des exercices
            </Link>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-12 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto space-y-2">
          {/* Niveau filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Niveau :</span>
            {['tous', ...NIVEAUX_PRIMAIRE, ...NIVEAUX_SECONDAIRE].map((n) => (
              <button
                key={n}
                onClick={() => setNiveau(n)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  niveau === n
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {n === 'tous' ? 'Tous' : n}
              </button>
            ))}
          </div>
          {/* Manipulable filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-500 shrink-0">Manipulable :</span>
            <button
              onClick={() => setManipFilter('tous')}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                manipFilter === 'tous' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Tous
            </button>
            {Object.entries(MANIP_LABELS).map(([id, { label, color }]) => (
              <button
                key={id}
                onClick={() => setManipFilter(id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  manipFilter === id ? 'bg-blue-500 text-white' : `${color} hover:opacity-80`
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {!supabase && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">⚙️</div>
            <p className="text-yellow-700 text-sm">Galerie non disponible — Supabase non configuré.</p>
          </div>
        )}

        {supabase && filtered.length === 0 && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="text-lg font-bold text-gray-700 mb-2">Aucun exercice pour ces filtres</h3>
            {!focusMode && (
              <p className="text-gray-500 text-sm">
                Modifiez les filtres ou soyez le premier à partager un exercice de ce type !
              </p>
            )}
          </div>
        )}

        {supabase && items.length === 0 && !loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center mb-6">
            <div className="text-4xl mb-3">🌱</div>
            <h3 className="font-bold text-blue-800 mb-1">La galerie est encore vide</h3>
            <p className="text-blue-600 text-sm">
              Soyez parmi les premiers enseignants FWB à partager vos exercices Mathipulatifs !
            </p>
            {teacher && (
              <Link
                to="/tableau-de-bord"
                className="inline-block mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-xl transition-colors text-sm"
              >
                Partager depuis mon tableau de bord
              </Link>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const mLabel = MANIP_LABELS[item.manipulative] || { label: item.manipulative, color: 'bg-gray-100 text-gray-700' }
            return (
              <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base leading-snug">{item.titre}</h3>
                    {item.consigne && !focusMode && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.consigne}</p>
                    )}
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mLabel.color}`}>
                    {mLabel.label}
                  </span>
                  {item.niveau && item.niveau !== 'tous' && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">
                      {item.niveau}
                    </span>
                  )}
                </div>

                {/* Description pédagogique */}
                {item.description_peda && !focusMode && (
                  <p className="text-xs text-gray-400 italic border-l-2 border-gray-200 pl-2 leading-relaxed">
                    {item.description_peda}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-400 truncate">
                    {item.teachers?.ecole || item.teachers?.nom || 'Enseignant·e FWB'}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <a
                      href={`/exercice/${item.exercise_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 hover:border-blue-400 px-2.5 py-1.5 rounded-lg transition-colors"
                    >
                      Essayer
                    </a>
                    {teacher ? (
                      <button
                        onClick={() => handleCopy(item)}
                        disabled={copying === item.id || copied === item.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          copied === item.id
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50'
                        }`}
                      >
                        {copied === item.id ? '✓ Copié !' : copying === item.id ? '…' : 'Utiliser'}
                      </button>
                    ) : (
                      <Link
                        to="/connexion"
                        className="text-xs text-gray-500 hover:text-blue-500 border border-gray-200 hover:border-blue-200 px-2.5 py-1.5 rounded-lg transition-colors"
                        title="Connectez-vous pour copier"
                      >
                        Utiliser
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length > 0 && !focusMode && (
          <p className="text-center text-xs text-gray-400 mt-8">
            {filtered.length} exercice{filtered.length > 1 ? 's' : ''} dans la galerie FWB
          </p>
        )}
      </div>
    </div>
  )
}
