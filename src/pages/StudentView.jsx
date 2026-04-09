import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'
import Base10Blocks from '../components/manipulatives/Base10Blocks.jsx'
import NumberLine from '../components/manipulatives/NumberLine.jsx'
import FractionBars from '../components/manipulatives/FractionBars.jsx'
import CuisenaireRods from '../components/manipulatives/CuisenaireRods.jsx'
import TenFrames from '../components/manipulatives/TenFrames.jsx'
import HundredChart from '../components/manipulatives/HundredChart.jsx'

// Demo configs for tokens starting with "demo-"
const DEMO_CONFIGS = {
  'demo-base10': {
    titre: 'Exploration — Blocs de base 10',
    consigne: 'Explore librement les blocs de base 10. Clique sur les blocs dans la banque pour les ajouter à ton espace de travail.',
    manipulative: 'base10',
    config: { maxNumber: 999, showCounter: true },
  },
  'demo-droite-numerique': {
    titre: 'Exploration — Droite numérique',
    consigne: 'Glisse le jeton sur la droite numérique pour te déplacer de 0 à 20.',
    manipulative: 'droite-numerique',
    config: { min: 0, max: 20, step: 1, mode: 'libre', showLabels: true },
  },
  'demo-fractions': {
    titre: 'Exploration — Barres de fractions',
    consigne: 'Clique sur les parties des barres pour les colorier. Découvre les fractions équivalentes !',
    manipulative: 'fractions',
    config: { denominators: [2, 3, 4, 6, 8, 12], mode: 'libre' },
  },
  'demo-cuisenaire': {
    titre: 'Exploration — Réglettes Cuisenaire',
    consigne: 'Clique sur les réglettes pour les ajouter à ton espace de travail. Compose le nombre 10 de différentes façons !',
    manipulative: 'cuisenaire',
    config: { targetNumber: 10, showCounter: true },
  },
  'demo-cadres10': {
    titre: 'Exploration — Cadres à 10',
    consigne: 'Clique sur les cercles pour les remplir. Représente le nombre 7 dans le cadre !',
    manipulative: 'cadres10',
    config: { frames: 1, targetNumber: 7, counterColor: 'red', showCounter: true },
  },
  'demo-grille100': {
    titre: 'Exploration — Grille des 100',
    consigne: 'Colorie tous les multiples de 5 dans la grille. Utilise la couleur de ton choix !',
    manipulative: 'grille100',
    config: { startAt: 1, mode: 'multiples', multipleOf: 5 },
  },
}

const ENCOURAGEMENTS = [
  'Excellent travail ! 🌟',
  'Bravo ! Tu as bien répondu ! 👏',
  'Super ! Continue comme ça ! 💪',
  'Félicitations ! 🎉',
  'Bien joué ! Tu es sur la bonne voie ! 🚀',
]

function ManipulativeComponent({ manipulative, config, onValidate }) {
  if (manipulative === 'base10') return <Base10Blocks config={config} onValidate={onValidate} />
  if (manipulative === 'droite-numerique') return <NumberLine config={config} onValidate={onValidate} />
  if (manipulative === 'fractions') return <FractionBars config={config} onValidate={onValidate} />
  if (manipulative === 'cuisenaire') return <CuisenaireRods config={config} onValidate={onValidate} />
  if (manipulative === 'cadres10') return <TenFrames config={config} onValidate={onValidate} />
  if (manipulative === 'grille100') return <HundredChart config={config} onValidate={onValidate} />
  return <div className="text-gray-500">Manipulable inconnu : {manipulative}</div>
}

