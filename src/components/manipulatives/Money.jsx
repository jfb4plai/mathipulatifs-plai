import { useState, useMemo, useRef, useEffect } from 'react'
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

const DENOM_BY_VALUE = Object.fromEntries(DENOMS.map((d) => [d.value, d]))

function formatCents(c) {
  const sign = c < 0 ? '-' : ''
  const abs = Math.abs(c)
  const euros = Math.floor(abs / 100)
  const cents = abs % 100
  if (cents === 0) return `${sign}${euros} €`
  return `${sign}${euros},${String(cents).padStart(2, '0')} €`
}

/** Composition gloutonne exacte : les plus grosses valeurs d'abord.
 *  La pièce de 1 centime est toujours disponible, donc le reste tombe à 0. */
function greedyCoins(target, denoms) {
  const out = []
  let rest = target
  const desc = [...denoms].sort((a, b) => b.value - a.value)
  for (const d of desc) {
    while (rest >= d.value) {
      out.push(d.value)
      rest -= d.value
    }
  }
  return out
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
  const {
    mode = 'composer',
    targetAmount,
    price,
    paid,
    maxDenomination = 500,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const availableDenoms = useMemo(() => DENOMS.filter((d) => d.value <= maxDenomination), [maxDenomination])

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  const total = workspace.reduce((sum, v) => sum + v, 0)
  const changeExpected = mode === 'rendu' ? (paid ?? 0) - (price ?? 0) : null
  const target = mode === 'composer' ? targetAmount : changeExpected
  const hasTarget = target !== undefined && target !== null

  // Regroupe les pièces/billets identiques (« 50 c × 3 ») pour alléger la
  // charge visuelle de l'espace de travail. Plus grosse valeur en premier,
  // comme on manipule la vraie monnaie.
  const grouped = useMemo(() => {
    const counts = new Map()
    workspace.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([value, count]) => ({ denom: DENOM_BY_VALUE[value], count }))
  }, [workspace])

  const addCoin = (value) => {
    if (validated) return
    setWorkspace((prev) => [...prev, value])
  }

  // Retire une seule occurrence de cette dénomination (la dernière ajoutée).
  const removeCoin = (value) => {
    if (validated) return
    setWorkspace((prev) => {
      const idx = prev.lastIndexOf(value)
      if (idx === -1) return prev
      return prev.filter((_, i) => i !== idx)
    })
  }

  const clearWorkspace = () => {
    if (validated) return
    setWorkspace([])
  }

  const buildHint = () => {
    const gap = target - total
    if (gap > 0) {
      // Suggère la plus grosse pièce/billet disponible qui tienne dans l'écart.
      const suggestion = [...availableDenoms].sort((a, b) => b.value - a.value).find((d) => d.value <= gap)
      if (suggestion) {
        const article = suggestion.type === 'billet' ? 'un billet de' : 'une pièce de'
        return `Il te manque ${formatCents(gap)} — essaie d'ajouter ${article} ${suggestion.spoken}.`
      }
      return `Il te manque ${formatCents(gap)}.`
    }
    return `Tu as ${formatCents(-gap)} de trop — retire une pièce ou un billet.`
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : voici une façon de faire ${formatCents(target)}.`)
    // Laisse l'élève voir sa réponse ~2 s, puis compose une solution valide.
    revealTimer.current = setTimeout(() => {
      setWorkspace(greedyCoins(target, availableDenoms))
    }, 2000)
  }

  const handleValidate = () => {
    const studentResult = { total, workspace, target }

    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`Total : ${formatCents(total)}`)
      return
    }

    const n = attempts + 1
    setAttempts(n)

    if (total === target) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak(`Pas tout à fait. Il fallait ${formatCents(target)}.`)
      return
    }

    const msg = buildHint()
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }

  // Après révélation, `workspace` contient la solution : on ne doit pas afficher « correct ».
  const isCorrect = !hasTarget ? null : solutionShown ? false : total === target

  // Feedback temps réel : écart au montant visé (aide à l'estimation pour les
  // élèves en difficulté, comme voir grossir une pile de vraies pièces).
  const gap = hasTarget ? target - total : 0
  const pct = hasTarget && target > 0 ? Math.min(100, Math.round((total / target) * 100)) : 0
  const liveState = !hasTarget ? null : gap > 0 ? 'under' : gap === 0 ? 'exact' : 'over'

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {mode === 'rendu' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800 font-semibold text-center">
            🛒 L'article coûte <span className="font-bold">{formatCents(price ?? 0)}</span>. Le client paie avec{' '}
            <span className="font-bold">{formatCents(paid ?? 0)}</span>.
          </p>
          <p className="text-blue-600 text-sm mt-1 text-center">Compose la monnaie exacte à lui rendre.</p>
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
          <div className="flex items-center justify-between mb-2 gap-2">
            {!focusMode ? (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Espace de travail —{' '}
                <span className="font-bold text-sm normal-case text-gray-700">Total : {formatCents(total)}</span>
              </h3>
            ) : (
              <div className="font-bold text-gray-700">Total : {formatCents(total)}</div>
            )}
            {workspace.length > 0 && !validated && (
              <button
                onClick={clearWorkspace}
                className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors shrink-0 min-h-[36px]"
              >
                Tout effacer
              </button>
            )}
          </div>

          <div className="min-h-[160px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-wrap gap-2 content-start">
            {workspace.length === 0 && (
              <p className="text-gray-400 text-sm w-full text-center pt-8">
                Clique sur une pièce ou un billet pour l'ajouter ici
              </p>
            )}
            {grouped.map(({ denom, count }) => (
              <button
                key={denom.value}
                onClick={() => removeCoin(denom.value)}
                disabled={validated}
                title={`Retirer ${denom.label}`}
                aria-label={`Retirer ${denom.type === 'billet' ? 'un billet de' : 'une pièce de'} ${denom.spoken} (${count} en tout)`}
                style={{ background: 'none', border: 'none', padding: 0, cursor: validated ? 'default' : 'pointer' }}
              >
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <CoinShape denom={denom} />
                  {count > 1 && (
                    <span
                      className="bg-gray-800 text-white font-bold flex items-center justify-center"
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        minWidth: 22,
                        height: 22,
                        padding: '0 5px',
                        borderRadius: 11,
                        fontSize: 12,
                        border: '2px solid white',
                      }}
                    >
                      ×{count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Feedback temps réel vers la cible */}
          {hasTarget && !validated && workspace.length > 0 && (
            <div className="mt-3">
              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    liveState === 'exact' ? 'bg-green-500' : liveState === 'over' ? 'bg-orange-400' : 'bg-teal-400'
                  }`}
                  style={{ width: `${liveState === 'over' ? 100 : pct}%` }}
                />
              </div>
              {!hint && (
                <p
                  className={`text-sm font-semibold mt-1.5 text-center ${
                    liveState === 'exact' ? 'text-green-700' : liveState === 'over' ? 'text-orange-600' : 'text-teal-700'
                  }`}
                  aria-live="polite"
                >
                  {liveState === 'under' && `Il manque ${formatCents(gap)}`}
                  {liveState === 'exact' && '✓ Tu y es — le compte est exact !'}
                  {liveState === 'over' && `Tu as ${formatCents(-gap)} de trop`}
                </p>
              )}
            </div>
          )}

          {hint && !validated && (
            <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">💡</span>
                <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
              </div>
            </div>
          )}

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
              {solutionShown && `Voici une façon de faire ${formatCents(target)} — il en existe d'autres !`}
              {isCorrect === false && !solutionShown && `Total : ${formatCents(total)} — Attendu : ${formatCents(target)}`}
              {isCorrect === null && `Total : ${formatCents(total)}`}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
