import { useState } from 'react'
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
  } = config

  const total = 100
  const numbers = Array.from({ length: total }, (_, i) => i + startAt)

  // colored: { [number]: colorId }
  const [colored, setColored] = useState({})
  const [activeColor, setActiveColor] = useState('yellow')
  const [validated, setValidated] = useState(false)
  const [revealed, setRevealed] = useState(false)

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
    setRevealed(false)
  }

  const handleReveal = () => {
    if (!multipleOf) return
    const auto = {}
    numbers.forEach((n) => {
      if (n !== 0 && n % multipleOf === 0) auto[n] = 'green'
    })
    setColored(auto)
    setRevealed(true)
  }

  const handleValidate = () => {
    setValidated(true)
    const coloredNumbers = Object.keys(colored).map(Number)
    let correct = null
    if (mode === 'multiples' && multipleOf) {
      const expected = numbers.filter((n) => n !== 0 && n % multipleOf === 0)
      const userSet = new Set(coloredNumbers)
      const expectedSet = new Set(expected)
      correct =
        userSet.size === expectedSet.size &&
        [...expectedSet].every((n) => userSet.has(n))
    }
    const result = { colored: coloredNumbers, correct, multipleOf }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `${coloredNumbers.length} cases coloriées`
          : correct
          ? 'Bonne réponse !'
          : 'Pas tout à fait, regarde les multiples surlignés.'
      )
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

      {/* Actions */}
      {!validated && (
        <div className="flex gap-2 flex-wrap">
          {mode === 'multiples' && multipleOf && (
            <button
              onClick={handleReveal}
              className="flex-1 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl transition-colors min-h-[44px] text-sm"
            >
              Révéler les multiples de {multipleOf}
            </button>
          )}
          <button
            onClick={handleValidate}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
          >
            Valider
          </button>
        </div>
      )}

      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            mode === 'multiples'
              ? colored && Object.keys(colored).length > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {mode === 'multiples' && multipleOf
            ? `${coloredCount} multiple${coloredCount > 1 ? 's' : ''} de ${multipleOf} coloriés`
            : `${coloredCount} case${coloredCount > 1 ? 's' : ''} coloriée${coloredCount > 1 ? 's' : ''}`}
        </div>
      )}
    </div>
  )
}
