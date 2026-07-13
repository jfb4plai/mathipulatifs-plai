import { useState, useMemo } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const DENOMS = [
  { value: 1, label: '1 c', spoken: '1 centime', type: 'piece', color: '#B87333', textColor: '#1A202C' },
  { value: 2, label: '2 c', spoken: '2 centimes', type: 'piece', color: '#B87333', textColor: '#1A202C' },
  { value: 5, label: '5 c', spoken: '5 centimes', type: 'piece', color: '#B87333', textColor: '#1A202C' },
  { value: 10, label: '10 c', spoken: '10 centimes', type: 'piece', color: '#D4A24C', textColor: '#1A202C' },
  { value: 20, label: '20 c', spoken: '20 centimes', type: 'piece', color: '#D4A24C', textColor: '#1A202C' },
  { value: 50, label: '50 c', spoken: '50 centimes', type: 'piece', color: '#D4A24C', textColor: '#1A202C' },
  { value: 100, label: '1 €', spoken: '1 euro', type: 'piece', color: '#C9B037', textColor: '#1A202C' },
  { value: 200, label: '2 €', spoken: '2 euros', type: 'piece', color: '#C0C0C0', textColor: '#1A202C' },
  { value: 500, label: '5 €', spoken: '5 euros', type: 'billet', color: '#8C6BAF', textColor: '#FFFFFF' },
  { value: 1000, label: '10 €', spoken: '10 euros', type: 'billet', color: '#C0392B', textColor: '#FFFFFF' },
  { value: 2000, label: '20 €', spoken: '20 euros', type: 'billet', color: '#2980B9', textColor: '#FFFFFF' },
  { value: 5000, label: '50 €', spoken: '50 euros', type: 'billet', color: '#E67E22', textColor: '#1A202C' },
]

function formatCents(c) {
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(c)
  const euros = Math.floor(abs / 100)
  const cents = abs % 100
  if (cents === 0) return `${sign}${euros} €`
  return `${sign}${euros},${String(cents).padStart(2, '0')} €`
}

function CoinShape({ denom, size = 48 }) {
  if (denom.type === 'billet') {
    return (
      <div
        style={{
          width: size * 1.6,
          height: Math.max(44, size * 0.75),
          backgroundColor: denom.color,
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: denom.textColor,
          fontWeight: 'bold',
          fontSize: 12,
        }}
      >
        {denom.label}
      </div>
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: denom.color,
        border: '2px solid rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: denom.textColor,
        fontWeight: 'bold',
        fontSize: 11,
      }}
    >
      {denom.label}
    </div>
  )
}

export default function Money({ config = {}, onValidate }) {
  const { mode = 'composer', targetAmount, price, paid, maxDenomination = 500 } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const availableDenoms = useMemo(() => DENOMS.filter((d) => d.value <= maxDenomination), [maxDenomination])

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)

  const total = workspace.reduce((sum, v) => sum + v, 0)
  const changeExpected = mode === 'rendu' ? (paid ?? 0) - (price ?? 0) : null
  const target = mode === 'composer' ? targetAmount : changeExpected

  const addCoin = (value) => {
    if (validated) return
    setWorkspace((prev) => [...prev, value])
  }

  const removeCoin = (index) => {
    if (validated) return
    setWorkspace((prev) => prev.filter((_, i) => i !== index))
  }

  const handleValidate = () => {
    setValidated(true)
    const correct = target !== undefined && target !== null ? total === target : null
    const result = { total, workspace, correct, target }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${formatCents(total)}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. Il fallait ${formatCents(target)}.`
      )
    }
  }

  const isCorrect = target !== undefined && target !== null ? total === target : null

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {mode === 'rendu' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-blue-800 font-semibold">
            Prix de l'article : <span className="font-bold">{formatCents(price ?? 0)}</span> — Payé :{' '}
            <span className="font-bold">{formatCents(paid ?? 0)}</span>
          </p>
          <p className="text-blue-600 text-sm mt-1">Rends la monnaie exacte au client.</p>
        </div>
      )}
      {mode === 'composer' && targetAmount !== undefined && (
        <div className="mb-4 text-center">
          <span className="text-lg font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Cible : {formatCents(targetAmount)}
          </span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap items-start">
        <div className="shrink-0">
          {!focusMode && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Banque</h3>}
          <div className="flex flex-wrap gap-2 max-w-[280px]">
            {availableDenoms.map((d) => (
              <button
                key={d.value}
                onClick={() => addCoin(d.value)}
                disabled={validated}
                title={`Ajouter ${d.label}`}
                aria-label={`Ajouter ${d.type === 'billet' ? 'un billet de' : 'une pièce de'} ${d.spoken}`}
                className="disabled:opacity-50 hover:scale-105 transition-transform"
                style={{ cursor: validated ? 'default' : 'pointer' }}
              >
                <CoinShape denom={d} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          {!focusMode && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Espace de travail —{' '}
              <span className="font-bold text-sm normal-case text-gray-700">Total : {formatCents(total)}</span>
            </h3>
          )}
          {focusMode && <div className="mb-2 font-bold text-gray-700">Total : {formatCents(total)}</div>}

          <div className="min-h-[160px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-wrap gap-2 content-start">
            {workspace.length === 0 && (
              <p className="text-gray-400 text-sm w-full text-center pt-8">
                Clique sur une pièce ou un billet pour l'ajouter ici
              </p>
            )}
            {workspace.map((value, index) => {
              const d = DENOMS.find((x) => x.value === value)
              return (
                <button
                  key={index}
                  onClick={() => removeCoin(index)}
                  disabled={validated}
                  title={`Retirer ${d.label}`}
                  aria-label={`Retirer ${d.type === 'billet' ? 'le billet de' : 'la pièce de'} ${d.spoken}`}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: validated ? 'default' : 'pointer' }}
                >
                  <CoinShape denom={d} />
                </button>
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
              {isCorrect === true && `✓ Correct ! Total = ${formatCents(total)}`}
              {isCorrect === false && `Total : ${formatCents(total)} — Attendu : ${formatCents(target)}`}
              {isCorrect === null && `Total : ${formatCents(total)}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
