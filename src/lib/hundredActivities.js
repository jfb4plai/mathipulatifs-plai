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

// --- Séquence étape par étape ---

/** Nombre d'essais permis par étape avant de montrer la bonne case (Infinity = jamais). */
export function stepAttemptLimit({ allowMultipleAttempts = true, showSolutionAfterAttempts = 2 } = {}) {
  if (!allowMultipleAttempts) return 1
  return showSolutionAfterAttempts > 0 ? showSolutionAfterAttempts : Infinity
}

export function stepHint(picked, expected) {
  return picked > expected
    ? 'Ta case est trop grande. Refais ce calcul.'
    : 'Ta case est trop petite. Refais ce calcul.'
}

/** Statut d'une case confirmée : montrée à l'élève, trouvée après erreur, ou trouvée du premier coup. */
export function stepStatus(tries, revealed) {
  if (revealed) return 'revealed'
  return tries.length > 1 ? 'retried' : 'ok'
}

/** Résumé enregistré pour l'enseignant. correct = aucune étape montrée à l'élève. */
export function summarizeSteps(log) {
  const solutionShown = log.some((s) => s.revealed)
  return {
    correct: !solutionShown,
    solutionShown,
    attempts: log.reduce((sum, s) => sum + s.tries.length, 0),
  }
}

/** Agrège les réponses « étape par étape » de plusieurs sessions : par étape, combien d'élèves
 *  ont eu besoin d'aide (plus d'un essai, ou solution montrée) et combien ont vu la solution. */
export function aggregateSteps(reponses) {
  const withSteps = (reponses || []).filter((r) => r && Array.isArray(r.steps))
  const byStep = new Map()
  for (const r of withSteps) {
    for (const st of r.steps) {
      const agg = byStep.get(st.step) || { step: st.step, op: st.op, needHelp: 0, revealed: 0 }
      if (st.tries.length > 1 || st.revealed) agg.needHelp += 1
      if (st.revealed) agg.revealed += 1
      byStep.set(st.step, agg)
    }
  }
  return { total: withSteps.length, steps: [...byStep.values()].sort((a, b) => a.step - b.step) }
}
