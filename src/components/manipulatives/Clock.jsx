import { useState, useRef, useEffect } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = CENTER - 20

// Pas de cliquet : les aiguilles glissent librement et la validation accepte
// une zone autour de la position exacte (le geste précis est un apprentissage
// en soi, l'enseignant est tolérant).
// ±15° sur la grande aiguille = ±2,5 minutes.
// ±12° sur la petite aiguille = ±24 minutes de trajet : assez large pour un
// geste d'enfant, assez strict pour refuser une aiguille laissée sur l'heure
// pile quand la cible est une demie.
const MINUTE_TOL_DEG = 15
const HOUR_TOL_DEG = 12

function pad2(n) {
  return String(n).padStart(2, '0')
}

function formatTime(h, m) {
  return `${h}h${pad2(m)}`
}

function randomTime(granularity) {
  const h = Math.floor(Math.random() * 12) + 1
  const stepsPerHour = 60 / granularity
  const m = Math.floor(Math.random() * stepsPerHour) * granularity
  return { h, m }
}

function hourAngleOf(h, m) {
  return (((h % 12) + m / 60) * 30) % 360
}

function minuteAngleOf(m) {
  return (m / 60) * 360
}

function normalize(a) {
  return ((a % 360) + 360) % 360
}

function angDiff(a, b) {
  const d = Math.abs(normalize(a) - normalize(b))
  return Math.min(d, 360 - d)
}

