import { useState } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'
import { hourBounds } from '../../lib/seriesGenerators.js'
import {
  activityLabel,
  addMinutes,
  buildOptions,
  formatDuration,
  formatTime,
  generateSchedule,
  generateTimeProblem,
  kindFromGranularity,
  momentOfDay,
  scheduleEnds,
} from '../../lib/clockProblems.js'
import Clock from './Clock.jsx'
import ClockFace from './ClockFace.jsx'

// Énoncé { startTime, duration } : repris de la config (exercice fixé ou item
// de série) ou tiré au hasard à l'ouverture (exercice « laissé au hasard »).
function useTimeProblem(config) {
  const [problem] = useState(() => {
    if (config.startTime && config.duration > 0) {
      return { startTime: config.startTime, duration: config.duration }
    }
    return generateTimeProblem({
      kind: config.kind || kindFromGranularity(config.granularity),
      level: config.durationLevel,
      bounds: hourBounds(config.period),
      fixedDuration: config.fixedDuration,
    })
  })
  return problem
}

function MomentBadge({ h }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-800 font-bold text-sm">
      {momentOfDay(h)}
    </span>
  )
}

function Feedback({ ok, children }) {
  return (
    <div
      className={`p-3 rounded-xl text-center font-bold text-sm ${
        ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
      }`}
      role="status"
    >
      {children}
    </div>
  )
}

const validateBtn =
  'w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]'
const numInput = 'w-20 text-center text-xl font-bold border-2 border-gray-300 rounded-lg py-2'

/** Heure d'arrivée (début + durée → fin) ou heure de départ (fin + durée →
 *  début) : l'élève place les aiguilles, la validation est celle de « Placer ». */
function PlaceProblem({ config, onValidate, reverse }) {
  const { startTime, duration } = useTimeProblem(config)
  const label = activityLabel(duration)
  const answer = reverse ? startTime : addMinutes(startTime, duration)
  // Départ : on donne l'heure de fin (= début + durée) et on cherche le début.
  const given = reverse ? addMinutes(startTime, duration) : startTime
  const verb = reverse ? 'se termine' : 'commence'
  const ask = reverse ? "l'heure de début" : "l'heure de fin"
  const promptText = `${label} ${verb} à ${formatTime(given.h, given.m)} et dure ${formatDuration(duration)}. Place les aiguilles sur ${ask}.`
  return (
    <Clock
      config={{ ...config, mode: 'placer', targetTime: answer, promptText }}
      onValidate={(r) => onValidate?.({ ...r, problem: { startTime, duration } })}
    />
  )
}

/** Durée écoulée : deux cadrans fixes (début, fin), l'élève écrit la durée. */
function ElapsedProblem({ config, onValidate }) {
  const { startTime, duration } = useTimeProblem(config)
  const { dyslexicFont, largeText, ttsEnabled, speak } = useAccessibility()
  const end = addMinutes(startTime, duration)
  const [h, setH] = useState('')
  const [m, setM] = useState('')
  const [validated, setValidated] = useState(false)
  const [ok, setOk] = useState(null)
  const answer = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0)

  const validate = () => {
    const correct = answer === duration
    setValidated(true)
    setOk(correct)
    onValidate?.({ correct, answer, duration, startTime, endTime: end, revealMs: 0 })
    if (ttsEnabled) speak(correct ? "Bravo, c'est correct !" : `Pas tout à fait. La durée était ${formatDuration(duration)}.`)
  }

  return (
    <div className={`${dyslexicFont ? 'font-dyslexic' : ''} ${largeText ? 'text-xl' : 'text-base'} select-none`}>
      <p className="text-center text-gray-600 mb-3">Combien de temps s'est écoulé entre le début et la fin ?</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['Début', startTime], ['Fin', end]].map(([title, t]) => (
          <div key={title} className="text-center">
            <p className="font-bold text-gray-700 mb-1">{title}</p>
            <ClockFace h={t.h} m={t.m} width="100%" label={`Cadran de ${title.toLowerCase()}`} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <input type="number" min={0} max={5} value={h} onChange={(e) => setH(e.target.value)} disabled={validated} placeholder="0" aria-label="Heures de durée" className={numInput} />
        <span className="font-bold">h</span>
        <input type="number" min={0} max={59} value={m} onChange={(e) => setM(e.target.value)} disabled={validated} placeholder="0" aria-label="Minutes de durée" className={numInput} />
        <span className="font-bold">min</span>
      </div>
      {!validated && (
        <button onClick={validate} disabled={h === '' && m === ''} className={validateBtn}>Valider</button>
      )}
      {validated && (
        <Feedback ok={ok}>
          {ok
            ? `✓ Correct ! De ${formatTime(startTime.h, startTime.m)} à ${formatTime(end.h, end.m)}, il s'écoule ${formatDuration(duration)}.`
            : `Pas tout à fait : de ${formatTime(startTime.h, startTime.m)} à ${formatTime(end.h, end.m)}, il s'écoule ${formatDuration(duration)}.`}
        </Feedback>
      )}
    </div>
  )
}

