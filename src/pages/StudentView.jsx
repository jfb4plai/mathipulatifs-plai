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
import Clock from '../components/manipulatives/Clock.jsx'
import Money from '../components/manipulatives/Money.jsx'
import { generateSeries } from '../lib/seriesGenerators.js'

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
  'demo-horloge': {
    titre: 'Exploration — Horloge',
    consigne: "Place les aiguilles sur l'heure demandée.",
    manipulative: 'horloge',
    config: { mode: 'placer', granularity: 30, targetTime: { h: 2, m: 30 } },
  },
  'demo-monnaie': {
    titre: 'Exploration — Monnaie',
    consigne: 'Compose la somme de 3,50 € avec les pièces et billets.',
    manipulative: 'monnaie',
    config: { mode: 'composer', targetAmount: 350, maxDenomination: 500 },
  },
}

const ENCOURAGEMENTS = [
  'Excellent travail ! 🌟',
  'Bravo ! Tu as bien répondu ! 👏',
  'Super ! Continue comme ça ! 💪',
  'Félicitations ! 🎉',
  'Bien joué ! Tu es sur la bonne voie ! 🚀',
]

// Textes des étapes Pictural / Abstrait, adaptés par manipulable — une
// notation « mathématique » générique (2 + 3 + 5 = 10) n'a de sens que pour
// les manipulables de décomposition/composition de nombres. Horloge et
// Droite numérique n'ont pas d'équivalent « équation ».
const CPA_TEXTS = {
  base10: {
    pictural: 'Dessine les blocs (centaines, dizaines, unités) que tu as utilisés.',
    abstraitLabel: 'Écris le nombre en chiffres, ou sa décomposition.',
    abstraitPlaceholder: 'Ex : 234 ou 200 + 30 + 4',
  },
  'droite-numerique': {
    pictural: 'Dessine une droite numérique et indique où tu as placé le nombre.',
    abstraitLabel: 'Écris le nombre que tu as placé.',
    abstraitPlaceholder: 'Ex : 13',
  },
  fractions: {
    pictural: 'Dessine les barres de fractions que tu as coloriées.',
    abstraitLabel: 'Écris la fraction en chiffres.',
    abstraitPlaceholder: 'Ex : 3/4',
  },
  cuisenaire: {
    pictural: 'Dessine les réglettes que tu as utilisées, avec leur longueur.',
    abstraitLabel: "Écris l'addition correspondante.",
    abstraitPlaceholder: 'Ex : 5 + 3 + 2 = 10',
  },
  cadres10: {
    pictural: 'Dessine le(s) cadre(s) à 10 avec les cercles remplis.',
    abstraitLabel: 'Écris le nombre représenté.',
    abstraitPlaceholder: 'Ex : 7',
  },
  grille100: {
    pictural: 'Dessine la grille des 100 et colorie les nombres trouvés.',
    abstraitLabel: 'Écris la liste des nombres trouvés.',
    abstraitPlaceholder: 'Ex : 4, 8, 12, 16',
  },
  horloge: {
    pictural: 'Dessine un cadran et place les aiguilles comme tu l\'as fait.',
    abstraitLabel: "Écris l'heure sous forme chiffrée.",
    abstraitPlaceholder: 'Ex : 2h30',
  },
  monnaie: {
    pictural: 'Dessine les pièces et billets que tu as utilisés.',
    abstraitLabel: 'Écris le calcul de la somme.',
    abstraitPlaceholder: 'Ex : 2€ + 1€ + 0,50€ = 3,50€',
  },
}
const DEFAULT_CPA_TEXT = {
  pictural: 'Dessine ce que tu as réalisé avec le manipulable.',
  abstraitLabel: 'Traduis ce que tu as fait en chiffres et symboles.',
  abstraitPlaceholder: 'Ex : 2 + 3 + 5 = 10',
}