function angleFromPoint(x, y) {
  let deg = (Math.atan2(x - CENTER, CENTER - y) * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

function dialPoint(angle, length) {
  return {
    x: CENTER + length * Math.sin((angle * Math.PI) / 180),
    y: CENTER - length * Math.cos((angle * Math.PI) / 180),
  }
}

function minuteHint(m) {
  if (m === 0) return 'La grande aiguille (bleue) doit pointer sur le 12.'
  if (m % 5 === 0) return `La grande aiguille (bleue) doit pointer sur le ${m / 5}.`
  const beforeRaw = Math.floor(m / 5)
  const before = beforeRaw === 0 ? 12 : beforeRaw
  const afterRaw = (beforeRaw + 1) % 12
  const after = afterRaw === 0 ? 12 : afterRaw
  return `La grande aiguille (bleue) doit être entre le ${before} et le ${after}.`
}

function hourHint(h, m) {
  const next = (h % 12) + 1
  if (m === 0) return `La petite aiguille (noire) doit pointer pile sur le ${h}.`
  if (m === 30) return `La petite aiguille (noire) doit être à mi-chemin entre le ${h} et le ${next}.`
  return `La petite aiguille (noire) doit être entre le ${h} et le ${next}, ${
    m < 30 ? `plus près du ${h}` : `plus près du ${next}`
  }.`
}

/** Une aiguille : trait visible + zone de saisie large (trait invisible épais
 *  et poignée pleine 44px+) le tout dans un groupe tourné, ce qui permet une
 *  animation fluide quand on révèle la solution. */
function Hand({ angle, length, stroke, strokeWidth, handleFill, active, interactive, slow, listeners, aria }) {
  return (
    <g
      style={{
        transform: `rotate(${angle}deg)`,
        transformOrigin: `${CENTER}px ${CENTER}px`,
        // Pendant la manipulation : aucune latence. Recalage de correction :
        // lent (2 s) pour que l'élève voie l'aiguille se déplacer. Sinon 0,4 s.
        transition: active ? 'none' : slow ? 'transform 2s ease-in-out' : 'transform 0.4s ease',
      }}
    >
      <line
        x1={CENTER}
        y1={CENTER}
        x2={CENTER}
        y2={CENTER - length}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {interactive && (
        <>
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - length}
            stroke="transparent"
            strokeWidth={30}
            style={{ pointerEvents: 'stroke', cursor: active ? 'grabbing' : 'grab' }}
            {...listeners}
          />
          <circle
            cx={CENTER}
            cy={CENTER - length}
            r={active ? 26 : 22}
            fill={handleFill}
            stroke="white"
            strokeWidth={3}
            style={{ cursor: active ? 'grabbing' : 'grab', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            {...listeners}
            {...aria}
          />
        </>
      )}
    </g>
  )
}

export default function Clock({ config = {}, onValidate }) {
  const {
    mode = 'libre',
    granularity = 30,
    targetTime,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const isReadMode = mode === 'lire'
  const isPlaceMode = mode === 'placer'
  const target = isPlaceMode ? (targetTime || { h: 3, m: 0 }) : null

  const [fixedTime] = useState(() => (isReadMode ? (targetTime || randomTime(granularity)) : null))

  // Position de départ : 10h10 — les deux aiguilles sont bien écartées,
  // chacune est facile à saisir dès le premier contact.
  const [hourAngle, setHourAngle] = useState(() =>
    isReadMode ? hourAngleOf(fixedTime.h, fixedTime.m) : hourAngleOf(10, 10)
  )
  const [minuteAngle, setMinuteAngle] = useState(() =>
    isReadMode ? minuteAngleOf(fixedTime.m) : minuteAngleOf(10)
  )
  // Un pointeur actif par aiguille : sur TBI, deux élèves (ou deux mains)
  // peuvent manipuler les deux aiguilles en même temps.
  const [activePointer, setActivePointer] = useState({ hour: null, minute: null })
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null) // true | false | 'solution' | null
  const [precise, setPrecise] = useState(false) // placement déjà exact, sans recalage visible
  const [correcting, setCorrecting] = useState(false) // phase de recalage lent en cours
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const [revealApplied, setRevealApplied] = useState(false)
  const [readH, setReadH] = useState('')
  const [readM, setReadM] = useState('')

  const svgRef = useRef(null)
  const correctionTimer = useRef(null)
  const locked = validated || isReadMode

  // Nettoie le minuteur de recalage si le composant est démonté avant qu'il ne se déclenche.
  useEffect(() => () => clearTimeout(correctionTimer.current), [])

  // Lecture interprétée du cadran : l'heure vient du secteur où se trouve la
  // petite aiguille, les minutes de la grande arrondie à la minute.
  const readHours = Math.floor(normalize(hourAngle) / 30) || 12
  const readMinutes = Math.round(normalize(minuteAngle) / 6) % 60

  const pointAngle = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const scale = SIZE / rect.width
    return angleFromPoint((e.clientX - rect.left) * scale, (e.clientY - rect.top) * scale)
  }

  const listenersFor = (which) => ({
    onPointerDown: (e) => {
      if (locked) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      setActivePointer((p) => ({ ...p, [which]: e.pointerId }))
    },
    onPointerMove: (e) => {
      if (locked || activePointer[which] !== e.pointerId) return
      const a = pointAngle(e)
      if (which === 'hour') setHourAngle(a)
      else setMinuteAngle(a)
    },
    onPointerUp: (e) => {
      setActivePointer((p) => (p[which] === e.pointerId ? { ...p, [which]: null } : p))
    },
    onPointerCancel: (e) => {
      setActivePointer((p) => (p[which] === e.pointerId ? { ...p, [which]: null } : p))
    },
    onKeyDown: (e) => {
      if (locked) return
      const dir =
        e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : 0
      if (!dir) return
      e.preventDefault()
      // Flèches : 1 minute par pas pour la grande aiguille, 5 minutes de
      // trajet pour la petite.
      if (which === 'hour') setHourAngle((a) => normalize(a + dir * 2.5))
      else setMinuteAngle((a) => normalize(a + dir * 6))
    },
  })

  const handleValidate = () => {
    if (isPlaceMode) {
      const okH = angDiff(hourAngle, hourAngleOf(target.h, target.m)) <= HOUR_TOL_DEG
      const okM = angDiff(minuteAngle, minuteAngleOf(target.m)) <= MINUTE_TOL_DEG
      if (okH && okM) {
        // Placement déjà « propre » (à quelques degrés près) : rien à recaler.
        const wasPrecise =
          angDiff(hourAngle, hourAngleOf(target.h, target.m)) <= 4 &&
          angDiff(minuteAngle, minuteAngleOf(target.m)) <= 4
        // On valide l'effort (tolérance). Si le placement est approximatif, on
        // LAISSE d'abord l'élève regarder sa réponse ~2,5 s, PUIS on recale
        // lentement (2 s) les aiguilles sur la position exacte pour qu'il voie
        // le déplacement et mémorise le bon modèle.
        setValidated(true)
        setFeedback(true)
        setPrecise(wasPrecise)
        setHint(null)
        if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: true, attempts: attempts + 1, revealMs: wasPrecise ? 0 : 4500 })
        if (ttsEnabled) speak(wasPrecise ? `Parfait ! Il est exactement ${formatTime(target.h, target.m)}.` : 'Bravo ! Regarde bien ta réponse.')
        if (!wasPrecise) {
          correctionTimer.current = setTimeout(() => {
            setCorrecting(true)
            setHourAngle(hourAngleOf(target.h, target.m))
            setMinuteAngle(minuteAngleOf(target.m))
            if (ttsEnabled) speak(`Voici la position exacte pour ${formatTime(target.h, target.m)}.`)
          }, 2500)
        }
      } else {
        const n = attempts + 1
        setAttempts(n)

        if (!allowMultipleAttempts) {
          setValidated(true)
          setFeedback(false)
          if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, revealMs: 0 })
          if (ttsEnabled) speak(`Pas tout à fait. Il fallait ${formatTime(target.h, target.m)}.`)
          return
        }

        const parts = []
        if (!okM) parts.push(minuteHint(target.m))
        if (!okH) parts.push(hourHint(target.h, target.m))
        const msg = parts.join(' ')
        setHint(msg)
        if (ttsEnabled) speak(`Pas encore. ${msg}`)

        if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
          revealSolution(n)
        }
      }
      return
    }

    if (isReadMode) {
      const h = parseInt(readH, 10)
      const m = parseInt(readM, 10)
      const ok = h === fixedTime.h && m === fixedTime.m
      setValidated(true)
      setFeedback(ok)
      if (onValidate) onValidate({ readH: h, readM: m, actual: fixedTime, correct: ok, revealMs: 0 })
      if (ttsEnabled) speak(ok ? 'Bravo, c\'est correct !' : 'Pas tout à fait.')
      return
    }

    // Mode libre : on enregistre simplement la lecture.
    setValidated(true)
    setFeedback(null)
    if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, correct: null })
    if (ttsEnabled) speak(`Il est ${formatTime(readHours, readMinutes)}`)
  }

  const revealSolution = (n) => {
    setValidated(true)
    setFeedback('solution')
    setSolutionShown(true)
    if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, solutionShown: true, revealMs: 4000 })
    if (ttsEnabled) speak(`Regarde : voici ${formatTime(target.h, target.m)}.`)
    // Laisse l'élève voir l'indice ~2 s, puis fait glisser lentement les
    // aiguilles vers la position exacte.
    correctionTimer.current = setTimeout(() => {
      setCorrecting(true)
      setHourAngle(hourAngleOf(target.h, target.m))
      setMinuteAngle(minuteAngleOf(target.m))
      setRevealApplied(true)
      setHint(null)
      if (ttsEnabled) speak(`Voici la position exacte pour ${formatTime(target.h, target.m)}.`)
    }, 2000)
  }

  const handleReset = () => {
    setHourAngle(hourAngleOf(10, 10))
    setMinuteAngle(minuteAngleOf(10))
    setHint(null)
  }

  const hourAria = {
    role: 'slider',
    'aria-label': 'Aiguille des heures',
    'aria-valuenow': readHours,
    'aria-valuemin': 1,
    'aria-valuemax': 12,
    'aria-valuetext': `${readHours} heures`,
    tabIndex: 0,
  }
  const minuteAria = {
    role: 'slider',
    'aria-label': 'Aiguille des minutes',
    'aria-valuenow': readMinutes,
    'aria-valuemin': 0,
    'aria-valuemax': 59,
    'aria-valuetext': `${readMinutes} minutes`,
    tabIndex: 0,
  }

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {isPlaceMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <span className="font-bold text-blue-700 text-2xl">Place {formatTime(target.h, target.m)}</span>
          {ttsEnabled && (
            <button
              onClick={() => speak(`Place ${formatTime(target.h, target.m)}`)}
              className="ml-3 text-blue-500 hover:text-blue-700"
              title="Lire à voix haute"
            >
              🔊
            </button>
          )}
        </div>
      )}
      {isReadMode && !focusMode && (
        <p className="text-center text-gray-500 text-sm mb-4">
          Lis l'heure affichée sur le cadran et écris-la ci-dessous.
        </p>
      )}

      <div className="flex justify-center mb-4">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          style={{ width: 'min(100%, 380px)', height: 'auto', touchAction: 'none' }}
          aria-label="Cadran d'horloge"
        >
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#F7FAFC" stroke="#4A5568" strokeWidth={4} />
          {/* Graduations des minutes : repères fins pour se situer sans cliquet */}
          {Array.from({ length: 60 }).map((_, i) => {
            if (i % 5 === 0) return null
            const a = (i / 60) * 360
            const p1 = dialPoint(a, RADIUS - 6)
            const p2 = dialPoint(a, RADIUS - 12)
            return <line key={`m${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#A0AEC0" strokeWidth={1} />
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * 360
            const p1 = dialPoint(a, RADIUS - 8)
            const p2 = dialPoint(a, RADIUS - 18)
            return (
              <line key={`h${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4A5568" strokeWidth={i % 3 === 0 ? 3 : 1.5} />
            )
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * 360
            const p = dialPoint(a, RADIUS - 30)
            return (
              <text key={`n${i}`} x={p.x} y={p.y + 5} textAnchor="middle" fontSize={largeText ? 16 : 14} fontWeight="bold" fill="#2D3748">
                {i === 0 ? 12 : i}
              </text>
            )
          })}
          <Hand
            angle={hourAngle}
            length={RADIUS * 0.52}
            stroke="#1A202C"
            strokeWidth={7}
            handleFill="#1A202C"
            active={activePointer.hour !== null}
            interactive={!locked}
            slow={correcting}
            listeners={listenersFor('hour')}
            aria={hourAria}
          />
          <Hand
            angle={minuteAngle}
            length={RADIUS * 0.8}
            stroke="#3182CE"
            strokeWidth={5}
            handleFill="#3182CE"
            active={activePointer.minute !== null}
            interactive={!locked}
            slow={correcting}
            listeners={listenersFor('minute')}
            aria={minuteAria}
          />
          <circle cx={CENTER} cy={CENTER} r={7} fill="#1A202C" />
        </svg>
      </div>

      {/* Lecture affichée uniquement en exploration libre : en mode « placer »,
          elle donnerait la réponse et l'élève ajusterait les chiffres au lieu
          de raisonner sur le cadran. */}
      {!isReadMode && !isPlaceMode && (
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-gray-800">{formatTime(readHours, readMinutes)}</span>
          {ttsEnabled && (
            <button
              onClick={() => speak(`Il est ${formatTime(readHours, readMinutes)}`)}
              className="ml-3 text-blue-400 hover:text-blue-600 text-xl"
              title="Lire à voix haute"
            >
              🔊
            </button>
          )}
        </div>
      )}

      {isReadMode && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <input
            type="number"
            min={1}
            max={12}
            value={readH}
            onChange={(e) => setReadH(e.target.value)}
            disabled={validated}
            placeholder="H"
            aria-label="Heures lues"
            className="w-16 text-center text-xl font-bold border-2 border-gray-300 rounded-lg py-2"
          />
          <span className="text-xl font-bold">h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={readM}
            onChange={(e) => setReadM(e.target.value)}
            disabled={validated}
            placeholder="min"
            aria-label="Minutes lues"
            className="w-16 text-center text-xl font-bold border-2 border-gray-300 rounded-lg py-2"
          />
        </div>
      )}

      {!focusMode && !validated && (
        <p className="text-center text-xs text-gray-400 mb-4">
          {isReadMode
            ? 'Saisis les heures et les minutes lues sur le cadran'
            : 'Bouge chaque aiguille séparément : la grande bleue indique les minutes, la petite noire indique les heures.'}
        </p>
      )}

      {hint && !revealApplied && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1">{hint}</p>
          </div>
        </div>
      )}

      {!validated && (
        <div className="flex gap-3">
          <button
            onClick={handleValidate}
            disabled={isReadMode && (readH === '' || readM === '')}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
          >
            Valider
          </button>
          {!isReadMode && (
            <button
              onClick={handleReset}
              className="px-4 py-2.5 text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
              title="Remettre les aiguilles à 10h10"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {validated && (!solutionShown || revealApplied) && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            feedback === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : feedback === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {feedback === true &&
            isPlaceMode &&
            (precise
              ? `✓ Parfait ! Il est exactement ${formatTime(target.h, target.m)}.`
              : correcting
              ? `Regarde les aiguilles se placer sur la position exacte pour ${formatTime(target.h, target.m)}.`
              : `✓ Bravo, c'est validé ! Observe bien ta réponse…`)}
          {feedback === true && !isPlaceMode && `✓ Correct ! Il est ${formatTime(readHours, readMinutes)}.`}
          {feedback === 'solution' && `Voici ${formatTime(target.h, target.m)} — regarde bien la position des deux aiguilles.`}
          {feedback === false &&
            isReadMode &&
            `Tu as écrit ${readH || '?'}h${pad2(parseInt(readM, 10) || 0)} — L'heure affichée était ${formatTime(fixedTime.h, fixedTime.m)}`}
          {feedback === false &&
            isPlaceMode &&
            `Pas tout à fait — il fallait ${formatTime(target.h, target.m)}.`}
          {feedback === null && `Il est ${formatTime(readHours, readMinutes)}`}
        </div>
      )}
    </div>
  )
}
