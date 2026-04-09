import { useState } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const COLORS = {
  red:    { fill: '#E53E3E', light: '#FED7D7', border: '#9B2C2C' },
  blue:   { fill: '#3182CE', light: '#BEE3F8', border: '#2C5282' },
  yellow: { fill: '#D69E2E', light: '#FEFCBF', border: '#975A16' },
}

export default function TenFrames({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    frames = 1,           // 1 = cadre simple (0–10), 2 = double cadre (0–20)
    targetNumber,
    counterColor = 'red',
    showCounter = true,
  } = config

  const totalCells = frames * 10
  const [filled, setFilled] = useState(new Set())
  const [validated, setValidated] = useState(false)

  const count = filled.size

  const toggleCell = (idx) => {
    if (validated) return
    setFilled((prev) => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const handleValidate = () => {
    setValidated(true)
    const correct = targetNumber !== undefined ? count === targetNumber : null
    const result = { count, filled: [...filled], correct, targetNumber }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${count}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. La cible était ${targetNumber}.`
      )
    }
  }

  const isCorrect = targetNumber !== undefined ? count === targetNumber : null
  const col = COLORS[counterColor] || COLORS.red

  // Render a single 2×5 frame starting at cellOffset
  const renderFrame = (frameIndex) => {
    const offset = frameIndex * 10
    return (
      <div
        key={frameIndex}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 4,
          border: '3px solid #4A5568',
          borderRadius: 8,
          padding: 6,
          background: '#F7FAFC',
        }}
        aria-label={`Cadre ${frameIndex + 1}`}
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const idx = offset + i
          const isFilled = filled.has(idx)
          return (
            <button
              key={idx}
              onClick={() => toggleCell(idx)}
              disabled={validated}
              aria-label={isFilled ? `Vider la case ${idx + 1}` : `Remplir la case ${idx + 1}`}
              aria-pressed={isFilled}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                border: `2px solid ${isFilled ? col.border : '#CBD5E0'}`,
                backgroundColor: isFilled ? col.fill : '#EDF2F7',
                cursor: validated ? 'default' : 'pointer',
                transition: 'all 0.12s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFilled && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: col.light,
                    border: `1px solid ${col.border}`,
                    opacity: 0.7,
                  }}
                />
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div>
      {/* Header : cible + compteur */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        {targetNumber !== undefined ? (
          <span className="text-lg font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Cible : {targetNumber}
          </span>
        ) : <span />}
        {showCounter && (
          <span
            className={`text-lg font-bold px-4 py-2 rounded-xl border transition-colors ${
              targetNumber !== undefined && count === targetNumber
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            {count} / {totalCells}
          </span>
        )}
      </div>

      {/* Frames */}
      <div className="flex flex-wrap gap-6 justify-center mb-4">
        {Array.from({ length: frames }).map((_, fi) => renderFrame(fi))}
      </div>

      {/* Aide visuelle sous les cadres */}
      {!focusMode && (
        <p className="text-xs text-gray-400 text-center mb-4">
          Clique sur un cercle pour le remplir ou le vider
        </p>
      )}

      {/* Boutons vider / remplir tout */}
      {!validated && (
        <div className="flex gap-2 justify-center mb-4 flex-wrap">
          <button
            onClick={() => setFilled(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
          >
            Tout vider
          </button>
          <button
            onClick={() => setFilled(new Set(Array.from({ length: totalCells }, (_, i) => i)))}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 px-3 py-1.5 rounded-lg transition-colors min-h-[36px]"
          >
            Tout remplir
          </button>
        </div>
      )}

      {/* Validation */}
      {!validated && (
        <button
          onClick={handleValidate}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}

      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            isCorrect === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : isCorrect === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {isCorrect === true && `✓ Correct ! ${count} cercles remplis`}
          {isCorrect === false && `Tu as rempli ${count} cases — Cible : ${targetNumber}`}
          {isCorrect === null && `Total : ${count} cercles remplis`}
        </div>
      )}
    </div>
  )
}