export default function StudentView() {
  const { token } = useParams()
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const [exercise, setExercise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [prenom, setPrenom] = useState('')
  const [prenomConfirmed, setPrenomConfirmed] = useState(false)
  const [startTime] = useState(Date.now())
  const [validated, setValidated] = useState(false)
  const [encouragement] = useState(() => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)])

  // CPA phases: 'concret' | 'pictural' | 'abstrait' | 'done'
  const [cpaPhase, setCpaPhase] = useState('concret')
  const [cpaAbstractInput, setCpaAbstractInput] = useState('')
  const [manipResult, setManipResult] = useState(null)

  const isDemo = token?.startsWith('demo-')
  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'
  const inputClass = `w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 min-h-[44px] ${textClass}`

  useEffect(() => {
    if (isDemo) {
      const demoEx = DEMO_CONFIGS[token]
      if (demoEx) {
        setExercise(demoEx)
      } else {
        setError('Démonstration introuvable.')
      }
      setLoading(false)
      setPrenomConfirmed(true) // Skip name for demo
      return
    }

    if (!supabase) {
      setError('Base de données non configurée.')
      setLoading(false)
      return
    }

    supabase
      .from('exercises')
      .select('*')
      .eq('token', token)
      .eq('publie', true)
      .single()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('Exercice introuvable ou non disponible.')
        } else {
          setExercise(data)
        }
        setLoading(false)
      })
  }, [token, isDemo])

  const saveSession = async (result, duree) => {
    if (!isDemo && supabase && exercise?.id) {
      await supabase.from('sessions').insert({
        exercise_id: exercise.id,
        prenom_eleve: prenom || null,
        reponse: result,
        correct: result?.correct ?? null,
        duree_secondes: duree,
      })
    }
  }

  const handleValidate = async (result) => {
    const duree = Math.round((Date.now() - startTime) / 1000)
    setManipResult({ ...result, duree })

    if (exercise?.config?.cpaMode) {
      // Enter CPA pictural phase after concret
      setCpaPhase('pictural')
    } else {
      setValidated(true)
      if (ttsEnabled) speak(encouragement)
      await saveSession(result, duree)
    }
  }

  const handleCpaPictural = () => {
    setCpaPhase('abstrait')
  }

  const handleCpaAbstrait = async () => {
    setCpaPhase('done')
    setValidated(true)
    if (ttsEnabled) speak(encouragement)
    const fullResult = { ...manipResult, cpaAbstractInput }
    await saveSession(fullResult, manipResult?.duree ?? 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-blue-600 text-lg animate-pulse">Chargement…</div>
      </div>
    )
  }

  if (error || !exercise) {
    return (
      <div className={`${fontClass} ${textClass} max-w-lg mx-auto px-4 py-12 text-center`}>
        <div className="text-5xl mb-4">❓</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Exercice introuvable</h1>
        <p className="text-gray-500 mb-6 text-sm">{error || 'Cet exercice n\'existe pas ou n\'est plus disponible.'}</p>
        <Link to="/" className="text-blue-500 hover:underline">← Retour à l'accueil</Link>
      </div>
    )
  }

  return (
    <div className={`${fontClass} ${textClass} max-w-3xl mx-auto px-4 py-6`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {isDemo && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
              Mode démo
            </span>
          )}
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">
            Mathipulatifs PLAI
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{exercise.titre}</h1>
      </div>

      {/* Consigne */}
      {exercise.consigne && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-blue-800 font-medium">{exercise.consigne}</p>
            </div>
            {ttsEnabled && (
              <button
                onClick={() => speak(exercise.consigne)}
                className="text-blue-500 hover:text-blue-700 shrink-0 text-xl min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Lire à voix haute"
                aria-label="Lire la consigne à voix haute"
              >
                🔊
              </button>
            )}
          </div>
        </div>
      )}

      {/* Prenom step (non-demo only) */}
      {!isDemo && !prenomConfirmed && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-700 mb-3">Avant de commencer…</h2>
          <p className="text-gray-600 text-sm mb-4">Entre ton prénom pour que ton enseignant·e puisse suivre tes résultats.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              placeholder="Ton prénom"
              className={`flex-1 ${inputClass}`}
              onKeyDown={(e) => e.key === 'Enter' && setPrenomConfirmed(true)}
              autoFocus
            />
            <button
              onClick={() => setPrenomConfirmed(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-6 rounded-xl transition-colors min-h-[44px]"
            >
              Commencer
            </button>
          </div>
        </div>
      )}

      {/* Manipulative — phase Concret */}
      {prenomConfirmed && cpaPhase === 'concret' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {!focusMode && !isDemo && prenom && (
            <p className="text-sm text-gray-400 mb-4">Bonjour {prenom} 👋</p>
          )}
          {exercise.config?.cpaMode && !focusMode && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Étape 1 — Concret</span>
              <span className="text-xs text-gray-400">Manipule, explore, construis.</span>
            </div>
          )}
          <ManipulativeComponent
            manipulative={exercise.manipulative}
            config={exercise.config || {}}
            onValidate={handleValidate}
          />
        </div>
      )}

      {/* CPA phase 2 — Pictural */}
      {prenomConfirmed && cpaPhase === 'pictural' && (
        <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Étape 2 — Pictural</span>
          </div>
          <div className="text-center py-6">
            <div className="text-5xl mb-4">✏️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Dessine ce que tu as construit</h2>
            <p className="text-gray-600 text-sm mb-6">
              Sur ton cahier ou ta feuille, fais un schéma de ce que tu viens de créer avec le manipulable.
            </p>
            <button
              onClick={handleCpaPictural}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-xl transition-colors min-h-[44px]"
            >
              {"J'ai dessiné, continuer →"}
            </button>
          </div>
        </div>
      )}

      {/* CPA phase 3 — Abstrait */}
      {prenomConfirmed && cpaPhase === 'abstrait' && (
        <div className="bg-white rounded-2xl border border-purple-200 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Étape 3 — Abstrait</span>
          </div>
          <div className="text-center py-4">
            <div className="text-5xl mb-4">🔢</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Écris la notation mathématique</h2>
            <p className="text-gray-600 text-sm mb-6">
              Traduis ce que tu as construit en chiffres et symboles mathématiques.
            </p>
            <input
              type="text"
              value={cpaAbstractInput}
              onChange={(e) => setCpaAbstractInput(e.target.value)}
              placeholder="Ex : 2 + 3 + 5 = 10"
              className="w-full max-w-sm mx-auto block px-4 py-3 border-2 border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 text-center text-lg font-mono mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && cpaAbstractInput.trim() && handleCpaAbstrait()}
            />
            <button
              onClick={handleCpaAbstrait}
              disabled={!cpaAbstractInput.trim()}
              className="bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white font-bold py-3 px-8 rounded-xl transition-colors min-h-[44px]"
            >
              Valider ma notation
            </button>
          </div>
        </div>
      )}

      {/* Post-validation feedback */}
      {validated && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700 mb-2">{encouragement}</p>
          {exercise.config?.cpaMode && cpaAbstractInput && !focusMode && (
            <p className="text-gray-600 text-sm mb-2">
              Ta notation : <span className="font-mono font-bold text-purple-700">{cpaAbstractInput}</span>
            </p>
          )}
          {!focusMode && (
            <p className="text-green-600 text-sm">
              Ton enseignant·e pourra voir ta réponse dans le tableau de bord.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 py-2 px-4 rounded-xl hover:bg-green-100 transition-colors min-h-[44px]"
          >
            Recommencer
          </button>
        </div>
      )}
    </div>
  )
}
