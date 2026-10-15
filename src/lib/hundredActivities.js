// Logique pure des activités de la grille des 100 (séquence opérative, écart).
// Sans React : testable avec `node --test src/lib/hundredActivities.test.js`.

export const MAX_OPS = 5

export function gridBounds(startAt = 1) {
  const min = Number(startAt) === 0 ? 0 : 1
  return { min, max: min + 99 }
}

const signed = (op) => (op.sign === '-' ? -op.value : op.value)

/** Applique les opérations une à une ; chaque étape doit rester dans la grille. */
export function runSequence(start, ops, startAt = 1) {
  const { min, max } = gridBounds(startAt)
  const path = [start]
  if (!Number.isInteger(start) || start < min || start > max) {
    return { ok: false, reason: `La case de départ doit être entre ${min} et ${max}.`, path }
  }
  if (!Array.isArray(ops) || ops.length === 0) {
    return { ok: false, reason: 'Ajoute au moins une opération.', path }
  }
  let cur = start
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i]
    if (!Number.isInteger(op.value) || op.value < 1) {
      return { ok: false, reason: `Opération ${i + 1} : écris un nombre entier d'au moins 1.`, path }
    }
    cur += signed(op)
    path.push(cur)
    if (cur < min || cur > max) {
      return { ok: false, reason: `Opération ${i + 1} : on sort de la grille (${cur}).`, path }
    }
  }
  return { ok: true, end: cur, path }
}

export function validateGapSetup(start, target, startAt = 1) {
  const { min, max } = gridBounds(startAt)
  const inGrid = (n) => Number.isInteger(n) && n >= min && n <= max
  if (!inGrid(start) || !inGrid(target)) return { ok: false, reason: `Les deux cases doivent être entre ${min} et ${max}.` }
  if (start === target) return { ok: false, reason: 'Le départ et la cible doivent être différents.' }
  return { ok: true }
}

export function expectedGap(start, target) {
  return { sign: target > start ? '+' : '-', value: Math.abs(target - start) }
}

/** answer = { sign: '+' | '-' | null, value: number | null } */
export function checkGap(start, target, answer) {
  const exp = expectedGap(start, target)
  if (answer.sign !== '+' && answer.sign !== '-') return { correct: false, problem: 'choix' }
  if (!Number.isInteger(answer.value)) return { correct: false, problem: 'valeur-absente' }
  const signOk = answer.sign === exp.sign
  const valueOk = answer.value === exp.value
  if (signOk && valueOk) return { correct: true, problem: null }
  if (!signOk) return { correct: false, problem: 'signe' }
  return { correct: false, problem: 'valeur' }
}

export function describeOp(op) {
  return `${op.sign === '-' ? 'Retire' : 'Ajoute'} ${op.value}`
}