function ManipulativeComponent({ manipulative, config, onValidate }) {
  if (manipulative === 'base10') return <Base10Blocks config={config} onValidate={onValidate} />
  if (manipulative === 'droite-numerique') return <NumberLine config={config} onValidate={onValidate} />
  if (manipulative === 'fractions') return <FractionBars config={config} onValidate={onValidate} />
  if (manipulative === 'cuisenaire') return <CuisenaireRods config={config} onValidate={onValidate} />
  if (manipulative === 'cadres10') return <TenFrames config={config} onValidate={onValidate} />
  if (manipulative === 'grille100') return <HundredChart config={config} onValidate={onValidate} />
  if (manipulative === 'horloge') return <Clock config={config} onValidate={onValidate} />
  if (manipulative === 'monnaie') return <Money config={config} onValidate={onValidate} />
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

  // Série (Lot B)
  const [seriesItems, setSeriesItems] = useState(null) // null = pas de série ; sinon liste d'overrides
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [seriesResults, setSeriesResults] = useState([])
  const [seriesDone, setSeriesDone] = useState(false)

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
      .from('mathip_exercises')
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

  // Résout les items de la série une fois l'exercice chargé : lus tels quels
  // en mode fixe, générés côté client (une graine différente par élève) en
  // mode aléatoire.
  useEffect(() => {
    if (!exercise) return
    const mode = exercise.config?.seriesMode
    if (!mode || mode === 'mono') return
    if (mode === 'fixe') {
      setSeriesItems(exercise.config.items || [])
    } else {
      setSeriesItems(
        generateSeries(exercise.manipulative, exercise.config.difficulty, exercise.config.itemCount, exercise.config)
      )
    }
  }, [exercise])

  const isSeries = Array.isArray(seriesItems)
  const seriesItemCount = seriesItems?.length ?? 1
  const currentConfig = isSeries
    ? { ...(exercise?.config || {}), ...seriesItems[currentItemIndex] }
    : (exercise?.config || {})

  const saveSession = async (result, duree, correctOverride) => {
    if (!isDemo && supabase && exercise?.id) {
      await supabase.from('mathip_sessions').insert({
        exercise_id: exercise.id,
        prenom_eleve: prenom || null,
        reponse: result,
        correct: correctOverride !== undefined ? correctOverride : (result?.correct ?? null),
        duree_secondes: duree,
      })
    }
  }

  const handleValidate = async (result) => {
    const duree = Math.round((Date.now() - startTime) / 1000)

    if (isSeries) {
      const itemResult = {
        kind: seriesItems[currentItemIndex]?.kind,
        correct: result.correct,
        attempts: result.attempts,
        solutionShown: result.solutionShown || false,
      }
      const updatedResults = [...seriesResults, itemResult]
      setSeriesResults(updatedResults)

      // N'avance jamais avant la fin de l'animation du manipulable (revealMs),
      // avec un plancher pour laisser le temps de voir un succès immédiat.
      const waitMs = Math.max(result.revealMs || 0, 1200)
      setTimeout(() => {
        if (currentItemIndex + 1 < seriesItemCount) {
          setCurrentItemIndex((i) => i + 1)
        } else {
          finishSeries(updatedResults, duree)
        }
      }, waitMs)
      return
    }

    setManipResult({ ...result, duree })
    if (!exercise?.config?.cpaMode) {
      setValidated(true)
      if (ttsEnabled) speak(encouragement)
      await saveSession(result, duree)
    }
    // En mode CPA : on ne bascule jamais automatiquement vers l'étape
    // Pictural — le manipulable reste affiché avec son propre feedback
    // (bandeau, animation de recalage…) jusqu'à ce que l'élève clique sur
    // « Continuer ». Voir le bouton sous ManipulativeComponent ci-dessous.
  }

  const finishSeries = async (results, duree) => {
    const score = results.filter((r) => r.correct === true).length
    const total = results.length
    setSeriesDone(true)
    setValidated(true)
    if (ttsEnabled) speak(`Série terminée : ${score} sur ${total}.`)
    await saveSession({ score, total, items: results }, duree, score === total)
  }

  const handleCpaContinuer = () => {
    setCpaPhase('pictural')
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

      {/* Progression de série */}
      {isSeries && prenomConfirmed && !seriesDone && (
        <div className="mb-4 text-center">
          <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Item {currentItemIndex + 1} / {seriesItemCount}
          </span>
        </div>
      )}

      {/* Manipulative — phase Concret */}
      {prenomConfirmed && cpaPhase === 'concret' && !(isSeries && seriesDone) && (
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
            key={isSeries ? currentItemIndex : 'single'}
            manipulative={exercise.manipulative}
            config={currentConfig}
            onValidate={handleValidate}
          />
          {exercise.config?.cpaMode && manipResult && (
            <div className="mt-4 text-center border-t border-gray-100 pt-4">
              <button
                onClick={handleCpaContinuer}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-6 rounded-xl transition-colors min-h-[44px]"
              >
                Continuer vers l'étape Pictural →
              </button>
            </div>
          )}
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
            <h2 className="text-xl font-bold text-gray-800 mb-2">Dessine ce que tu as réalisé</h2>
            <p className="text-gray-600 text-sm mb-6">
              {(CPA_TEXTS[exercise.manipulative] || DEFAULT_CPA_TEXT).pictural}
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
            <h2 className="text-xl font-bold text-gray-800 mb-2">Traduis ce que tu as fait</h2>
            <p className="text-gray-600 text-sm mb-6">
              {(CPA_TEXTS[exercise.manipulative] || DEFAULT_CPA_TEXT).abstraitLabel}
            </p>
            <input
              type="text"
              value={cpaAbstractInput}
              onChange={(e) => setCpaAbstractInput(e.target.value)}
              placeholder={(CPA_TEXTS[exercise.manipulative] || DEFAULT_CPA_TEXT).abstraitPlaceholder}
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
      {validated && isSeries && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700 mb-2">
            Série terminée : {seriesResults.filter((r) => r.correct === true).length} / {seriesResults.length}
          </p>
          {!focusMode && (
            <p className="text-green-600 text-sm">
              Ton enseignant·e pourra voir le détail de tes réponses dans le tableau de bord.
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
      {validated && !isSeries && (
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
