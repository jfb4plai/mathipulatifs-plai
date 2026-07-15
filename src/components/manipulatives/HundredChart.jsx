import { useState, useRef, useEffect } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const PALETTE = [
  { id: 'yellow', bg: '#F6E05E', border: '#B7791F', label: 'Jaune' },
  { id: 'red',    bg: '#FC8181', border: '#C53030', label: 'Rouge' },
  { id: 'green',  bg: '#68D391', border: '#276749', label: 'Vert' },
  { id: 'blue',   bg: '#90CDF4', border: '#2C5282', label: 'Bleu' },
]

export default function HundredChart({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    startAt = 1,        // 1 or 0
    mode = 'libre',     // 'libre' | 'multiples'
    multipleOf,         // used when mode = 'multiples'
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config

  const total = 100
  const numbers = Array.from({ length: total }, (_, i) => i + startAt)

  // colored: { [number]: colorId }
  const [colored, setColored] = useState({})
  const [activeColor, setActiveColor] = useState('yellow')
  const [validated, setValidated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const [revealApplied, setRevealApplied] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  const hasTarget = mode === 'multiples' && !!multipleOf
  const expectedMultiples = hasTarget ? numbers.filter((n) => n !== 0 && n % multipleOf === 0) : []

  const toggleCell = (n) => {
    if (validated) return
    setColored((prev) => {
      const next = { ...prev }
      if (next[n] === activeColor) {
        delete next[n]
      } else {
        next[n] = activeColor
      }
      return next
    })
  }

  const clearAll = () => {
    if (validated) return
    setColored({})
  }

  const buildHint = (coloredNumbers) => {
    const userSet = new Set(coloredNumbers)
    const missing = expectedMultiples.filter((n) => !userSet.has(n))
    const extra = coloredNumbers.filter((n) => n === 0 || n % multipleOf !== 0)
    const parts = []
    if (missing.length > 0) {
      parts.push(`Il te manque ${missing.length} multiple${missing.length > 1 ? 's' : ''} de ${multipleOf}.`)
    }
    if (extra.length > 0) {
      parts.push(
        `Tu as colorié ${extra.length} case${extra.length > 1 ? 's' : ''} qui ne ${extra.length > 1 ? 'sont' : 'est'} pas ${extra.length > 1 ? 'des' : 'un'} multiple${extra.length > 1 ? 's' : ''} de ${multipleOf}.`
      )
    }
    return parts.join(' ')
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
    if (ttsEnabled) speak(`Regarde : voici les multiples de ${multipleOf}.`)
    // Laisse l'élève voir l'indice ~2 s, puis colorie la bonne réponse.
    revealTimer.current = setTimeout(() => {
      const auto = {}
      expectedMultiples.forEach((n) => { auto[n] = 'green' })
      setColored(auto)
      setRevealApplied(true)
      setHint(null)
    }, 2000)
  }

  const handleValidate = () => {
    const coloredNumbers = Object.keys(colored).map(Number)
    const studentResult = { colored: coloredNumbers, multipleOf }

    // Coloriage libre : pas de cible.
    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`${coloredNumbers.length} cases coloriées`)
      return
    }

    const userSet = new Set(coloredNumbers)
    const correct =
      userSet.size === expectedMultiples.length && expectedMultiples.every((n) => userSet.has(n))

    const n = attempts + 1
    setAttempts(n)

    if (correct) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
      if (ttsEnabled) speak('Pas tout à fait.')
      return
    }

    const msg = buildHint(coloredNumbers)
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }

  const getCellStyle = (n) => {
    const colorId = colored[n]
    if (colorId) {
      const p = PALETTE.find((c) => c.id === colorId)
      return {
        backgroundColor: p?.bg ?? '#F6E05E',
        borderColor: p?.border ?? '#B7791F',
        fontWeight: 'bold',
      }
    }
    // multiples hint (non-revealed)
    return {
      backgroundColor: '#F7FAFC',
      borderColor: '#E2E8F0',
    }
  }

  const coloredCount = Object.keys(colored).length

  // Reflète la validation, pas l'état courant : après révélation, la grille
  // contient la solution et ne doit surtout pas s'afficher comme « correcte ».
  const finalCorrect = (() => {
    if (!hasTarget) return null
    if (solutionShown) return false
    if (!validated) return null
    const userSet = new Set(Object.keys(colored).map(Number))
    return userSet.size === expectedMultiples.length && expectedMultiples.every((n) => userSet.has(n))
  })()

  return (
    <div>
      {/* Mode indicator */}
      {mode === 'multiples' && multipleOf && !focusMode && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800 font-medium">
          🔍 Colorie tous les multiples de <strong>{multipleOf}</strong> dans la grille
        </div>
      )}

      {/* Palette de couleurs */}
      {!validated && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {!focusMode && <span className="text-xs text-gray-500 font-semibold">Couleur :</span>}
          {PALETTE.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveColor(p.id)}
              title={p.label}
              aria-pressed={activeColor === p.id}
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                backgroundColor: p.bg,
                border: activeColor === p.id ? `3px solid ${p.border}` : `2px solid ${p.border}`,
                boxShadow: activeColor === p.id ? `0 0 0 2px white, 0 0 0 4px ${p.border}` : 'none',
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            />
          ))}
          <button
            onClick={clearAll}
            className="ml-2 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-lg transition-colors"
          >
            Effacer tout
          </button>
          {coloredCount > 0 && !focusMode && (
            <span className="text-xs text-gray-400 ml-1">{coloredCount} case{coloredCount > 1 ? 's' : ''}</span>
          )}
        </div>
      )}

      {/* Grille 10×10 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: 3,
          marginBottom: 12,
        }}
        role="grid"
        aria-label="Grille des 100"
      >
        {numbers.map((n) => (
          <button
            key={n}
            onClick={() => toggleCell(n)}
            disabled={validated}
            role="gridcell"
            aria-label={`${n}${colored[n] ? ', colorié' : ''}`}
            style={{
              height: 34,
              borderRadius: 4,
              border: `1px solid`,
              fontSize: 11,
              fontWeight: colored[n] ? 'bold' : 'normal',
              color: '#2D3748',
              cursor: validated ? 'default' : 'pointer',
              transition: 'all 0.1s',
              ...getCellStyle(n),
            }}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Indice après une réponse fausse — l'élève peut réessayer */}
      {hint && !revealApplied && (
        <div className="mb-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {!validated && (
        <button
          onClick={handleValidate}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}

      {validated && (!solutionShown || revealApplied) && (
        <div
          className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
            finalCorrect === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : finalCorrect === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {finalCorrect === true && `✓ Correct ! Tous les multiples de ${multipleOf} sont coloriés.`}
          {solutionShown && `Voici les multiples de ${multipleOf} — regarde bien la grille.`}
          {finalCorrect === false && !solutionShown && `Pas tout à fait — les multiples de ${multipleOf} ne sont pas tous corrects.`}
          {finalCorrect === null && `${coloredCount} case${coloredCount > 1 ? 's' : ''} coloriée${coloredCount > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}
