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

function buildGuidedFeedback(total, target, centaines, dizaines, unites) {
  // Mauvaise décomposition : trop d'unités qu'on pourrait regrouper
  if (unites >= 10 && total === target) {
    return {
      type: 'regroup',
      msg: `C'est le bon total, mais tu as ${unites} unités. Tu peux en regrouper : 10 unités = 1 dizaine. Essaie !`,
    }
  }
  const diff = target - total
  if (diff > 0) {
    if (diff >= 100)
      return { type: 'petit', msg: `Tu as ${total}. Il te manque ${diff}. Peux-tu ajouter une centaine ?` }
    if (diff >= 10)
      return { type: 'petit', msg: `Tu as ${total}. Il te manque ${diff}. Peux-tu ajouter des dizaines ?` }
    return { type: 'petit', msg: `Tu as ${total}. Il te manque ${diff}. Peux-tu ajouter des unités ?` }
  }
  const excess = -diff
  if (excess >= 100)
    return { type: 'grand', msg: `Tu as ${total}, c'est trop de ${excess}. Peux-tu retirer une centaine ?` }
  if (excess >= 10)
    return { type: 'grand', msg: `Tu as ${total}, c'est trop de ${excess}. Peux-tu retirer des dizaines ?` }
  return { type: 'grand', msg: `Tu as ${total}, c'est trop de ${excess}. Peux-tu retirer des unités ?` }
}

