import { useState, useRef, useEffect } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'
import { runSequence, validateGapSetup, expectedGap, checkGap, describeOp } from '../../lib/hundredActivities.js'

const PALETTE = [
  { id: 'yellow', bg: '#F6E05E', border: '#B7791F', label: 'Jaune' },
  { id: 'red',    bg: '#FC8181', border: '#C53030', label: 'Rouge' },
  { id: 'green',  bg: '#68D391', border: '#276749', label: 'Vert' },
  { id: 'blue',   bg: '#90CDF4', border: '#2C5282', label: 'Bleu' },
]

const ARROW = '#0f6e56'
const ROW = 37 // hauteur d'une ligne de la grille : cases de 34 px + espace de 3 px

/** Flèches repères : chacune montre UN seul pas, sur un exemple.
 *  +10 : une ligne plus bas (de 1 à 11) · −10 : une ligne plus haut (de 100 à 90)
 *  +1 : une case à droite (de 1 à 2) · −1 : une case à gauche (de 100 à 99).
 *  Décoratives : l'explication équivalente est donnée en texte masqué visuellement. */
function ArrowFrame({ show, children }) {
  if (!show) return children
  const label = { fontSize: 16, fontWeight: 700, color: ARROW, lineHeight: 1, position: 'absolute', whiteSpace: 'nowrap' }
  const head = { width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent' }
  const stroke = { fill: 'none', stroke: ARROW, strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }
  const mid = ROW / 2 // centre de la 1re ligne ; la 2e est à mid + ROW
  const sideH = ROW * 2
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 72px', gridTemplateRows: 'auto 1fr auto', columnGap: 4 }}>
      <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        Repères : une case à droite, c'est plus 1. Une case à gauche, c'est moins 1. Une ligne plus bas, c'est plus 10. Une ligne plus haut, c'est moins 10.
      </span>

      {/* +1 : de la case 1 à la case 2 */}
      <div aria-hidden="true" style={{ gridColumn: 2, gridRow: 1, position: 'relative', height: 40 }}>
        <div style={{ ...label, left: '10%', transform: 'translateX(-50%)', top: 0 }}>+1</div>
        <div style={{ position: 'absolute', left: '5%', width: '10%', top: 24, display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1, height: 3, background: ARROW, borderRadius: 2 }} />
          <div style={{ ...head, borderLeft: `11px solid ${ARROW}` }} />
        </div>
      </div>

      {/* +10 : de la ligne 1 à la ligne 2, à gauche */}
      <div aria-hidden="true" style={{ gridColumn: 1, gridRow: 2, position: 'relative' }}>
        <svg viewBox={`0 0 72 ${sideH}`} width="72" height={sideH} style={{ position: 'absolute', top: 0, left: 0 }}>
          <path d={`M 66 ${mid} C 30 ${mid - 3}, 30 ${mid + ROW + 3}, 64 ${mid + ROW}`} {...stroke} />
          <path d={`M 55 ${mid + ROW - 7} L 65 ${mid + ROW} L 54 ${mid + ROW + 6}`} {...stroke} />
        </svg>
        <div style={{ ...label, left: 0, top: ROW - 8 }}>+10</div>
      </div>

      <div style={{ gridColumn: 2, gridRow: 2 }}>{children}</div>

      {/* −10 : de la ligne 10 à la ligne 9, à droite */}
      <div aria-hidden="true" style={{ gridColumn: 3, gridRow: 2, position: 'relative' }}>
        <svg viewBox={`0 0 72 ${sideH}`} width="72" height={sideH} style={{ position: 'absolute', bottom: 0, left: 0 }}>
          <path d={`M 6 ${mid + ROW} C 42 ${mid + ROW + 3}, 42 ${mid - 3}, 8 ${mid}`} {...stroke} />
          <path d={`M 17 ${mid - 6} L 7 ${mid} L 18 ${mid + 7}`} {...stroke} />
        </svg>
        <div style={{ ...label, left: 40, bottom: ROW - 8 }}>−10</div>
      </div>

      {/* −1 : de la case 100 à la case 99 */}
      <div aria-hidden="true" style={{ gridColumn: 2, gridRow: 3, position: 'relative', height: 44 }}>
        <div style={{ position: 'absolute', left: '85%', width: '10%', top: 8, display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
          <div style={{ flex: 1, height: 3, background: ARROW, borderRadius: 2 }} />
          <div style={{ ...head, borderRight: `11px solid ${ARROW}` }} />
        </div>
        <div style={{ ...label, left: '90%', transform: 'translateX(-50%)', top: 22 }}>−1</div>
      </div>
    </div>
  )
}

export default function HundredChart({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    startAt = 1,        // 1 or 0
    mode = 'libre',     // 'libre' | 'multiples' | 'sequence' | 'ecart'
    multipleOf,         // used when mode = 'multiples'
    startCell,          // modes 'sequence' et 'ecart' : case de départ
    ops = [],           // mode 'sequence' : [{ sign: '+' | '-', value }]
    targetCell,         // mode 'ecart' : case cible
    arrows = false,     // aménagement : flèches repères +10 / -10 / +1 / -1
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

  const isSeq = mode === 'sequence'
  const isGap = mode === 'ecart'
  const isActivity = isSeq || isGap
  const seqResult = isSeq ? runSequence(startCell, ops, startAt) : null
  const gapSetup = isGap ? validateGapSetup(startCell, targetCell, startAt) : null
  const activityBroken = isSeq ? !seqResult.ok : isGap ? !gapSetup.ok : false
  const activityEnd = isSeq ? seqResult.end : null

  const [picked, setPicked] = useState(null)        // sequence : case choisie
  const [gapSign, setGapSign] = useState(null)      // ecart : '+' | '-'
  const [gapValue, setGapValue] = useState('')      // ecart : texte saisi
  const [outcome, setOutcome] = useState(null)      // 'correct' | 'wrong' | 'revealed'

  const hasTarget = mode === 'multiples' && !!multipleOf
  const expectedMultiples = hasTarget ? numbers.filter((n) => n !== 0 && n % multipleOf === 0) : []

  const toggleCell = (n) => {
    if (validated) return
    if (isGap) return
    if (isSeq) {
      setPicked(n)
      setHint(null)
      return
    }
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

  const handleActivityValidate = () => {
    let correct
    let studentResult
    let hintMsg
    if (isSeq) {
      if (picked == null) {
        setHint("Clique d'abord sur la case d'arrivée.")
        return
      }
      correct = picked === activityEnd
      studentResult = { mode, startCell, ops, picked, expected: activityEnd }
      hintMsg = picked > activityEnd
        ? "Ta case est trop grande. Refais le calcul étape par étape."
        : "Ta case est trop petite. Refais le calcul étape par étape."
    } else {
      const value = gapValue === '' ? null : parseInt(gapValue, 10)
      const res = checkGap(startCell, targetCell, { sign: gapSign, value })
      if (res.problem === 'choix') {
        setHint("Choisis d'abord « J'ajoute » ou « Je retire ».")
        return
      }
      if (res.problem === 'valeur-absente') {
        setHint('Écris le nombre.')
        return
      }
      correct = res.correct
      studentResult = { mode, startCell, targetCell, answer: { sign: gapSign, value }, expected: expectedGap(startCell, targetCell) }
      hintMsg = res.problem === 'signe'
        ? (targetCell > startCell ? 'La case cible est plus grande que le départ.' : 'La case cible est plus petite que le départ.')
        : 'Le sens est bon. Vérifie le nombre.'
    }

    const n = attempts + 1
    setAttempts(n)

    if (correct) {
      setValidated(true)
      setHint(null)
      setOutcome('correct')
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      setOutcome('wrong')
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
      if (ttsEnabled) speak('Pas tout à fait.')
      return
    }

    setHint(hintMsg)
    if (ttsEnabled) speak(hintMsg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      setValidated(true)
      setSolutionShown(true)
      setOutcome('revealed')
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
      if (ttsEnabled) speak('Regarde la solution.')
      revealTimer.current = setTimeout(() => {
        if (isSeq) {
          setPicked(activityEnd)
        } else {
          const exp = expectedGap(startCell, targetCell)
          setGapSign(exp.sign)
          setGapValue(String(exp.value))
        }
        setRevealApplied(true)
        setHint(null)
      }, 2000)
    }
  }

  const handleValidate = () => {
    if (isActivity) return handleActivityValidate()
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
    if (isActivity) {
      if (n === startCell) return { backgroundColor: '#BEE3F8', borderColor: '#2C5282', borderWidth: 3, fontWeight: 'bold' }
      if (isGap && n === targetCell) return { backgroundColor: '#FBD38D', borderColor: '#C05621', borderWidth: 3, borderStyle: 'dashed', fontWeight: 'bold' }
      if (isSeq && n === picked) {
        const good = outcome === 'correct' || (outcome === 'revealed' && revealApplied)
        return good
          ? { backgroundColor: '#68D391', borderColor: '#276749', borderWidth: 3, fontWeight: 'bold' }
          : { backgroundColor: '#F6E05E', borderColor: '#B7791F', borderWidth: 3, fontWeight: 'bold' }
      }
      return { backgroundColor: '#F7FAFC', borderColor: '#E2E8F0' }
    }
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

  if (activityBroken) {
    return (
      <div className="p-4 rounded-xl bg-orange-50 border border-orange-300 text-orange-800 font-semibold">
        Cet exercice est mal réglé : {isSeq ? seqResult.reason : gapSetup.reason} Demande à ton enseignant de le corriger.
      </div>
    )
  }

  const activityDone = validated && (!solutionShown || revealApplied)
  const expGap = isGap ? expectedGap(startCell, targetCell) : null

  return (
    <div>
      {/* Consigne des activités */}
      {isSeq && (
        <div className="mb-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900" style={{ fontSize: 16 }}>
          <p className="font-bold mb-1">Pars de la case {startCell}.</p>
          <ol className="list-decimal pl-6 space-y-0.5">
            {ops.map((op, i) => <li key={i}>{describeOp(op)}.</li>)}
          </ol>
          <p className="mt-2 font-semibold">Clique sur la case d'arrivée.</p>
        </div>
      )}
      {isGap && (
        <div className="mb-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900" style={{ fontSize: 16 }}>
          <p className="font-bold">
            Pour aller de {startCell} à {targetCell}, que dois-tu ajouter ou retirer ?
          </p>
          <ul className="mt-2 flex gap-4 flex-wrap" style={{ fontSize: 14 }}>
            <li><span style={{ display: 'inline-block', width: 16, height: 16, background: '#BEE3F8', border: '3px solid #2C5282', verticalAlign: 'middle' }} /> Départ ({startCell})</li>
            <li><span style={{ display: 'inline-block', width: 16, height: 16, background: '#FBD38D', border: '3px dashed #C05621', verticalAlign: 'middle' }} /> Cible ({targetCell})</li>
          </ul>
        </div>
      )}

      {/* Mode indicator */}
      {mode === 'multiples' && multipleOf && !focusMode && (
        <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm text-indigo-800 font-medium">
          🔍 Colorie tous les multiples de <strong>{multipleOf}</strong> dans la grille
        </div>
      )}

      {/* Palette de couleurs */}
      {!validated && !isActivity && (
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
      <ArrowFrame show={arrows}>
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
            disabled={validated || isGap}
            role="gridcell"
            aria-label={`${n}${colored[n] ? ', colorié' : ''}${isActivity && n === startCell ? ', départ' : ''}${isGap && n === targetCell ? ', cible' : ''}${isSeq && n === picked ? ', choisie' : ''}`}
            style={{
              height: 34,
              borderRadius: 4,
              border: `1px solid`,
              fontSize: isActivity ? 13 : 11,
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
      </ArrowFrame>

      {/* Indice après une réponse fausse — l'élève peut réessayer */}
      {hint && !revealApplied && (
        <div className="mb-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}

      {/* Réponse de l'écart : signe + nombre */}
      {isGap && !validated && (
        <div className="mb-3 flex items-center gap-2 flex-wrap">
          {[['+', "J'ajoute"], ['-', 'Je retire']].map(([sign, text]) => (
            <button
              key={sign}
              onClick={() => { setGapSign(sign); setHint(null) }}
              aria-pressed={gapSign === sign}
              className={`px-4 rounded-xl font-bold border-2 min-h-[44px] ${
                gapSign === sign ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'
              }`}
              style={{ fontSize: 16 }}
            >
              {text}
            </button>
          ))}
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={gapValue}
            onChange={(e) => { setGapValue(e.target.value); setHint(null) }}
            aria-label="Le nombre à ajouter ou à retirer"
            placeholder="?"
            className="w-24 px-3 border-2 border-gray-300 rounded-xl text-center font-bold min-h-[44px]"
            style={{ fontSize: 18 }}
          />
        </div>
      )}
      {isGap && validated && (
        <p className="mb-3 font-semibold text-gray-700" style={{ fontSize: 16 }}>
          Ta réponse : {gapSign === '+' ? "j'ajoute" : 'je retire'} {gapValue}
        </p>
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

      {isActivity && activityDone && (
        <div
          className={`mt-3 p-3 rounded-xl text-center font-bold ${
            outcome === 'correct' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
          }`}
          style={{ fontSize: 16 }}
        >
          {outcome === 'correct' && (isSeq ? `✓ Correct ! Tu arrives à ${activityEnd}.` : `✓ Correct ! De ${startCell} à ${targetCell}, ${expGap.sign === '+' ? 'on ajoute' : 'on retire'} ${expGap.value}.`)}
          {outcome === 'revealed' && (isSeq ? `Regarde : l'arrivée est ${activityEnd}.` : `Regarde : ${expGap.sign === '+' ? 'on ajoute' : 'on retire'} ${expGap.value}.`)}
          {outcome === 'wrong' && 'Pas tout à fait.'}
        </div>
      )}

      {!isActivity && validated && (!solutionShown || revealApplied) && (
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
