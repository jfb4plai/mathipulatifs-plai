// Génération des items d'une série, manipulable par manipulable. Un item est
// un override partiel de la config de base, fusionné côté ExerciseCreate et
// StudentView via { ...configBase, ...item }.

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

// Progression croissante de difficulté par manipulable. `difficulty` est un
// des éléments de la liste — les kinds autorisés vont du début de la liste
// jusqu'à `difficulty` inclus.
export const KIND_PROGRESSION = {
  horloge: ['heure-pleine', 'demie', 'quart', 'cinq-min'],
  monnaie: ['euros-ronds', 'euros-et-50c', 'centimes'],
  base10: ['dizaines', 'centaines'],
  cadres10: ['jusqu-a-10', 'jusqu-a-20'],
  cuisenaire: ['petit-total', 'grand-total'],
  'droite-numerique': ['entiers', 'avec-pas', 'relatifs'],
  grille100: ['multiples-faciles', 'multiples-difficiles'],
}

export const KIND_LABELS = {
  'heure-pleine': 'Heure pleine',
  demie: 'Demi-heure',
  quart: "Quart d'heure",
  'cinq-min': '5 minutes',
  'euros-ronds': 'Euros ronds',
  'euros-et-50c': 'Euros et 50 centimes',
  centimes: 'Centimes',
  rendu: 'Rendu de monnaie',
  dizaines: 'Dizaines',
  centaines: 'Centaines',
  'jusqu-a-10': "Jusqu'à 10",
  'jusqu-a-20': "Jusqu'à 20",
  'petit-total': 'Petit total (1 à 10)',
  'grand-total': 'Grand total (11 à 30)',
  entiers: 'Entiers',
  'avec-pas': 'Avec un pas',
  relatifs: 'Nombres relatifs',
  'multiples-faciles': 'Multiples faciles (2, 5, 10)',
  'multiples-difficiles': 'Multiples difficiles (3, 4, 6, 7, 8, 9)',
}

/** Kinds autorisés pour une borne de difficulté donnée (du début de la
 *  progression jusqu'à `difficulty` inclus). Renvoie toute la progression si
 *  `difficulty` est absent ou inconnu. */
export function allowedKinds(manipulative, difficulty) {
  const progression = KIND_PROGRESSION[manipulative] || []
  const idx = progression.indexOf(difficulty)
  return idx === -1 ? progression : progression.slice(0, idx + 1)
}

/** Répartit itemCount items sur les kinds autorisés : chaque kind apparaît au
 *  moins une fois avant qu'aucun ne se répète, puis l'ordre est mélangé. */
export function distributeKinds(manipulative, difficulty, itemCount) {
  const kinds = allowedKinds(manipulative, difficulty)
  if (kinds.length === 0) return Array(itemCount).fill(null)
  const out = []
  for (let i = 0; i < itemCount; i++) out.push(kinds[i % kinds.length])
  return shuffle(out)
}

/** Génère l'override de config d'un item, selon son manipulable et son kind.
 *  `baseConfig` ne sert qu'à lire des informations déjà choisies par
 *  l'enseignant qui influencent la génération (ex : mode composer/rendu pour
 *  la Monnaie). */
export function generateItem(manipulative, kind, baseConfig = {}) {
  switch (manipulative) {
    case 'horloge': {
      const h = randInt(1, 12)
      const m =
        kind === 'heure-pleine' ? 0
        : kind === 'demie' ? 30
        : kind === 'quart' ? pick([15, 45])
        : pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55])
      return { kind, targetTime: { h, m } }
    }
    case 'monnaie': {
      if (baseConfig.mode === 'rendu') {
        const price = randInt(1, 8) * 100 + pick([0, 50])
        const paid = price + pick([100, 200, 500])
        return { kind: 'rendu', price, paid }
      }
      const amount =
        kind === 'euros-ronds' ? randInt(1, 5) * 100
        : kind === 'euros-et-50c' ? randInt(1, 5) * 100 + 50
        : randInt(50, 500)
      return { kind, targetAmount: amount }
    }
    case 'base10': {
      const targetNumber = kind === 'dizaines' ? randInt(10, 90) : randInt(100, 999)
      return { kind, targetNumber }
    }
    case 'cadres10': {
      if (kind === 'jusqu-a-10') return { kind, frames: 1, targetNumber: randInt(1, 10) }
      return { kind, frames: 2, targetNumber: randInt(11, 20) }
    }
    case 'cuisenaire': {
      const targetNumber = kind === 'petit-total' ? randInt(1, 10) : randInt(11, 30)
      return { kind, targetNumber }
    }
    case 'droite-numerique': {
      if (kind === 'entiers') return { kind, min: 0, max: 20, step: 1, targetValue: randInt(0, 20) }
      if (kind === 'avec-pas') {
        const step = pick([2, 5])
        const max = step === 2 ? 20 : 50
        return { kind, min: 0, max, step, targetValue: randInt(0, max / step) * step }
      }
      return { kind, min: -10, max: 10, step: 1, targetValue: randInt(-10, 10) }
    }
    case 'grille100': {
      const multipleOf = kind === 'multiples-faciles' ? pick([2, 5, 10]) : pick([3, 4, 6, 7, 8, 9])
      return { kind, multipleOf }
    }
    default:
      return { kind }
  }
}

/** Génère une série complète : itemCount items répartis sur les kinds
 *  autorisés jusqu'à `difficulty`. */
export function generateSeries(manipulative, difficulty, itemCount, baseConfig = {}) {
  const kinds = distributeKinds(manipulative, difficulty, itemCount)
  return kinds.map((kind) => generateItem(manipulative, kind, baseConfig))
}
