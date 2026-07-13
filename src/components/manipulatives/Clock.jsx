import { useState, useRef, useCallback, useEffect } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = CENTER - 20

function pad2(n) {
  return String(n).padStart(2, '0')
}

function randomTime(granularity) {
  const h = Math.floor(Math.random() * 12) + 1
  const stepsPerHour = 60 / granularity
  const m = Math.floor(Math.random() * stepsPerHour) * granularity
  return { h, m }
}

function formatTime(h, m) {
  return `${h}h${pad2(m)}`
}

function minuteAngle(m) {
  return (m / 60) * 360
}

function hourAngle(h, m) {
  return ((h % 12) / 12) * 360 + (m / 60) * 30
}

function angleFromPoint(cx, cy, x, y) {
  const dx = x - cx
  const dy = y - cy
  let deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

function snapAngle(angle, stepDeg) {
  return Math.round(angle / stepDeg) * stepDeg % 360
}

function handEnd(angle, length) {
  return {
    x: CENTER + length * Math.sin((angle * Math.PI) / 180),
    y: CENTER - length * Math.cos((angle * Math.PI) / 180),
  }
}

export default function Clock({ config = {}, onValidate }) {
  const { mode = 'libre', granularity = 30, targetTime } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const isReadMode = mode === 'lire'
  const isPlaceMode = mode === 'placer'
  const target = isPlaceMode ? (targetTime || { h: 3, m: 0 }) : null

  const [fixedTime] = useState(() => (isReadMode ? (targetTime || randomTime(granularity)) : null))
  const [hours, setHours] = useState(isReadMode ? fixedTime?.h ?? 12 : 12)
  const [minutes, setMinutes] = useState(isReadMode ? fixedTime?.m ?? 0 : 0)
  const [dragging, setDragging] = useState(null) // 'hour' | 'minute' | null
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [readH, setReadH] = useState('')
  const [readM, setReadM] = useState('')

  const svgRef = useRef(null)

  const getPoint = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const handleDown = (which) => (e) => {
    if (validated || isReadMode) return
    e.preventDefault()
    setDragging(which)
  }

  const handleMove = useCallback(
    (e) => {
      if (!dragging || validated) return
      e.preventDefault()
      const { x, y } = getPoint(e)
      const angle = angleFromPoint(CENTER, CENTER, x, y)
      if (dragging === 'minute') {
        const stepDeg = (granularity / 60) * 360
        const snapped = snapAngle(angle, stepDeg)
        setMinutes(Math.round((snapped / 360) * 60) % 60)
      } else {
        const snapped = snapAngle(angle, 30)
        setHours(Math.round(snapped / 30) % 12 || 12)
      }
    },
    [dragging, validated, granularity]
  )

  const handleUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
  }, [handleMove, handleUp])

  const handleValidate = () => {
    setValidated(true)
    let correct = null
    let result

    if (isPlaceMode) {
      correct = hours === target.h && minutes === target.m
      result = { hours, minutes, target, correct }
    } else if (isReadMode) {
      const h = parseInt(readH, 10)
      const m = parseInt(readM, 10)
      correct = h === fixedTime.h && m === fixedTime.m
      result = { readH: h, readM: m, actual: fixedTime, correct }
    } else {
      result = { hours, minutes, correct: null }
    }

    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Il est ${formatTime(hours, minutes)}`
          : correct
          ? 'Bravo, c\'est correct !'
          : 'Pas tout à fait.'
      )
    }
    setFeedback(correct)
  }

  const displayH = isReadMode ? fixedTime.h : hours
  const displayM = isReadMode ? fixedTime.m : minutes
  const hAngle = hourAngle(displayH, displayM)
  const mAngle = minuteAngle(displayM)
  const hourEnd = handEnd(hAngle, RADIUS * 0.5)
  const minuteEnd = handEnd(mAngle, RADIUS * 0.8)

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
        <svg ref={svgRef} width={SIZE} height={SIZE} aria-label="Cadran d'horloge">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#F7FAFC" stroke="#4A5568" strokeWidth={4} />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * 360
            const p1 = handEnd(a, RADIUS - 8)
            const p2 = handEnd(a, RADIUS - 18)
            return (
              <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4A5568" strokeWidth={i % 3 === 0 ? 3 : 1.5} />
            )
          })}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * 360
            const p = handEnd(a, RADIUS - 30)
            return (
              <text key={i} x={p.x} y={p.y + 5} textAnchor="middle" fontSize={largeText ? 16 : 14} fontWeight="bold" fill="#2D3748">
                {i === 0 ? 12 : i}
              </text>
            )
          })}
          <line x1={CENTER} y1={CENTER} x2={hourEnd.x} y2={hourEnd.y} stroke="#1A202C" strokeWidth={6} strokeLinecap="round" />
          <line x1={CENTER} y1={CENTER} x2={minuteEnd.x} y2={minuteEnd.y} stroke="#3182CE" strokeWidth={4} strokeLinecap="round" />
          <circle cx={CENTER} cy={CENTER} r={6} fill="#1A202C" />
          {!isReadMode && !validated && (
            <>
              <circle
                cx={hourEnd.x}
                cy={hourEnd.y}
                r={14}
                fill="rgba(26,32,44,0.15)"
                onMouseDown={handleDown('hour')}
                onTouchStart={handleDown('hour')}
                style={{ cursor: 'grab' }}
                role="slider"
                aria-label="Aiguille des heures"
                aria-valuenow={hours}
                aria-valuemin={1}
                aria-valuemax={12}
              />
              <circle
                cx={minuteEnd.x}
                cy={minuteEnd.y}
                r={14}
                fill="rgba(49,130,206,0.15)"
                onMouseDown={handleDown('minute')}
                onTouchStart={handleDown('minute')}
                style={{ cursor: 'grab' }}
                role="slider"
                aria-label="Aiguille des minutes"
                aria-valuenow={minutes}
                aria-valuemin={0}
                aria-valuemax={59}
              />
            </>
          )}
        </svg>
      </div>

      {!isReadMode && (
        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-gray-800">{formatTime(hours, minutes)}</span>
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
          {isReadMode ? 'Saisis les heures et les minutes lues sur le cadran' : "Glisse les aiguilles pour régler l'heure"}
        </p>
      )}

      {!validated && (
        <button
          onClick={handleValidate}
          disabled={isReadMode && (readH === '' || readM === '')}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}

      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            feedback === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : feedback === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {feedback === true && '✓ Correct !'}
          {feedback === false && isPlaceMode && `Tu as placé ${formatTime(hours, minutes)} — Cible : ${formatTime(target.h, target.m)}`}
          {feedback === false &&
            isReadMode &&
            `Tu as écrit ${readH || '?'}h${pad2(parseInt(readM, 10) || 0)} — L'heure affichée était ${formatTime(fixedTime.h, fixedTime.m)}`}
          {feedback === null && `Il est ${formatTime(hours, minutes)}`}
        </div>
      )}
    </div>
  )
}