/** Horaire d'une journée : l'élève donne l'heure de fin de chaque activité. */
function ScheduleProblem({ config, onValidate }) {
  const { dyslexicFont, largeText, ttsEnabled, speak } = useAccessibility()
  const [schedule] = useState(() =>
    config.startTime && Array.isArray(config.activities) && config.activities.length > 0
      ? { startTime: config.startTime, activities: config.activities }
      : generateSchedule({ kind: config.kind || kindFromGranularity(config.granularity) })
  )
  const ends = scheduleEnds(schedule.startTime, schedule.activities)
  const [answers, setAnswers] = useState(() => schedule.activities.map(() => ({ h: '', m: '' })))
  const [validated, setValidated] = useState(false)

  const setAnswer = (i, key, value) =>
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? { ...a, [key]: value } : a)))
  const rowOk = (i) => parseInt(answers[i].h, 10) === ends[i].h && parseInt(answers[i].m, 10) === ends[i].m
  const complete = answers.every((a) => a.h !== '' && a.m !== '')

  const validate = () => {
    const rows = schedule.activities.map((_, i) => rowOk(i))
    const correct = rows.every(Boolean)
    setValidated(true)
    onValidate?.({ correct, rows, startTime: schedule.startTime, activities: schedule.activities, revealMs: 0 })
    if (ttsEnabled) speak(correct ? 'Bravo, tout est correct !' : 'Regarde les lignes à corriger.')
  }

  return (
    <div className={`${dyslexicFont ? 'font-dyslexic' : ''} ${largeText ? 'text-xl' : 'text-base'}`}>
      <p className="text-center text-gray-600 mb-3">
        La journée commence à <strong>{formatTime(schedule.startTime.h, schedule.startTime.m)}</strong>. Les activités
        s'enchaînent sans pause entre elles. Écris l'heure de fin de chaque activité.
      </p>
      <div className="space-y-2 mb-4">
        {schedule.activities.map((a, i) => (
          <div
            key={i}
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2 ${
              validated ? (rowOk(i) ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300') : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex-1 min-w-[160px]">
              <p className="font-bold text-gray-800">{a.label}</p>
              <p className="text-sm text-gray-500">Dure {formatDuration(a.duration)}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500 mr-1">se termine à</span>
              <input type="number" min={0} max={23} value={answers[i].h} onChange={(e) => setAnswer(i, 'h', e.target.value)} disabled={validated} aria-label={`Heure de fin de ${a.label}`} placeholder="H" className={numInput} />
              <span className="font-bold">h</span>
              <input type="number" min={0} max={59} value={answers[i].m} onChange={(e) => setAnswer(i, 'm', e.target.value)} disabled={validated} aria-label={`Minutes de fin de ${a.label}`} placeholder="min" className={numInput} />
            </div>
            {validated && !rowOk(i) && (
              <p className="w-full text-sm font-bold text-orange-700">Il fallait {formatTime(ends[i].h, ends[i].m)}.</p>
            )}
          </div>
        ))}
      </div>
      {!validated && <button onClick={validate} disabled={!complete} className={validateBtn}>Valider</button>}
      {validated && (
        <Feedback ok={schedule.activities.every((_, i) => rowOk(i))}>
          {schedule.activities.every((_, i) => rowOk(i))
            ? '✓ Bravo, tout l\'horaire est juste.'
            : `${schedule.activities.filter((_, i) => rowOk(i)).length} / ${schedule.activities.length} justes — corrige-toi avec la réponse affichée.`}
        </Feedback>
      )}
    </div>
  )
}

/** Correspondance : cadran → écriture 24 h (a2d) ou écriture → cadran (d2a). */
function MatchProblem({ config, onValidate }) {
  const { dyslexicFont, largeText, ttsEnabled, speak } = useAccessibility()
  const sens = config.sens === 'd2a' ? 'd2a' : 'a2d'
  const bounds = hourBounds(config.period)
  const [target] = useState(() => {
    if (config.targetTime) return config.targetTime
    const kind = config.kind || kindFromGranularity(config.granularity)
    return generateTimeProblem({ kind, bounds, level: 'une-heure' }).startTime
  })
  const [options] = useState(() => buildOptions(target, { sens, bounds }))
  const [chosen, setChosen] = useState(null)
  const [validated, setValidated] = useState(false)
  const isRight = (t) => t.h === target.h && t.m === target.m

  const validate = () => {
    const correct = isRight(options[chosen])
    setValidated(true)
    onValidate?.({ correct, chosen: options[chosen], target, sens, revealMs: 0 })
    if (ttsEnabled) speak(correct ? "Bravo, c'est correct !" : `Pas tout à fait. C'était ${formatTime(target.h, target.m)}.`)
  }

  const optionState = (i) => {
    if (!validated) return chosen === i ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-300'
    if (isRight(options[i])) return 'border-green-500 bg-green-50'
    return chosen === i ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-white opacity-60'
  }

  return (
    <div className={`${dyslexicFont ? 'font-dyslexic' : ''} ${largeText ? 'text-xl' : 'text-base'} select-none`}>
      {config.period && (
        <div className="text-center mb-3"><MomentBadge h={target.h} /></div>
      )}
      {sens === 'a2d' ? (
        <>
          <p className="text-center text-gray-600 mb-2">Quelle écriture correspond à ce cadran ?</p>
          <div className="flex justify-center mb-4"><ClockFace h={target.h} m={target.m} width="min(100%, 300px)" /></div>
        </>
      ) : (
        <p className="text-center mb-4">
          Quel cadran montre <span className="font-bold text-2xl text-blue-700">{formatTime(target.h, target.m)}</span> ?
        </p>
      )}
      <div className={`grid grid-cols-2 gap-3 mb-4`} role="radiogroup" aria-label="Propositions">
        {options.map((t, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={chosen === i}
            disabled={validated}
            onClick={() => setChosen(i)}
            className={`rounded-xl border-2 p-2 min-h-[44px] transition-colors ${optionState(i)}`}
          >
            {sens === 'a2d' ? (
              <span className="text-2xl font-bold text-gray-800">{formatTime(t.h, t.m)}</span>
            ) : (
              <ClockFace h={t.h} m={t.m} width="100%" label={`Cadran proposition ${i + 1}`} />
            )}
          </button>
        ))}
      </div>
      {!validated && <button onClick={validate} disabled={chosen === null} className={validateBtn}>Valider</button>}
      {validated && (
        <Feedback ok={isRight(options[chosen])}>
          {isRight(options[chosen])
            ? `✓ Correct ! C'était ${formatTime(target.h, target.m)}.`
            : `Pas tout à fait : la bonne réponse est ${formatTime(target.h, target.m)}.`}
        </Feedback>
      )}
    </div>
  )
}

export default function ClockProblems({ config = {}, onValidate }) {
  if (config.mode === 'arrivee') return <PlaceProblem config={config} onValidate={onValidate} />
  if (config.mode === 'depart') return <PlaceProblem config={config} onValidate={onValidate} reverse />
  if (config.mode === 'duree') return <ElapsedProblem config={config} onValidate={onValidate} />
  if (config.mode === 'horaire') return <ScheduleProblem config={config} onValidate={onValidate} />
  if (config.mode === 'correspondance') return <MatchProblem config={config} onValidate={onValidate} />
  return null
}
