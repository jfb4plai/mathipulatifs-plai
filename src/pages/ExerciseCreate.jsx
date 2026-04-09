import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'

const manipulatives = [
  {
    id: 'base10',
    emoji: '🟦',
    titre: 'Blocs de base 10',
    description: 'Valeur positionnelle, composition et décomposition des nombres',
  },
  {
    id: 'droite-numerique',
    emoji: '📏',
    titre: 'Droite numérique',
    description: 'Situer des nombres, comparer, estimer',
  },
  {
    id: 'fractions',
    emoji: '🍕',
    titre: 'Barres de fractions',
    description: 'Visualiser, comparer, trouver des fractions équivalentes',
  },
  {
    id: 'cuisenaire',
    emoji: '🌈',
    titre: 'Réglettes Cuisenaire',
    description: 'Décomposer, additionner, comparer avec des réglettes colorées',
  },
]

const FRACTION_DENOMINATORS = [2, 3, 4, 5, 6, 8, 10, 12]

export default function ExerciseCreate() {
  const navigate = useNavigate()
  const { dyslexicFont, largeText, focusMode } = useAccessibility()

  const [titre, setTitre] = useState('')
  const [consigne, setConsigne] = useState('')
  const [selectedManip, setSelectedManip] = useState(null)
  const [cpaMode, setCpaMode] = useState(false)

  // Base10 config
  const [b10Target, setB10Target] = useState('')
  const [b10Max, setB10Max] = useState(999)

  // Droite numérique config
  const [dnMin, setDnMin] = useState(0)
  const [dnMax, setDnMax] = useState(20)
  const [dnStep, setDnStep] = useState(1)
  const [dnMode, setDnMode] = useState('libre')

  // Fractions config
  const [fracDenominators, setFracDenominators] = useState([2, 3, 4, 6, 8])
  const [fracMode, setFracMode] = useState('libre')

  // Cuisenaire config
  const [cuiTarget, setCuiTarget] = useState('')
  const [cuiShowUnits, setCuiShowUnits] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [createdToken, setCreatedToken] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState(false)

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] ${textClass}`
  const labelClass = 'block text-sm font-semibold text-gray-700 mb-1'

  const toggleFracDenominator = (d) => {
    setFracDenominators((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b)
    )
  }

  const buildConfig = () => {
    if (selectedManip === 'base10') {
      return {
        targetNumber: b10Target !== '' ? parseInt(b10Target) : undefined,
        maxNumber: parseInt(b10Max),
        showCounter: true,
        cpaMode,
      }
    }
    if (selectedManip === 'droite-numerique') {
      return {
        min: parseInt(dnMin),
        max: parseInt(dnMax),
        step: parseInt(dnStep),
        mode: dnMode,
        showLabels: true,
        cpaMode,
      }
    }
    if (selectedManip === 'fractions') {
      return {
        denominators: fracDenominators,
        mode: fracMode,
        cpaMode,
      }
    }
    if (selectedManip === 'cuisenaire') {
      return {
        targetNumber: cuiTarget !== '' ? parseInt(cuiTarget) : undefined,
        showCounter: true,
        showUnits: cuiShowUnits,
        cpaMode,
      }
    }
    return {}
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!selectedManip) {
      setError('Veuillez choisir un manipulable.')
      return
    }
    if (!supabase) {
      setError('Base de données non configurée. Veuillez configurer les variables Supabase.')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data: teacherData, error: tErr } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (tErr) throw tErr

      const config = buildConfig()
      const { data: exData, error: exErr } = await supabase
        .from('exercises')
        .insert({
          teacher_id: teacherData.id,
          titre,
          consigne: consigne || null,
          manipulative: selectedManip,
          config,
        })
        .select()
        .single()
      if (exErr) throw exErr

      setCreatedToken(exData.token)
      setSuccess('Exercice créé avec succès !')
    } catch (err) {
      setError(err.message || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  const studentUrl = createdToken ? `${window.location.origin}/exercice/${createdToken}` : null

  const copyUrl = () => {
    if (!studentUrl) return
    navigator.clipboard.writeText(studentUrl).then(() => {
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2000)
    })
  }

  if (success && studentUrl) {
    return (
      <div className={`${fontClass} ${textClass} max-w-2xl mx-auto px-4 py-12`}>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Exercice créé !</h2>
          <p className="text-green-700 mb-6">Partagez ce lien avec vos élèves :</p>
          <div className="bg-white border border-green-300 rounded-xl p-4 mb-4">
            <code className="text-sm text-gray-700 break-all">{studentUrl}</code>
          </div>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={copyUrl}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors min-h-[44px]"
            >
              {copyFeedback ? '✓ Copié !' : 'Copier le lien'}
            </button>
            <Link
              to="/tableau-de-bord"
              className="bg-white border border-gray-300 hover:border-gray-400 text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors min-h-[44px] flex items-center"
            >
              Mon tableau de bord
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${fontClass} ${textClass} max-w-3xl mx-auto px-4 py-8`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/tableau-de-bord"
          className="text-gray-500 hover:text-gray-700 text-sm border border-gray-200 hover:border-gray-300 py-2 px-3 rounded-lg min-h-[44px] flex items-center"
        >
          ← Retour
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Créer un exercice</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Titre */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-700 mb-4">1. Informations générales</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Titre de l'exercice *</label>
              <input
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                required
                placeholder="Ex : Composer le nombre 234"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Consigne pour l'élève
                {!focusMode && <span className="text-xs font-normal text-gray-400 ml-2">(sera lue à voix haute si le mode audio est activé)</span>}
              </label>
              <textarea
                value={consigne}
                onChange={(e) => setConsigne(e.target.value)}
                placeholder="Ex : Utilise les blocs pour représenter le nombre 234."
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </div>

        {/* Manipulative choice */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-700 mb-4">2. Choisir un manipulable *</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {manipulatives.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedManip(m.id)}
                className={`p-4 rounded-xl border-2 text-left transition-all min-h-[44px] ${
                  selectedManip === m.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-1">{m.emoji}</div>
                <div className="font-bold text-gray-800 text-sm">{m.titre}</div>
                {!focusMode && <div className="text-xs text-gray-500 mt-0.5">{m.description}</div>}
              </button>
            ))}
          </div>
        </div>

        {/* Config panel */}
        {selectedManip && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-bold text-gray-700 mb-4">3. Configuration</h2>

            {selectedManip === 'base10' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Nombre cible (optionnel)</label>
                  <input
                    type="number"
                    value={b10Target}
                    onChange={(e) => setB10Target(e.target.value)}
                    min={1}
                    max={999}
                    placeholder="Ex : 234 (laisser vide pour exploration libre)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Nombre maximum</label>
                  <input
                    type="number"
                    value={b10Max}
                    onChange={(e) => setB10Max(e.target.value)}
                    min={1}
                    max={999}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {selectedManip === 'droite-numerique' && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>Minimum</label>
                    <input type="number" value={dnMin} onChange={(e) => setDnMin(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Maximum</label>
                    <input type="number" value={dnMax} onChange={(e) => setDnMax(e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Pas</label>
                    <input type="number" value={dnStep} min={1} onChange={(e) => setDnStep(e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={dnMode} onChange={(e) => setDnMode(e.target.value)} className={inputClass}>
                    <option value="libre">Libre (exploration)</option>
                    <option value="placer">Placer un nombre (exercice guidé)</option>
                  </select>
                </div>
              </div>
            )}

            {selectedManip === 'fractions' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Dénominateurs disponibles</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {FRACTION_DENOMINATORS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleFracDenominator(d)}
                        className={`w-12 h-12 rounded-xl font-bold text-sm transition-colors border-2 ${
                          fracDenominators.includes(d)
                            ? 'bg-blue-500 border-blue-500 text-white'
                            : 'bg-white border-gray-300 text-gray-600 hover:border-blue-300'
                        }`}
                      >
                        /{d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={fracMode} onChange={(e) => setFracMode(e.target.value)} className={inputClass}>
                    <option value="libre">Libre (exploration)</option>
                    <option value="comparer">Comparer deux fractions</option>
                  </select>
                </div>
              </div>
            )}

            {selectedManip === 'cuisenaire' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Total cible (optionnel)</label>
                  <input
                    type="number"
                    value={cuiTarget}
                    onChange={(e) => setCuiTarget(e.target.value)}
                    min={1}
                    max={100}
                    placeholder="Ex : 10 (laisser vide pour exploration libre)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={cuiShowUnits}
                      onChange={(e) => setCuiShowUnits(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-indigo-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-gray-700 text-sm group-hover:text-indigo-600 transition-colors">
                        Afficher les unités par défaut
                      </div>
                      {!focusMode && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Les réglettes seront subdivisées en cellules dès l'ouverture — recommandé pour P1–P2 et élèves en difficulté.
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* CPA mode — for all manipulatives */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={cpaMode}
                  onChange={(e) => setCpaMode(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                    Mode CPA guidé
                  </div>
                  {!focusMode && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Après la manipulation, guide l'élève vers la représentation picturale (dessin) puis abstraite (notation).
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedManip}
          className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors min-h-[44px]"
        >
          {loading ? 'Création en cours…' : 'Créer l\'exercice'}
        </button>
      </form>
    </div>
  )
}
