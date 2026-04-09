import { useState, useRef, useEffect, useCallback } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

export default function NumberLine({ config = {}, onValidate }) {
  const { min = 0, max = 20, step = 1, showLabels = true, mode = 'libre' } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const ticks = []
  for (let v = min; v <= max; v += step) ticks.push(v)

  const [currentValue, setCurrentValue] = useState(min)
  const [isDragging, setIsDragging] = useState(false)
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // For mode 'placer', pick a random target
  const [target] = useState(() => {
    if (mode !== 'placer') return null
    const idx = Math.floor(Math.random() * ticks.length)
    return ticks[idx]
  })

  const svgRef = useRef(null)
  const containerRef = useRef(null)
  const [containerWidth, setContainerWidth] = useState(600)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    setContainerWidth(containerRef.current.offsetWidth)
    return () => observer.disconnect()
  }, [])

  const SVG_HEIGHT = 120
  const PADDING = 40
  const lineY = 70
  const tickHeight = 14
  const tokenR = 18

  const totalRange = max - min
  const usableWidth = containerWidth - PADDING * 2

  const valueToX = (v) => PADDING + ((v - min) / totalRange) * usableWidth
  const xToValue = (x) => {
    const raw = ((x - PADDING) / usableWidth) * totalRange + min
    // Snap to nearest tick
    const snapped = Math.round(raw / step) * step
    return Math.max(min, Math.min(max, snapped))
  }

  const getClientX = (e) => {
    if (e.touches && e.touches.length > 0) return e.touches[0].clientX
    if (e.changedTouches && e.changedTouches.length > 0) return e.changedTouches[0].clientX
    return e.clientX
  }

  const handlePointerDown = useCallback(
    (e) => {
      if (validated) return
      e.preventDefault()
      setIsDragging(true)
      const rect = svgRef.current.getBoundingClientRect()
      const x = getClientX(e) - rect.left
      const v = xToValue(x)
      setCurrentValue(v)
      if (ttsEnabled) speak(String(v))
    },
    [validated, xToValue, ttsEnabled, speak]
  )

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging || validated) return
      e.preventDefault()
      const rect = svgRef.current.getBoundingClientRect()
      const x = getClientX(e) - rect.left
      const v = xToValue(x)
      setCurrentValue(v)
    },
    [isDragging, validated, xToValue]
  )

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDragging) return
      setIsDragging(false)
      if (ttsEnabled) speak(String(currentValue))
    },
    [isDragging, currentValue, ttsEnabled, speak]
  )

  useEffect(() => {
    window.addEventListener('mousemove', handlePointerMove)
    window.addEventListener('mouseup', handlePointerUp)
    window.addEventListener('touchmove', handlePointerMove, { passive: false })
    window.addEventListener('touchend', handlePointerUp)
    return () => {
      window.removeEventListener('mousemove', handlePointerMove)
      window.removeEventListener('mouseup', handlePointerUp)
      window.removeEventListener('touchmove', handlePointerMove)
      window.removeEventListener('touchend', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const handleValidate = () => {
    const isCorrect = mode === 'placer' ? currentValue === target : true
    setValidated(true)
    setFeedback(isCorrect)
    if (onValidate) onValidate({ value: currentValue, target, correct: isCorrect })
    if (ttsEnabled) {
      speak(isCorrect ? 'Bravo, c\'est correct !' : `Pas tout à fait. La réponse était ${target}.`)
    }
  }

  const handleReset = () => {
    setCurrentValue(min)
    setValidated(false)
    setFeedback(null)
  }

  const tokenX = valueToX(currentValue)

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  // Determine label density — show every N-th to avoid overlap
  const minLabelSpacing = 30
  const totalTicks = ticks.length
  const spacing = usableWidth / (totalTicks - 1 || 1)
  const labelEvery = Math.ceil(minLabelSpacing / (spacing || 1))

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {mode === 'placer' && target !== null && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <span className="font-bold text-blue-700 text-2xl">Place le nombre : {target}</span>
          {ttsEnabled && (
            <button
              onClick={() => speak(`Place le nombre ${target}`)}
              className="ml-3 text-blue-500 hover:text-blue-700"
              title="Lire à voix haute"
            >
              🔊
            </button>
          )}
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg
          ref={svgRef}
          width={containerWidth}
          height={SVG_HEIGHT}
          className={`cursor-pointer ${validated ? 'cursor-default' : ''}`}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          aria-label={`Droite numérique de ${min} à ${max}`}
          role="slider"
          aria-valuenow={currentValue}
          aria-valuemin={min}
          aria-valuemax={max}
        >
          {/* Main line */}
          <line
            x1={PADDING}
            y1={lineY}
            x2={containerWidth - PADDING}
            y2={lineY}
            stroke="#6B7280"
            strokeWidth={3}
            strokeLinecap="round"
          />

          {/* Arrow right */}
          <polygon
            points={`${containerWidth - PADDING + 2},${lineY} ${containerWidth - PADDING - 8},${lineY - 6} ${containerWidth - PADDING - 8},${lineY + 6}`}
            fill="#6B7280"
          />

          {/* Ticks + labels */}
          {ticks.map((v, i) => {
            const x = valueToX(v)
            const isMajor = true
            const showLabel = showLabels && i % labelEvery === 0
            return (
              <g key={v}>
                <line
                  x1={x}
                  y1={lineY - tickHeight / 2}
                  x2={x}
                  y2={lineY + tickHeight / 2}
                  stroke="#6B7280"
                  strokeWidth={isMajor ? 2 : 1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={lineY + tickHeight / 2 + 16}
                    textAnchor="middle"
                    fontSize={largeText ? 14 : 11}
                    fill="#374151"
                    fontFamily={dyslexicFont ? 'OpenDyslexic, sans-serif' : 'inherit'}
                  >
                    {v}
                  </text>
                )}
              </g>
            )
          })}

          {/* Target marker (mode placer) */}
          {mode === 'placer' && target !== null && (
            <g>
              <line
                x1={valueToX(target)}
                y1={lineY - 24}
                x2={valueToX(target)}
                y2={lineY + 8}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="4,3"
              />
              <text
                x={valueToX(target)}
                y={lineY - 28}
                textAnchor="middle"
                fontSize={12}
                fill="#EF4444"
                fontWeight="bold"
              >
                ici ?
              </text>
            </g>
          )}

          {/* Token */}
          <g>
            <circle
              cx={tokenX}
              cy={lineY}
              r={tokenR}
              fill={validated ? (feedback ? '#22C55E' : '#EF4444') : '#3B82F6'}
              stroke="white"
              strokeWidth={3}
              style={{ filter: isDragging ? 'drop-shadow(0 4px 8px rgba(59,130,246,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <text
              x={tokenX}
              y={lineY + 5}
              textAnchor="middle"
              fontSize={largeText ? 16 : 13}
              fill="white"
              fontWeight="bold"
              fontFamily={dyslexicFont ? 'OpenDyslexic, sans-serif' : 'inherit'}
              style={{ pointerEvents: 'none' }}
            >
              {currentValue}
            </text>
          </g>
        </svg>
      </div>

      {/* Current value display */}
      <div className="mt-2 text-center">
        <span className="text-4xl font-bold text-blue-600">{currentValue}</span>
        {ttsEnabled && (
          <button
            onClick={() => speak(String(currentValue))}
            className="ml-3 text-blue-400 hover:text-blue-600 text-xl"
            title="Lire à voix haute"
          >
            🔊
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      {!focusMode && (
        <p className="text-center text-xs text-gray-400 mt-1">
          Glisse le jeton sur la droite numérique
        </p>
      )}

      {/* Feedback */}
      {validated && feedback !== null && (
        <div
          className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            feedback ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'
          }`}
        >
          {feedback ? `✅ Bravo ! ${currentValue} est correct !` : `❌ Pas tout à fait. La réponse était ${target}.`}
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {mode === 'placer' && !validated && (
          <button
            onClick={handleValidate}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-lg transition-colors min-h-[44px]"
          >
            Valider ma réponse
          </button>
        )}
        <button
          onClick={handleReset}
          className="px-4 py-3 text-gray-500 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-xl hover:bg-red-50 transition-colors min-h-[44px]"
        >
          Réinitialiser
        </button>
      </div>
    </div>
  )
}
