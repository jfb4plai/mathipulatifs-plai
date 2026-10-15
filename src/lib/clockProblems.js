// Logique pure des exercices d'horloge « problèmes de temps » : heure d'arrivée,
// heure de départ, durée écoulée, horaire d'une journée, correspondance
// analogique / digital. Aucune dépendance à React : testable en Node.
//
// Référentiel FWB (maths, Grandeurs) :
//  - P4 : durée / instant d'arrivée ou de départ « au cours d'une même heure » ;
//  - P5 : durée ne dépassant pas une heure ;
//  - P6 : durée pouvant dépasser une heure, horaire d'une journée.

export const PROBLEM_MODES = ['arrivee', 'depart', 'duree', 'horaire', 'correspondance']

export const DURATION_LEVELS = {
  'meme-heure': { label: "Dans la même heure (P4)", max: 55 },
  'une-heure': { label: "Jusqu'à 1 heure (P5)", max: 60 },
  'plus-heure': { label: "Peut dépasser 1 heure (P6)", max: 180 },
}

const DAY = 1440
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[randInt(0, arr.length - 1)]
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pad2 = (n) => String(n).padStart(2, '0')
export const formatTime = (h, m) => `${h}h${pad2(m)}`

export function toMinutes(t) {
  return t.h * 60 + t.m
}

export function fromMinutes(total) {
  const t = ((total % DAY) + DAY) % DAY
  return { h: Math.floor(t / 60), m: t % 60 }
}

export const addMinutes = (t, d) => fromMinutes(toMinutes(t) + d)
export const subMinutes = (t, d) => fromMinutes(toMinutes(t) - d)