export default function Base10Blocks({ config = {}, onValidate }) {
  const {
    targetNumber,
    maxNumber = 999,
    showCounter = true,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 3,
  } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const [centaines, setCentaines] = useState(0)
  const [dizaines, setDizaines] = useState(0)
  const [unites, setUnites] = useState(0)
  const [isCorrect, setIsCorrect] = useState(false)
  const [guidedFeedback, setGuidedFeedback] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const total = centaines * 100 + dizaines * 10 + unites
  const hasBlocks = total > 0
  const validated = isCorrect || showSolution

  useEffect(() => {
    if (ttsEnabled && hasBlocks) speak(`Total : ${total}`)
  }, [total, ttsEnabled, speak, hasBlocks])

  const addCentaine = () => { if (centaines < 9 && total + 100 <= maxNumber) setCentaines(v => v + 1) }
  const addDizaine  = () => { if (dizaines < 9 && total + 10 <= maxNumber)  setDizaines(v => v + 1) }
  const addUnite    = () => { if (unites < 9 && total + 1 <= maxNumber)     setUnites(v => v + 1) }
  const removeCentaine = () => setCentaines(v => Math.max(0, v - 1))
  const removeDizaine  = () => setDizaines(v => Math.max(0, v - 1))
  const removeUnite    = () => setUnites(v => Math.max(0, v - 1))

  const handleValidate = () => {
    if (targetNumber == null) {
      // Mode libre : valider directement
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: null })
      setIsCorrect(true)
      return
    }

    const correct = total === targetNumber && unites < 10
    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (correct) {
      setIsCorrect(true)
      setGuidedFeedback(null)
      if (ttsEnabled) speak('Bravo, c\'est correct !')
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: true })
      return
    }

    const fb = buildGuidedFeedback(total, targetNumber, centaines, dizaines, unites)
    setGuidedFeedback(fb)
    if (ttsEnabled) speak(fb.msg)

    const maxAtt = showSolutionAfterAttempts > 0 ? showSolutionAfterAttempts : null
    if (maxAtt && newAttempts >= maxAtt) {
      setShowSolution(true)
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: false, attempts: newAttempts })
    }
  }

  const handleRetry = () => {
    setGuidedFeedback(null)
  }

  const handleReset = () => {
    setCentaines(0)
    setDizaines(0)
    setUnites(0)
    setIsCorrect(false)
    setGuidedFeedback(null)
    setAttempts(0)
    setShowSolution(false)
  }

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>

      {/* Banque + espace de travail */}
      <div className={`flex flex-col md:flex-row gap-4 ${validated ? 'opacity-60 pointer-events-none' : ''}`}>
        {/* Banque */}
        <div className={`flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200 ${focusMode ? 'opacity-90' : ''}`}>
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Banque — Cliquer pour ajouter
          </h3>
          <div className="flex flex-col gap-4">
            <button onClick={addCentaine} disabled={centaines >= 9 || total + 100 > maxNumber}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-blue-200 transition-colors"
              title="Ajouter une centaine">
              <CentaineBlock onClick={() => {}} />
              <div className="text-left">
                <div className="font-bold text-blue-700">Centaine</div>
                <div className="text-xs text-gray-500">= 100 unités</div>
              </div>
            </button>

            <button onClick={addDizaine} disabled={dizaines >= 9 || total + 10 > maxNumber}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-green-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-green-200 transition-colors"
              title="Ajouter une dizaine">
              <DizaineBlock onClick={() => {}} />
              <div className="text-left">
                <div className="font-bold text-green-700">Dizaine</div>
                <div className="text-xs text-gray-500">= 10 unités</div>
              </div>
            </button>

            <button onClick={addUnite} disabled={unites >= 9 || total + 1 > maxNumber}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-yellow-50 disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] border border-transparent hover:border-yellow-200 transition-colors"
              title="Ajouter une unité">
              <UniteBlock onClick={() => {}} />
              <div className="text-left">
                <div className="font-bold text-yellow-700">Unité</div>
                <div className="text-xs text-gray-500">= 1</div>
              </div>
            </button>
          </div>
        </div>

        {/* Espace de travail */}
        <div className="flex-[2] bg-white rounded-xl p-4 border-2 border-dashed border-gray-300 min-h-[200px]">
          <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">
            Espace de travail — Cliquer pour retirer
          </h3>
          {centaines > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Centaines ({centaines})</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: centaines }).map((_, i) => <CentaineBlock key={i} onClick={removeCentaine} />)}
              </div>
            </div>
          )}
          {dizaines > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Dizaines ({dizaines})</div>
              <div className="flex flex-wrap gap-1 items-end">
                {Array.from({ length: dizaines }).map((_, i) => <DizaineBlock key={i} onClick={removeDizaine} />)}
              </div>
            </div>
          )}
          {unites > 0 && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 mb-1">Unités ({unites})</div>
              <div className="flex flex-wrap gap-1">
                {Array.from({ length: unites }).map((_, i) => <UniteBlock key={i} onClick={removeUnite} />)}
              </div>
            </div>
          )}
          {!hasBlocks && (
            <p className="text-gray-400 italic text-sm mt-8 text-center">
              Clique sur les blocs à gauche pour les ajouter ici
            </p>
          )}
        </div>
      </div>

      {/* Compteur */}
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
          {!validated && (
            <button onClick={handleReset}
              className="text-sm text-gray-500 hover:text-red-500 min-h-[44px] px-3 rounded-lg hover:bg-red-50 transition-colors">
              Effacer tout
            </button>
          )}
        </div>
      )}

      {/* Rétroaction guidée (erreur) */}
      {guidedFeedback && !isCorrect && !showSolution && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 mb-3">{guidedFeedback.msg}</p>
              {allowMultipleAttempts && (
                <button onClick={handleRetry}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-lg transition-colors min-h-[44px]">
                  Réessayer
                </button>
              )}
              {attempts > 0 && showSolutionAfterAttempts > 0 && !showSolution && (
                <span className="ml-3 text-xs text-amber-600">
                  Tentative {attempts} / {showSolutionAfterAttempts}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Solution affichée après N tentatives */}
      {showSolution && (
        <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📘</span>
            <div>
              <p className="font-semibold text-blue-800 mb-1">Voici la bonne réponse :</p>
              {(() => {
                const c = Math.floor(targetNumber / 100)
                const d = Math.floor((targetNumber % 100) / 10)
                const u = targetNumber % 10
                return (
                  <p className="text-blue-700">
                    {targetNumber} = {c > 0 ? `${c} centaine${c > 1 ? 's' : ''}` : ''}{c > 0 && (d > 0 || u > 0) ? ' + ' : ''}
                    {d > 0 ? `${d} dizaine${d > 1 ? 's' : ''}` : ''}{d > 0 && u > 0 ? ' + ' : ''}
                    {u > 0 ? `${u} unité${u > 1 ? 's' : ''}` : ''}
                  </p>
                )
              })()}
              <button onClick={handleReset}
                className="mt-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-5 rounded-lg transition-colors min-h-[44px]">
                Recommencer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Succès */}
      {isCorrect && (
        <div className="mt-4 p-4 rounded-xl bg-green-100 border border-green-300 text-center">
          <p className="text-2xl mb-1">✅</p>
          <p className="font-bold text-green-700 text-lg">
            {targetNumber != null
              ? `Bravo ! Tu as bien représenté ${targetNumber} : ${centaines > 0 ? centaines + ' centaine' + (centaines > 1 ? 's' : '') + ' ' : ''}${dizaines > 0 ? dizaines + ' dizaine' + (dizaines > 1 ? 's' : '') + ' ' : ''}${unites > 0 ? unites + ' unité' + (unites > 1 ? 's' : '') : ''}.`
              : "C'est enregistré !"}
          </p>
        </div>
      )}

      {/* Bouton validation */}
      {!validated && !guidedFeedback && (
        <button
          onClick={handleValidate}
          disabled={!hasBlocks}
          className="mt-4 w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors min-h-[44px]"
        >
          ✋ J'ai terminé — Valider ma réponse
        </button>
      )}
    </div>
  )
}
