import { useState, useEffect } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

function CentaineBlock({ onClick }) {
  return (
    <div
      onClick={onClick}
      title="Centaine (100)"
      className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform inline-block"
      style={{
        width: 80,
        height: 80,
        backgroundColor: '#3B82F6',
        border: '2px solid #1D4ED8',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.4) 7px, rgba(255,255,255,0.4) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.4) 7px, rgba(255,255,255,0.4) 8px)',
        borderRadius: 3,
      }}
    />
  )
}

function DizaineBlock({ onClick }) {
  return (
    <div
      onClick={onClick}
      title="Dizaine (10)"
      className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform inline-block"
      style={{
        width: 16,
        height: 80,
        backgroundColor: '#22C55E',
        border: '1px solid #15803D',
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(255,255,255,0.5) 6px, rgba(255,255,255,0.5) 7px)',
        borderRadius: 2,
      }}
    />
  )
}

function UniteBlock({ onClick }) {
  return (
    <div
      onClick={onClick}
      title="Unité (1)"
      className="cursor-pointer hover:opacity-80 active:scale-95 transition-transform inline-block"
      style={{
        width: 16,
        height: 16,
        backgroundColor: '#EAB308',
        border: '1px solid #A16207',
        borderRadius: 2,
      }}
    />
  )
}

export default function Base10Blocks({ config = {}, onValidate }) {
  const { targetNumber, maxNumber = 999, showCounter = true } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const [centaines, setCentaines] = useState(0)
  const [dizaines, setDizaines] = useState(0)
  const [unites, setUnites] = useState(0)
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const total = centaines * 100 + dizaines * 10 + unites

  useEffect(() => {
    if (ttsEnabled) {
      speak(`Total : ${total}`)
    }
  }, [total, ttsEnabled, speak])

  const addCentaine = () => {
    if (centaines < 9 && total + 100 <= maxNumber) setCentaines((v) => v + 1)
  }
  const addDizaine = () => {
    if (dizaines < 9 && total + 10 <= maxNumber) setDizaines((v) => v + 1)
  }
  const addUnite = () => {
    if (unites < 9 && total + 1 <= maxNumber) setUnites((v) => v + 1)
  }

  const removeCentaine = () => setCentaines((v) => Math.max(0, v - 1))
  const removeDizaine = () => setDizaines((v) => Math.max(0, v - 1))
  const removeUnite = () => setUnites((v) => Math.max(0, v - 1))

  const handleValidate = () => {
    const isCorrect = targetNumber != null ? total === targetNumber : true
    setValidated(true)
    setFeedback(isCorrect)
    if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: isCorrect })
    if (ttsEnabled) {
      speak(isCorrect ? 'Bravo, c\'est correct !' : `Pas tout à fait. La réponse était ${targetNumber}.`)
    }
  }

  const handleReset = () => {
    setCentaines(0)
    setDizaines(0)
    setUnites(0)
    setValidated(false)
    setFeedback(null)
  }

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {targetNumber != null && (
        <div className={`mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center ${focusMode ? '' : ''}`}>
          <span className="font-bold text-blue-700 text-2xl">Objectif : {targetNumber}</span>
          {ttsEnabled && (
            <button
              onClick={() => speak(`Objectif : ${targetNumber}`)}
              className="ml-3 text-blue-500 hover:text-blue-700"
              title="Lire à voix haute"
            >
              🔊
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Bank panel */}
        <div className={`flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 ${focusMode ? 'opacity-90' : ''}`}>
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Banque — Cliquer pour ajouter
          </h3>
          <div className="flex flex-col gap-4">
            {/* Centaine */}
            <div className="flex items-center gap-3">
              <button
                onClick={addCentaine}
                disabled={centaines >= 9 || total + 100 > maxNumber}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-blue-200 transition-colors"
                title="Ajouter une centaine"
              >
                <CentaineBlock onClick={() => {}} />
                <div className="text-left">
                  <div className="font-bold text-blue-700">Centaine</div>
                  <div className="text-xs text-gray-500">= 100 unités</div>
                </div>
              </button>
            </div>

            {/* Dizaine */}
            <div className="flex items-center gap-3">
              <button
                onClick={addDizaine}
                disabled={dizaines >= 9 || total + 10 > maxNumber}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-green-200 transition-colors"
                title="Ajouter une dizaine"
              >
                <DizaineBlock onClick={() => {}} />
                <div className="text-left">
                  <div className="font-bold text-green-700">Dizaine</div>
                  <div className="text-xs text-gray-500">= 10 unités</div>
                </div>
              </button>
            </div>

            {/* Unité */}
            <div className="flex items-center gap-3">
              <button
                onClick={addUnite}
                disabled={unites >= 9 || total + 1 > maxNumber}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-yellow-200 transition-colors"
                title="Ajouter une unité"
              >
                <UniteBlock onClick={() => {}} />
                <div className="text-left">
                  <div className="font-bold text-yellow-700">Unité</div>
                  <div className="text-xs text-gray-500">= 1</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Workspace panel */}
        <div className="flex-[2] bg-white rounded-xl p-4 border-2 border-dashed border-gray-300 min-h-[200px]">
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Espace de travail — Cliquer pour retirer
          </h3>

          {/* Centaines row */}
          {centaines > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">
                Centaines ({centaines})
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: centaines }).map((_, i) => (
                  <CentaineBlock key={i} onClick={removeCentaine} />
                ))}
              </div>
            </div>
          )}

          {/* Dizaines row */}
          {dizaines > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">
                Dizaines ({dizaines})
              </div>
              <div className="flex flex-wrap gap-1 items-end">
                {Array.from({ length: dizaines }).map((_, i) => (
                  <DizaineBlock key={i} onClick={removeDizaine} />
                ))}
              </div>
            </div>
          )}

          {/* Unités row */}
          {unites > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">
                Unités ({unites})
              </div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: unites }).map((_, i) => (
                  <UniteBlock key={i} onClick={removeUnite} />
                ))}
              </div>
            </div>
          )}

          {centaines === 0 && dizaines === 0 && unites === 0 && (
            <p className="text-gray-400 italic text-sm mt-8 text-center">
              Clique sur les blocs à gauche pour les ajouter ici
            </p>
          )}
        </div>
      </div>

      {/* Counter */}
      {showCounter && (
        <div className="mt-4 flex items-center justify-between bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{centaines}</div>
              <div className="text-xs text-gray-500">centaines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dizaines}</div>
              <div className="text-xs text-gray-500">dizaines</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{unites}</div>
              <div className="text-xs text-gray-500">unités</div>
            </div>
            <div className="text-center border-l pl-6 border-gray-200">
              <div className="text-3xl font-bold text-gray-800">{total}</div>
              <div className="text-xs text-gray-500">total</div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-red-500 min-h-[44px] px-3 rounded-lg hover:bg-red-50 transition-colors"
          >
            Effacer tout
          </button>
        </div>
      )}

      {/* Feedback & Validate */}
      {validated && feedback !== null && (
        <div
          className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            feedback ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
          }`}
        >
          {feedback ? '✅ Bravo ! C\'est correct !' : `❌ Pas tout à fait. La réponse était ${targetNumber}.`}
        </div>
      )}

      {targetNumber != null && !validated && (
        <button
          onClick={handleValidate}
          className="mt-4 w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-lg transition-colors min-h-[44px]"
        >
          Valider ma réponse
        </button>
      )}
    </div>
  )
}