export function formatDuration(d) {
  const h = Math.floor(d / 60)
  const m = d % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${pad2(m)} min`
}

/** Moment de la journée : lève l'ambiguïté d'un cadran (le même cadran vaut 3h et 15h). */
export function momentOfDay(h) {
  if (h < 6) return 'Nuit'
  if (h < 12) return 'Matin'
  if (h < 18) return 'Après-midi'
  return 'Soir'
}

/** Plage d'heures (24 h) du moment de la journée contenant h. */
export function momentRange(h) {
  if (h < 6) return { from: 0, to: 5 }
  if (h < 12) return { from: 6, to: 11 }
  if (h < 18) return { from: 12, to: 17 }
  return { from: 18, to: 23 }
}

/** Ancien réglage « granularité » → kind de la progression horloge. */
export function kindFromGranularity(g) {
  const n = Number(g)
  if (n <= 1) return 'minute'
  if (n >= 60) return 'heure-pleine'
  if (n >= 30) return 'demie'
  if (n >= 15) return 'quart'
  return 'cinq-min'
}

const START_MINUTES = {
  'heure-pleine': [0],
  demie: [0, 30],
  quart: [0, 15, 30, 45],
  'cinq-min': [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
  minute: Array.from({ length: 60 }, (_, i) => i),
}
const DURATION_STEP = { 'heure-pleine': 30, demie: 30, quart: 15, 'cinq-min': 5, minute: 1 }

/** Tire un énoncé { startTime, duration } respectant la progression (kind), la
 *  borne de durée du niveau, la période d'heures et une durée fixe éventuelle
 *  (ex. 50 min pour une période de cours). */
export function generateTimeProblem({ kind = 'cinq-min', level = 'une-heure', bounds = { min: 1, max: 12 }, fixedDuration } = {}) {
  const step = DURATION_STEP[kind] || 5
  const maxD = (DURATION_LEVELS[level] || DURATION_LEVELS['une-heure']).max
  let duration
  if (fixedDuration > 0) {
    duration = fixedDuration
  } else {
    const choices = []
    for (let d = step; d <= maxD; d += step) choices.push(d)
    duration = pick(choices)
  }
  let minutes = START_MINUTES[kind] || START_MINUTES['cinq-min']
  if (level === 'meme-heure') {
    const fit = minutes.filter((m) => m + duration <= 60)
    minutes = fit.length ? fit : [0]
  }
  return { startTime: { h: randInt(bounds.min, bounds.max), m: pick(minutes) }, duration }
}

/** Libellé du sujet de l'énoncé, selon la durée (50 min = période de cours). */
export function activityLabel(duration) {
  if (duration === 50) return 'Le cours'
  if (duration === 15) return 'La récréation'
  return "L'activité"
}

/** Deux écritures d'une même position de cadran : 3h00 et 15h00 partagent le même cadran. */
const dialKey = (t) => `${t.h % 12}:${t.m}`

// Ramène une heure sur la même position de cadran, dans les bornes de la période.
function fitHour(h, bounds) {
  if (h >= bounds.min && h <= bounds.max) return h
  const dial = h % 12
  if (bounds.min >= 12) return dial + 12
  return dial === 0 && bounds.min >= 1 ? 12 : dial
}

/** Quatre propositions (la bonne + 3 pièges plausibles) pour la correspondance.
 *  `sens` 'a2d' : cadran → écriture ; les pièges peuvent partager le cadran
 *  (confusion matin/après-midi). 'd2a' : écriture → cadran ; les pièges doivent
 *  avoir un cadran différent. */
export function buildOptions(target, { sens = 'a2d', bounds = { min: 1, max: 12 } } = {}) {
  const inBounds = (t) => t.h >= bounds.min && t.h <= bounds.max
  const pool = []
  const push = (t) => {
    if (t.h < 0 || t.h > 23 || t.m < 0 || t.m > 59) return
    if (!inBounds(t)) return
    pool.push(t)
  }
  // Inversion heures/minutes (confusion classique des deux aiguilles)
  if (target.m % 5 === 0) push({ h: fitHour((target.m / 5) || 12, bounds), m: (target.h % 12) * 5 })
  push({ h: target.h + 1, m: target.m })
  push({ h: target.h - 1, m: target.m })
  push({ h: target.h, m: (target.m + 30) % 60 })
  push({ h: target.h, m: (target.m + 15) % 60 })
  push({ h: target.h, m: (target.m + 45) % 60 })
  push({ h: target.h, m: (target.m + 5) % 60 })
  push({ h: target.h, m: (target.m + 1) % 60 })
  push({ h: target.h, m: (target.m + 59) % 60 })
  if (sens === 'a2d') {
    push({ h: (target.h + 12) % 24, m: target.m })
  }
  // Complément aléatoire si le tri laisse moins de 3 pièges
  for (let i = 0; i < 40; i++) {
    push({ h: randInt(bounds.min, bounds.max), m: pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]) })
  }
  const seen = new Set([`${target.h}:${target.m}`])
  const seenDial = new Set([dialKey(target)])
  const distractors = []
  for (const t of shuffle(pool)) {
    const key = `${t.h}:${t.m}`
    if (seen.has(key)) continue
    if (sens === 'd2a' && seenDial.has(dialKey(t))) continue
    seen.add(key)
    seenDial.add(dialKey(t))
    distractors.push(t)
    if (distractors.length === 3) break
  }
  return shuffle([target, ...distractors])
}

const ACTIVITIES = [
  { label: 'Accueil', durations: [15, 20] },
  { label: 'Cours de français', durations: [50] },
  { label: 'Cours de mathématiques', durations: [50] },
  { label: 'Récréation', durations: [15, 20] },
  { label: 'Éveil', durations: [50] },
  { label: 'Éducation physique', durations: [50] },
  { label: 'Lecture', durations: [30] },
  { label: 'Repas de midi', durations: [45, 60] },
]

/** Horaire d'une journée : une heure de début et 4 activités enchaînées. */
export function generateSchedule({ kind = 'cinq-min' } = {}) {
  const startMinutes = kind === 'heure-pleine' ? [0] : kind === 'demie' ? [0, 30] : kind === 'minute' ? Array.from({ length: 60 }, (_, i) => i) : [0, 15, 30, 45]
  const labels = shuffle(ACTIVITIES).slice(0, 4)
  return {
    startTime: { h: pick([8, 9]), m: pick(startMinutes) },
    activities: labels.map((a) => ({ label: a.label, duration: pick(a.durations) })),
  }
}

/** Heures de fin attendues, activité par activité, en enchaînant les durées. */
export function scheduleEnds(startTime, activities) {
  let current = startTime
  return activities.map((a) => {
    current = addMinutes(current, a.duration)
    return current
  })
}
