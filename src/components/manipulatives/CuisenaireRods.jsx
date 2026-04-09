import { useState } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const RODS = [
  { value: 1,  name: 'Blanche',    color: '#F7F7F7', border: '#AAAAAA', textColor: '#333333' },
  { value: 2,  name: 'Rouge',      color: '#E53E3E', border: '#9B2C2C', textColor: '#FFFFFF' },
  { value: 3,  name: 'Vert clair', color: '#68D391', border: '#276749', textColor: '#1A202C' },
  { value: 4,  name: 'Mauve',      color: '#B794F4', border: '#6B46C1', textColor: '#FFFFFF' },
  { value: 5,  name: 'Jaune',      color: '#F6E05E', border: '#B7791F', textColor: '#333333' },
  { value: 6,  name: 'Vert foncé', color: '#276749', border: '#1C4532', textColor: '#FFFFFF' },
  { value: 7,  name: 'Noire',      color: '#2D3748', border: '#1A202C', textColor: '#FFFFFF' },
  { value: 8,  name: 'Marron',     color: '#C05621', border: '#7B341E', textColor: '#FFFFFF' },
  { value: 9,  name: 'Bleue',      color: '#3182CE', border: '#2C5282', textColor: '#FFFFFF' },
  { value: 10, name: 'Orange',     color: '#ED8936', border: '#C05621', textColor: '#FFFFFF' },
]

const UNIT = 22 // px per unit width

export default function CuisenaireRods({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const { targetNumber, showCounter = true } = config

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)

  const total = workspace.reduce((sum, v) => sum + v, 0)

  const addRod = (value) => {
    if (validated) return
    setWorkspace((prev) => [...prev, value])
  }

  const removeRod = (index) => {
    if (validated) return
    setWorkspace((prev) => prev.filter((_, i) => i !== index))
  }

  const handleValidate = () => {
    setValidated(true)
    const correct = targetNumber !== undefined ? total === targetNumber : null
    const result = { total, workspace, correct, targetNumber }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${total}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. La cible était ${targetNumber}.`
      )
    }
  }

  const isCorrect = targetNumber !== undefined ? total === targetNumber : null

  return (
    <div>
      {targetNumber !== undefined && (
        <div className="mb-4 text-center">
          <span className="text-lg font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Cible : {targetNumber}
          </span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap items-start">
        {/* Bank */}
        <div className="shrink-0">
          {!focusMode && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Banque</h3>
          )}
          <div className="flex flex-col gap-1.5">
            {RODS.map((rod) => (
              <button
                key={rod.value}
                onClick={() => addRod(rod.value)}
                disabled={validated}
                title={`Ajouter réglette ${rod.name} (${rod.value})`}
                className="flex items-center gap-2 group disabled:opacity-50"
                style={{ cursor: validated ? 'default' : 'pointer' }}
              >
                <div
                  style={{
                    width: rod.value * UNIT,
                    minWidth: UNIT,
                    height: 24,
                    backgroundColor: rod.color,
                    border: `2px solid ${rod.border}`,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: rod.textColor,
                    fontSize: 11,
                    fontWeight: 'bold',
                    transition: 'transform 0.1s',
                    transform: 'scale(1)',
                  }}
                  className="group-hover:scale-105"
                >
                  {rod.value}
                </div>
                {!focusMode && (
                  <span className="text-xs text-gray-400 w-16">{rod.name}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 min-w-[240px]">
          {!focusMode && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
              Espace de travail
              {showCounter && (
                <span className={`font-bold text-sm normal-case ${targetNumber !== undefined && total === targetNumber ? 'text-green-600' : 'text-gray-700'}`}>
                  — Total : {total}
                </span>
              )}
            </h3>
          )}
          {focusMode && showCounter && (
            <div className="mb-2 font-bold text-gray-700">Total : {total}</div>
          )}

          <div className="min-h-[220px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-wrap gap-1.5 content-start">
            {workspace.length === 0 && (
              <p className="text-gray-400 text-sm w-full text-center pt-8">
                Clique sur une réglette pour l'ajouter ici
              </p>
            )}
            {workspace.map((value, index) => {
              const rod = RODS[value - 1]
              return (
                <button
                  key={index}
                  onClick={() => removeRod(index)}
                  disabled={validated}
                  title={`Retirer réglette ${rod.name} (${rod.value})`}
                  style={{
                    width: rod.value * UNIT,
                    minWidth: UNIT,
                    height: 28,
                    backgroundColor: rod.color,
                    border: `2px solid ${rod.border}`,
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: rod.textColor,
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: validated ? 'default' : 'pointer',
                  }}
                />
              )
            })}
          </div>

          {!validated && (
            <button
              onClick={handleValidate}
              disabled={workspace.length === 0}
              className="mt-3 w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Valider
            </button>
          )}

          {validated && (
            <div
              className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
                isCorrect === true
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : isCorrect === false
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCorrect === true && `✓ Correct ! Total = ${total}`}
              {isCorrect === false && `Total : ${total} — Cible : ${targetNumber}`}
              {isCorrect === null && `Total : ${total}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
