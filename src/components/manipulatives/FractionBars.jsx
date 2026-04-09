import { useState, useMemo } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b)
}

function simplify(num, den) {
  if (num === 0) return { num: 0, den }
  const g = gcd(num, den)
  return { num: num / g, den: den / g }
}

function FractionBar({ denominator, colored, onToggle, label, isReference, disabled }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      {/* Label */}
      <div className="w-12 text-right font-bold text-gray-600 text-sm shrink-0">{label}</div>

      {/* Bar */}
      <div className="flex-1 flex h-10 rounded overflow-hidden border border-gray-300 cursor-pointer">
        {Array.from({ length: denominator }).map((_, i) => (
          <div
            key={i}
            onClick={() => !disabled && !isReference && onToggle(i)}
            className={`flex-1 transition-colors border-r border-white last:border-r-0 ${
              isReference || colored[i]
                ? 'bg-blue-500'
                : 'bg-gray-100 hover:bg-blue-100'
            } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
            title={isReference ? `Référence 1/${denominator}` : `Partie ${i + 1}/${denominator}`}
          />
        ))}
      </div>

      {/* Fraction display */}
      <div className="w-20 text-sm text-gray-600 shrink-0">
        {isReference ? (
          <span className="font-bold text-blue-600">1/1</span>
        ) : (
          <>
            <span className="font-bold text-blue-600">
              {colored.filter(Boolean).length}/{denominator}
            </span>
            {colored.filter(Boolean).length > 0 && (
              <span className="text-gray-400 text-xs ml-1">
                ({(colored.filter(Boolean).length / denominator).toFixed(2)})
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function FractionBars({ config = {}, onValidate }) {
  const { denominators = [2, 3, 4, 6, 8, 12], mode = 'libre' } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  // colored[den] = array of booleans for each part
  const [colored, setColored] = useState(() => {
    const init = {}
    denominators.forEach((d) => {
      init[d] = Array(d).fill(false)
    })
    return init
  })

  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null)

  // For mode 'comparer'
  const [selection, setSelection] = useState([])

  const togglePart = (den, partIndex) => {
    setColored((prev) => {
      const arr = [...prev[den]]
      arr[partIndex] = !arr[partIndex]
      return { ...prev, [den]: arr }
    })
  }

  // Equivalence detection
  const equivalences = useMemo(() => {
    const result = {}
    denominators.forEach((d) => {
      const count = colored[d].filter(Boolean).length
      if (count === 0) { result[d] = false; return }
      const { num: sn, den: sd } = simplify(count, d)
      // Check if any other bar has equivalent fraction
      const equiv = denominators.some((d2) => {
        if (d2 === d) return false
        const count2 = colored[d2].filter(Boolean).length
        if (count2 === 0) return false
        const { num: sn2, den: sd2 } = simplify(count2, d2)
        return sn === sn2 && sd === sd2
      })
      result[d] = equiv
    })
    return result
  }, [colored, denominators])

  const handleValidate = () => {
    if (mode === 'comparer' && selection.length === 2) {
      const [d1, d2] = selection
      const v1 = colored[d1].filter(Boolean).length / d1
      const v2 = colored[d2].filter(Boolean).length / d2
      let msg
      if (v1 > v2) msg = `${colored[d1].filter(Boolean).length}/${d1} > ${colored[d2].filter(Boolean).length}/${d2}`
      else if (v1 < v2) msg = `${colored[d1].filter(Boolean).length}/${d1} < ${colored[d2].filter(Boolean).length}/${d2}`
      else msg = `${colored[d1].filter(Boolean).length}/${d1} = ${colored[d2].filter(Boolean).length}/${d2}`
      setFeedback(msg)
      setValidated(true)
      if (ttsEnabled) speak(msg)
      if (onValidate) onValidate({ selection, colored, comparison: msg })
    } else {
      setValidated(true)
      if (onValidate) onValidate({ colored })
    }
  }

  const handleReset = () => {
    setColored(() => {
      const init = {}
      denominators.forEach((d) => { init[d] = Array(d).fill(false) })
      return init
    })
    setValidated(false)
    setFeedback(null)
    setSelection([])
  }

  const toggleSelection = (den) => {
    setSelection((prev) => {
      if (prev.includes(den)) return prev.filter((d) => d !== den)
      if (prev.length >= 2) return [prev[1], den]
      return [...prev, den]
    })
  }

  const fontClass = dyslexicFont ? 'font-dyslexic' : ''
  const textClass = largeText ? 'text-xl' : 'text-base'

  return (
    <div className={`${fontClass} ${textClass} select-none`}>
      {mode === 'comparer' && !focusMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Mode comparaison :</strong> Colorie des parties sur deux barres, sélectionne-les (clic sur le label), puis compare.
        </div>
      )}

      {/* Reference bar 1/1 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 text-right font-bold text-gray-600 text-sm shrink-0">Référence</div>
        <div className="flex-1 h-10 rounded overflow-hidden border border-blue-300 bg-blue-500" />
        <div className="w-20 text-sm font-bold text-blue-600 shrink-0">1/1 = 1.00</div>
      </div>

      <div className="border-b border-gray-200 mb-3" />

      {denominators.map((den) => {
        const count = colored[den].filter(Boolean).length
        const isSelected = selection.includes(den)

        return (
          <div key={den} className={`relative ${isSelected && mode === 'comparer' ? 'ring-2 ring-blue-400 rounded-lg px-1' : ''}`}>
            {equivalences[den] && count > 0 && (
              <span className="absolute right-0 -top-1 text-green-500 text-sm" title="Fraction équivalente trouvée !">
                ✓ équiv.
              </span>
            )}
            <div className="flex items-center gap-3 mb-2">
              {/* Label / selector */}
              <button
                onClick={() => mode === 'comparer' && toggleSelection(den)}
                className={`w-12 text-right font-bold text-sm shrink-0 rounded px-1 py-0.5 min-h-[44px] ${
                  mode === 'comparer'
                    ? isSelected
                      ? 'bg-blue-200 text-blue-800 cursor-pointer'
                      : 'text-gray-600 hover:bg-gray-100 cursor-pointer'
                    : 'text-gray-600'
                }`}
                disabled={mode !== 'comparer'}
              >
                1/{den}
              </button>

              {/* Bar */}
              <div className="flex-1 flex h-10 rounded overflow-hidden border border-gray-300">
                {Array.from({ length: den }).map((_, i) => (
                  <div
                    key={i}
                    onClick={() => !validated && togglePart(den, i)}
                    className={`flex-1 transition-colors border-r border-white last:border-r-0 ${
                      colored[den][i]
                        ? 'bg-blue-500 hover:bg-blue-400'
                        : 'bg-gray-100 hover:bg-blue-100'
                    } ${validated ? 'cursor-default' : 'cursor-pointer'}`}
                    title={`Partie ${i + 1}/${den}`}
                  />
                ))}
              </div>

              {/* Fraction display */}
              <div className="w-20 text-sm text-gray-600 shrink-0">
                <span className="font-bold text-blue-600">
                  {count}/{den}
                </span>
                {count > 0 && (
                  <span className="text-gray-400 text-xs ml-1">
                    ({(count / den).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* Feedback */}
      {validated && feedback && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center font-bold text-lg text-blue-700">
          📊 {feedback}
        </div>
      )}

      {/* Equivalence legend */}
      {!focusMode && Object.values(equivalences).some(Boolean) && (
        <div className="mt-3 text-sm text-green-600 flex items-center gap-2">
          <span>✓</span>
          <span>Des fractions équivalentes ont été identifiées !</span>
        </div>
      )}

      <div className="mt-4 flex gap-3">
        {mode === 'comparer' && !validated && selection.length === 2 && (
          <button
            onClick={handleValidate}
            className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-lg transition-colors min-h-[44px]"
          >
            Comparer
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
