# Lot B — Série d'exercices (1 à 10 items) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'enseignant de créer un exercice contenant une série de 1 à 10 items (au lieu d'un seul), en mode fixe (généré puis validé/modifié par l'enseignant) ou aléatoire (généré par élève), avec auto-avance élève entre les items et score global + détail côté enseignant.

**Architecture:** Un item est un override partiel fusionné sur la config de base du manipulable (`{ ...configBase, ...item }`), généré par des fonctions dédiées dans un nouveau fichier `src/lib/seriesGenerators.js`. La boucle de série vit dans `StudentView.jsx` (index d'item courant, remontage du manipulable par item via `key`). Chaque manipulable gagne un champ `revealMs` dans son `onValidate` (fondation nécessaire à un timing d'auto-avance fiable — voir spec). `ExerciseCreate.jsx` gagne un bloc « Série » et désactive le mode CPA quand une série est active. `Dashboard.jsx` affiche un score et un détail dépliable pour les sessions de série.

**Tech Stack:** React 18 + Vite 5 + Tailwind CSS v3. **Aucun framework de test dans ce projet** — ne pas en introduire. Vérification = `npx vite build` + test manuel navigateur.

**Spec de référence :** `docs/superpowers/specs/2026-07-15-lot-b-series-design.md` (lire avant de commencer — contient toutes les décisions déjà prises, à ne pas re-débattre).

---

## Task 1 : Fondation — champ `revealMs` sur les 7 manipulables

**Files:**
- Modify: `src/components/manipulatives/Base10Blocks.jsx:132,143`
- Modify: `src/components/manipulatives/TenFrames.jsx:53,80,88`
- Modify: `src/components/manipulatives/CuisenaireRods.jsx:133,159,166`
- Modify: `src/components/manipulatives/HundredChart.jsx:76,110,117`
- Modify: `src/components/manipulatives/Money.jsx:165,191,198`
- Modify: `src/components/manipulatives/NumberLine.jsx:139,168,176`
- Modify: `src/components/manipulatives/Clock.jsx:239,256,297`

But d'un manipulable en série auto-avancée : le `onValidate` doit indiquer combien de
millisecondes d'animation restent à jouer après son appel, pour que `StudentView`
sache exactement quand passer à l'item suivant sans jamais couper une animation en
cours (c'est le bug qu'on vient de corriger sur le mode CPA — appliqué ici de façon
générale). `0` = verrouillage instantané, pas d'animation à attendre.

- [ ] **Step 1: Base10Blocks.jsx — revealMs: 0 (verrouillage toujours instantané)**

Fichier : `src/components/manipulatives/Base10Blocks.jsx`

Ligne 132, remplacer :
```js
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: true })
```
par :
```js
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: true, revealMs: 0 })
```

Ligne 143, remplacer :
```js
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: false, attempts: newAttempts })
```
par :
```js
      if (onValidate) onValidate({ total, centaines, dizaines, unites, correct: false, attempts: newAttempts, revealMs: 0 })
```

- [ ] **Step 2: TenFrames.jsx, CuisenaireRods.jsx, HundredChart.jsx, Money.jsx — revealMs: 0 (juste) / 2000 (révélation)**

Ces 4 fichiers partagent exactement le même motif (issu du Lot A). Pour chacun,
deux appels `onValidate` à modifier : celui de la ligne « réponse fausse verrouillée
sans réessai » (`correct: false, attempts: n` sans `solutionShown`) → `revealMs: 0`
(verrouillage instantané, pas d'animation) ; celui de la ligne « réponse juste »
(`correct: true, attempts: n`) → `revealMs: 0` ; et celui de la révélation
automatique (`correct: false, attempts: n, solutionShown: true`) → `revealMs: 2000`
(délai exact déjà en place dans chaque `revealSolution`, qui applique la solution
via `setTimeout(..., 2000)`).

`src/components/manipulatives/TenFrames.jsx` :

Ligne 53, remplacer :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
```
par :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
```

Ligne 80, remplacer :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
```
par :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
```

Ligne 88, remplacer :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
```
par :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
```

`src/components/manipulatives/CuisenaireRods.jsx` — même motif, lignes 133/159/166 :

Ligne 133 :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
```
→
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
```

Ligne 159 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
```

Ligne 166 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
```

`src/components/manipulatives/HundredChart.jsx` — même motif, lignes 76/110/117 :

Ligne 76 :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
```
→
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
```

Ligne 110 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
```

Ligne 117 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
```

`src/components/manipulatives/Money.jsx` — même motif, lignes 165/191/198 :

Ligne 165 :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
```
→
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 2000 })
```

Ligne 191 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
```

Ligne 198 :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
```
→
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
```

- [ ] **Step 3: NumberLine.jsx — revealMs: 0 (juste) / 4000 (révélation : pause 2000 + glissement animé 2000)**

Fichier : `src/components/manipulatives/NumberLine.jsx`

Ligne 139, remplacer :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
```
par :
```js
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true, revealMs: 4000 })
```

Ligne 168, remplacer :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
```
par :
```js
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n, revealMs: 0 })
```

Ligne 176, remplacer :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
```
par :
```js
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, revealMs: 0 })
```

- [ ] **Step 4: Clock.jsx — revealMs: 0 (précis) / 4500 (approximatif accepté) / 4000 (révélation après échecs)**

Fichier : `src/components/manipulatives/Clock.jsx`

Ligne 239 est dans la branche « réponse juste, éventuellement approximative » —
`wasPrecise` détermine si un recalage lent (2500 pause + 2000 animation = 4500ms)
va suivre. Contexte actuel (ne pas modifier les lignes autour, seulement l'appel
`onValidate`) :
```js
        setValidated(true)
        setFeedback(true)
        setPrecise(wasPrecise)
        if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: true, attempts: attempts + 1 })
```
remplacer la ligne `onValidate` par :
```js
        if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: true, attempts: attempts + 1, revealMs: wasPrecise ? 0 : 4500 })
```

Ligne 256, remplacer :
```js
          if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n })
```
par :
```js
          if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, revealMs: 0 })
```

Ligne 297 (dans `revealSolution`), remplacer :
```js
    if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, solutionShown: true })
```
par :
```js
    if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, solutionShown: true, revealMs: 4000 })
```

- [ ] **Step 5: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built` sans erreur (aucune de ces modifications ne change de logique visible, seulement les objets passés à `onValidate`).

- [ ] **Step 6: Commit**

```bash
git add src/components/manipulatives/Base10Blocks.jsx src/components/manipulatives/TenFrames.jsx src/components/manipulatives/CuisenaireRods.jsx src/components/manipulatives/HundredChart.jsx src/components/manipulatives/Money.jsx src/components/manipulatives/NumberLine.jsx src/components/manipulatives/Clock.jsx
git commit -m "Lot B / T1 : fondation revealMs sur les 7 manipulables

Chaque onValidate indique désormais la durée d'animation restante
(0 = verrouillage instantané). Nécessaire pour l'auto-avance fiable
entre items d'une série (Lot B), sur le modèle du bug CPA corrigé
plus tôt : Horloge appelait onValidate avant la fin de son recalage
sans jamais le signaler."
```

---

## Task 2 : Générateurs de série

**Files:**
- Create: `src/lib/seriesGenerators.js`

- [ ] **Step 1: Écrire le fichier générateur**

Fichier : `src/lib/seriesGenerators.js`

```js
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
```

- [ ] **Step 2: Vérifier manuellement dans une console Node**

Run:
```bash
node -e "
const m = require('./src/lib/seriesGenerators.js');
console.log('ERREUR : require ne fonctionnera pas sur un fichier ESM — utiliser plutôt le script suivant');
" 2>/dev/null || true
```

Le fichier utilise `export`/`import` (ESM), non compatible avec `require`. Vérifier
plutôt via un script `.mjs` temporaire :

```bash
cat > /tmp/verify-series.mjs << 'EOF'
import { generateSeries, distributeKinds, allowedKinds, KIND_PROGRESSION } from './src/lib/seriesGenerators.js'

for (const manip of Object.keys(KIND_PROGRESSION)) {
  const difficulty = KIND_PROGRESSION[manip][KIND_PROGRESSION[manip].length - 1]
  const series = generateSeries(manip, difficulty, 6, { mode: manip === 'monnaie' ? 'composer' : undefined })
  console.log(manip, '→', JSON.stringify(series))
}
EOF
node /tmp/verify-series.mjs
```

Expected: 7 lignes affichées (une par manipulable), chacune listant 6 items avec un
`kind` et les champs cible attendus (`targetTime`, `targetAmount`, `targetNumber`,
`targetValue` ou `multipleOf` selon le manipulable). Aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/lib/seriesGenerators.js
git commit -m "Lot B / T2 : générateurs de série par manipulable

generateSeries(manipulative, difficulty, itemCount, baseConfig) répartit
itemCount items sur les catégories (kind) autorisées jusqu'à la borne de
difficulté choisie, et génère une valeur cible aléatoire cohérente par item."
```

---

## Task 3 : ExerciseCreate — état, génération, buildConfig

**Files:**
- Modify: `src/pages/ExerciseCreate.jsx`

- [ ] **Step 1: Importer les générateurs**

Fichier : `src/pages/ExerciseCreate.jsx`, ligne 1-4, remplacer :
```js
import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'
```
par :
```js
import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'
import { KIND_PROGRESSION, KIND_LABELS, generateSeries } from '../lib/seriesGenerators.js'
```

- [ ] **Step 2: Ajouter l'état de série**

Après la ligne (actuelle) :
```js
  const [cpaMode, setCpaMode] = useState(false)
```
ajouter :
```js
  const [cpaMode, setCpaMode] = useState(false)

  // Série (Lot B)
  const [seriesMode, setSeriesMode] = useState('mono') // 'mono' | 'fixe' | 'aleatoire'
  const [itemCount, setItemCount] = useState(5)
  const [difficulty, setDifficulty] = useState(null)
  const [generatedItems, setGeneratedItems] = useState([])
  const seriesActive = seriesMode !== 'mono'
```

- [ ] **Step 3: Éligibilité de la série par manipulable/mode**

**Attention à l'ordre** : cette constante lit `dnMode`, `chartMode`, `clkMode`, qui
ne sont déclarés (par `const [dnMode, ...] = useState(...)`) que plus bas dans le
fichier, dans les blocs de config Droite numérique / Grille des 100 / Horloge.
`const` en JavaScript applique une zone temporairement morte stricte : la
référencer avant sa ligne de déclaration provoque un `ReferenceError` **à
l'exécution** (pas une erreur de build — `npx vite build` compilerait sans se
plaindre, et l'écran planterait seulement à l'ouverture de la page). Il faut donc
placer ce bloc **après** la dernière déclaration `useState` du composant (après
`monShowSolutionAfter`, juste avant `const [loading, setLoading] = useState(false)`),
pas juste après le bloc ajouté au Step 2.

Juste avant la ligne actuelle :
```js
  const [loading, setLoading] = useState(false)
```
ajouter :
```js
  const seriesEligible = (() => {
    if (selectedManip === 'fractions') return false
    if (selectedManip === 'droite-numerique') return dnMode === 'placer'
    if (selectedManip === 'grille100') return chartMode === 'multiples'
    if (selectedManip === 'horloge') return clkMode === 'placer'
    return Boolean(selectedManip)
  })()

  const [loading, setLoading] = useState(false)
```

- [ ] **Step 4: Réinitialiser la difficulté par défaut quand le manipulable change**

Ajouter, après le bloc `useEffect` de chargement d'exercice (après la ligne actuelle
`}, [editId, isEditMode])`) :
```js

  // Réinitialise la difficulté par défaut (la plus facile) quand le
  // manipulable change, pour éviter une valeur orpheline d'un autre
  // manipulable.
  useEffect(() => {
    if (!selectedManip) return
    const progression = KIND_PROGRESSION[selectedManip]
    if (progression && progression.length > 0) setDifficulty((prev) => prev || progression[0])
  }, [selectedManip])
```

- [ ] **Step 5: Fonctions de génération et d'édition des items**

Après `toggleFracDenominator` (juste avant `buildConfig`), ajouter :
```js

  const handleGenerateItems = () => {
    setGeneratedItems(
      generateSeries(selectedManip, difficulty, itemCount, { mode: selectedManip === 'monnaie' ? monMode : undefined })
    )
  }

  const updateGeneratedItem = (index, updated) => {
    setGeneratedItems((prev) => prev.map((it, i) => (i === index ? updated : it)))
  }
```

- [ ] **Step 6: Pré-remplissage en mode édition**

Après la ligne actuelle `setCpaMode(cfg.cpaMode || false)` (dans `loadExercise`),
ajouter :
```js
        setCpaMode(cfg.cpaMode || false)
        setSeriesMode(cfg.seriesMode || 'mono')
        setItemCount(cfg.itemCount || 5)
        setDifficulty(cfg.difficulty || null)
        setGeneratedItems(cfg.items || [])
```
(remplace la ligne unique `setCpaMode(cfg.cpaMode || false)` par ce bloc de 5 lignes.)

- [ ] **Step 7: Étendre buildConfig pour ajouter les champs de série**

`buildConfig` est actuellement une chaîne de `if (selectedManip === X) { return {...} }`.
Il faut la transformer en `if/else if` qui remplit une variable `base`, pour pouvoir
fusionner les champs de série après coup sans dupliquer le retour dans chaque
branche.

Remplacer l'intégralité de la fonction (de `const buildConfig = () => {` jusqu'à
son `}` fermant, juste avant `const handleSubmit`) par :

```js
  const buildConfig = () => {
    let base = {}
    if (selectedManip === 'base10') {
      base = {
        targetNumber: b10Target !== '' ? parseInt(b10Target) : undefined,
        maxNumber: parseInt(b10Max),
        showCounter: true,
        allowMultipleAttempts: b10MultipleAttempts,
        showSolutionAfterAttempts: b10MultipleAttempts ? b10ShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'droite-numerique') {
      base = {
        min: parseInt(dnMin),
        max: parseInt(dnMax),
        step: parseInt(dnStep),
        mode: dnMode,
        targetValue: dnMode === 'placer' && dnTargetValue !== '' ? parseInt(dnTargetValue) : undefined,
        showLabels: true,
        allowMultipleAttempts: dnMultipleAttempts,
        showSolutionAfterAttempts: dnMultipleAttempts ? dnShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'fractions') {
      base = {
        denominators: fracDenominators,
        mode: fracMode,
        cpaMode,
      }
    } else if (selectedManip === 'cuisenaire') {
      base = {
        targetNumber: cuiTarget !== '' ? parseInt(cuiTarget) : undefined,
        showCounter: true,
        showUnits: cuiShowUnits,
        allowMultipleAttempts: cuiMultipleAttempts,
        showSolutionAfterAttempts: cuiMultipleAttempts ? cuiShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'cadres10') {
      base = {
        frames: parseInt(tenFrames),
        targetNumber: tenTarget !== '' ? parseInt(tenTarget) : undefined,
        counterColor: tenColor,
        showCounter: true,
        allowMultipleAttempts: tenMultipleAttempts,
        showSolutionAfterAttempts: tenMultipleAttempts ? tenShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'grille100') {
      base = {
        startAt: parseInt(chartStart),
        mode: chartMode,
        multipleOf: chartMode === 'multiples' ? parseInt(chartMultiple) : undefined,
        allowMultipleAttempts: chartMultipleAttempts,
        showSolutionAfterAttempts: chartMultipleAttempts ? chartShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'horloge') {
      base = {
        mode: clkMode,
        granularity: parseInt(clkGranularity),
        targetTime: clkMode === 'placer' ? { h: parseInt(clkTargetH) || 3, m: parseInt(clkTargetM) || 0 } : undefined,
        allowMultipleAttempts: clkMultipleAttempts,
        showSolutionAfterAttempts: clkMultipleAttempts ? clkShowSolutionAfter : 1,
        cpaMode,
      }
    } else if (selectedManip === 'monnaie') {
      base = {
        mode: monMode,
        targetAmount: monMode === 'composer' && monTarget !== '' ? Math.round(parseFloat(monTarget) * 100) : undefined,
        price: monMode === 'rendu' ? Math.round(parseFloat(monPrice || 0) * 100) : undefined,
        paid: monMode === 'rendu' ? Math.round(parseFloat(monPaid || 0) * 100) : undefined,
        maxDenomination: parseInt(monMaxDenom),
        allowMultipleAttempts: monMultipleAttempts,
        showSolutionAfterAttempts: monMultipleAttempts ? monShowSolutionAfter : 1,
        cpaMode,
      }
    } else {
      return {}
    }

    if (seriesActive) {
      return {
        ...base,
        cpaMode: false, // le mode CPA est désactivé dès qu'une série est active
        seriesMode,
        itemCount,
        difficulty,
        items: seriesMode === 'fixe' ? generatedItems : undefined,
      }
    }
    return base
  }
```

- [ ] **Step 8: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built` sans erreur. (Le formulaire ne change pas encore visuellement —
ce sera fait au Task 4 — mais la logique doit déjà compiler.)

- [ ] **Step 9: Commit**

```bash
git add src/pages/ExerciseCreate.jsx
git commit -m "Lot B / T3 : ExerciseCreate — état et logique de série

Ajoute seriesMode/itemCount/difficulty/generatedItems, l'éligibilité par
manipulable/mode, la génération via seriesGenerators.js, et l'intégration
dans buildConfig (fusion des champs de série sur la config de base,
désactivation forcée de cpaMode). Pas encore d'interface visible — le
bloc Série arrive au Task 4."
```

---

## Task 4 : ExerciseCreate — interface du bloc Série + désactivation CPA

**Files:**
- Modify: `src/pages/ExerciseCreate.jsx`

- [ ] **Step 1: Ajouter le composant ItemEditor**

Juste après la fonction `RetryCycleFields` (avant `export default function ExerciseCreate()`),
ajouter :
```js

/** Édition d'un item généré — un champ de valeur cible différent par
 *  manipulable, réutilisant le même style que les champs mono-item. */
function ItemEditor({ manipulative, monMode, item, onChange }) {
  const set = (patch) => onChange({ ...item, ...patch })
  const smallInput = 'px-2 py-1.5 border border-gray-300 rounded-lg text-center text-sm'

  if (manipulative === 'horloge') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number" min={1} max={12} value={item.targetTime?.h ?? 1}
          onChange={(e) => set({ targetTime: { ...item.targetTime, h: parseInt(e.target.value) || 1 } })}
          className={`w-16 ${smallInput}`}
        />
        <span className="text-gray-400 text-sm">h</span>
        <input
          type="number" min={0} max={59} value={item.targetTime?.m ?? 0}
          onChange={(e) => set({ targetTime: { ...item.targetTime, m: parseInt(e.target.value) || 0 } })}
          className={`w-16 ${smallInput}`}
        />
      </div>
    )
  }
  if (manipulative === 'monnaie') {
    if (monMode === 'rendu') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number" step="0.01" min={0} value={(item.price ?? 0) / 100}
            onChange={(e) => set({ price: Math.round(parseFloat(e.target.value || 0) * 100) })}
            className={`w-20 ${smallInput}`}
          />
          <span className="text-gray-400 text-xs">€ prix →</span>
          <input
            type="number" step="0.01" min={0} value={(item.paid ?? 0) / 100}
            onChange={(e) => set({ paid: Math.round(parseFloat(e.target.value || 0) * 100) })}
            className={`w-20 ${smallInput}`}
          />
          <span className="text-gray-400 text-xs">€ payé</span>
        </div>
      )
    }
    return (
      <input
        type="number" step="0.01" min={0} value={(item.targetAmount ?? 0) / 100}
        onChange={(e) => set({ targetAmount: Math.round(parseFloat(e.target.value || 0) * 100) })}
        className={`w-24 ${smallInput}`}
      />
    )
  }
  if (manipulative === 'droite-numerique') {
    return (
      <input
        type="number" value={item.targetValue ?? 0}
        onChange={(e) => set({ targetValue: parseInt(e.target.value) || 0 })}
        className={`w-20 ${smallInput}`}
      />
    )
  }
  if (manipulative === 'grille100') {
    return (
      <input
        type="number" min={2} max={20} value={item.multipleOf ?? 2}
        onChange={(e) => set({ multipleOf: parseInt(e.target.value) || 2 })}
        className={`w-20 ${smallInput}`}
      />
    )
  }
  // base10, cadres10, cuisenaire : un nombre cible
  return (
    <input
      type="number" min={1} value={item.targetNumber ?? 1}
      onChange={(e) => set({ targetNumber: parseInt(e.target.value) || 1 })}
      className={`w-20 ${smallInput}`}
    />
  )
}
```

- [ ] **Step 2: Masquer les champs cible mono-item quand la série est active**

Sept petites modifications, une par manipulable, toutes du même type : entourer le
champ de valeur cible d'un `{!seriesActive && (...)}`, et élargir la condition
d'affichage de `RetryCycleFields` pour qu'elle reste visible même sans cible
mono-item renseignée dès qu'une série est active.

**Base10** — aucune modification nécessaire : son champ cible n'est déjà gardé par
aucune condition de type `!== ''` sur `RetryCycleFields` (il est affiché
inconditionnellement dans son bloc). Ne rien changer ici — mais noter qu'on
*n'ajoute pas* de garde d'affichage sur son champ cible, il restera visible même en
série. C'est acceptable (décision : cohérence UI stricte pour tous les manipulables
n'est pas demandée) — **sauter cette sous-étape**.

**Droite numérique**, remplacer :
```jsx
                {dnMode === 'placer' && (
                  <>
                    <div>
                      <label className={labelClass}>Nombre à placer (optionnel)</label>
                      <input
                        type="number"
                        value={dnTargetValue}
                        onChange={(e) => setDnTargetValue(e.target.value)}
                        min={dnMin}
                        max={dnMax}
                        placeholder="Ex : 13 (laisser vide pour un tirage au hasard)"
                        className={inputClass}
                      />
                    </div>
                    <RetryCycleFields
```
par :
```jsx
                {dnMode === 'placer' && (
                  <>
                    {!seriesActive && (
                      <div>
                        <label className={labelClass}>Nombre à placer (optionnel)</label>
                        <input
                          type="number"
                          value={dnTargetValue}
                          onChange={(e) => setDnTargetValue(e.target.value)}
                          min={dnMin}
                          max={dnMax}
                          placeholder="Ex : 13 (laisser vide pour un tirage au hasard)"
                          className={inputClass}
                        />
                      </div>
                    )}
                    <RetryCycleFields
```

**Cuisenaire**, remplacer :
```jsx
            {selectedManip === 'cuisenaire' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Total cible (optionnel)</label>
                  <input
                    type="number"
                    value={cuiTarget}
                    onChange={(e) => setCuiTarget(e.target.value)}
                    min={1}
                    max={100}
                    placeholder="Ex : 10 (laisser vide pour exploration libre)"
                    className={inputClass}
                  />
                </div>
```
par :
```jsx
            {selectedManip === 'cuisenaire' && (
              <div className="space-y-4">
                {!seriesActive && (
                  <div>
                    <label className={labelClass}>Total cible (optionnel)</label>
                    <input
                      type="number"
                      value={cuiTarget}
                      onChange={(e) => setCuiTarget(e.target.value)}
                      min={1}
                      max={100}
                      placeholder="Ex : 10 (laisser vide pour exploration libre)"
                      className={inputClass}
                    />
                  </div>
                )}
```

Et, un peu plus bas dans le même bloc, remplacer :
```jsx
                {cuiTarget !== '' && (
                  <RetryCycleFields
                    allow={cuiMultipleAttempts}
```
par :
```jsx
                {(cuiTarget !== '' || seriesActive) && (
                  <RetryCycleFields
                    allow={cuiMultipleAttempts}
```

**Cadres à 10**, remplacer :
```jsx
                <div>
                  <label className={labelClass}>Nombre cible (optionnel)</label>
                  <input
                    type="number"
                    value={tenTarget}
                    onChange={(e) => setTenTarget(e.target.value)}
                    min={1}
                    max={tenFrames === 2 ? 20 : 10}
                    placeholder={`Ex : 7 (max ${tenFrames === 2 ? 20 : 10})`}
                    className={inputClass}
                  />
                </div>
```
par :
```jsx
                {!seriesActive && (
                  <div>
                    <label className={labelClass}>Nombre cible (optionnel)</label>
                    <input
                      type="number"
                      value={tenTarget}
                      onChange={(e) => setTenTarget(e.target.value)}
                      min={1}
                      max={tenFrames === 2 ? 20 : 10}
                      placeholder={`Ex : 7 (max ${tenFrames === 2 ? 20 : 10})`}
                      className={inputClass}
                    />
                  </div>
                )}
```

Et remplacer :
```jsx
                {tenTarget !== '' && (
                  <RetryCycleFields
                    allow={tenMultipleAttempts}
```
par :
```jsx
                {(tenTarget !== '' || seriesActive) && (
                  <RetryCycleFields
                    allow={tenMultipleAttempts}
```

**Grille des 100**, remplacer :
```jsx
                {chartMode === 'multiples' && (
                  <>
                    <div>
                      <label className={labelClass}>Multiples de quel nombre ?</label>
                      <input
                        type="number"
                        value={chartMultiple}
                        onChange={(e) => setChartMultiple(e.target.value)}
                        min={2}
                        max={20}
                        className={inputClass}
                      />
                    </div>
                    <RetryCycleFields
```
par :
```jsx
                {chartMode === 'multiples' && (
                  <>
                    {!seriesActive && (
                      <div>
                        <label className={labelClass}>Multiples de quel nombre ?</label>
                        <input
                          type="number"
                          value={chartMultiple}
                          onChange={(e) => setChartMultiple(e.target.value)}
                          min={2}
                          max={20}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <RetryCycleFields
```

**Horloge**, remplacer :
```jsx
                {clkMode === 'placer' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Heure cible — heures</label>
```
par :
```jsx
                {clkMode === 'placer' && !seriesActive && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Heure cible — heures</label>
```
(seule la condition d'ouverture de ce `<div>` change, le reste du bloc — les deux
`<input>` heures/minutes et sa fermeture `</div>` — reste identique.)

**Monnaie**, remplacer :
```jsx
                {monMode === 'composer' && (
                  <div>
                    <label className={labelClass}>Montant cible en € (optionnel)</label>
```
par :
```jsx
                {monMode === 'composer' && !seriesActive && (
                  <div>
                    <label className={labelClass}>Montant cible en € (optionnel)</label>
```

Et remplacer :
```jsx
                {monMode === 'rendu' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Prix de l'article (€)</label>
```
par :
```jsx
                {monMode === 'rendu' && !seriesActive && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Prix de l'article (€)</label>
```

Et remplacer :
```jsx
                {(monMode === 'rendu' || monTarget !== '') && (
                  <RetryCycleFields
                    allow={monMultipleAttempts}
```
par :
```jsx
                {(monMode === 'rendu' || monTarget !== '' || seriesActive) && (
                  <RetryCycleFields
                    allow={monMultipleAttempts}
```

- [ ] **Step 3: Ajouter le bloc Série**

Juste avant le bloc CPA (repérer le commentaire `{/* CPA mode */}`), insérer :
```jsx
            {/* Série (Lot B) */}
            {seriesEligible && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <label className={labelClass}>Série d'exercices</label>
                <select value={seriesMode} onChange={(e) => setSeriesMode(e.target.value)} className={inputClass}>
                  <option value="mono">Un seul item (par défaut)</option>
                  <option value="fixe">Série fixe (je choisis et je valide chaque item)</option>
                  <option value="aleatoire">Série aléatoire (différente à chaque élève)</option>
                </select>
                {!focusMode && seriesActive && (
                  <p className="text-xs text-gray-500">
                    L'élève reçoit {itemCount} item{itemCount > 1 ? 's' : ''} d'affilée au lieu d'un
                    seul, avec un score final — le mode CPA n'est alors plus disponible.
                  </p>
                )}

                {seriesActive && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Nombre d'items</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={itemCount}
                          onChange={(e) => setItemCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
                          className={inputClass}
                        />
                      </div>
                      {!(selectedManip === 'monnaie' && monMode === 'rendu') && (
                        <div>
                          <label className={labelClass}>Niveau de difficulté</label>
                          <select value={difficulty || ''} onChange={(e) => setDifficulty(e.target.value)} className={inputClass}>
                            {(KIND_PROGRESSION[selectedManip] || []).map((k) => (
                              <option key={k} value={k}>{KIND_LABELS[k]}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {seriesMode === 'fixe' && (
                      <div className="space-y-3">
                        <button
                          type="button"
                          onClick={handleGenerateItems}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl transition-colors min-h-[44px] text-sm"
                        >
                          {generatedItems.length > 0 ? 'Régénérer les items' : `Générer les ${itemCount} items`}
                        </button>
                        {generatedItems.length > 0 && !focusMode && (
                          <p className="text-xs text-gray-400">
                            Régénérer efface les valeurs modifiées ci-dessous.
                          </p>
                        )}
                        {generatedItems.length > 0 && (
                          <div className="space-y-2">
                            {generatedItems.map((item, i) => (
                              <div key={i} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                                <span className="text-xs font-bold text-gray-400 w-6">#{i + 1}</span>
                                <span className="text-xs text-gray-500 flex-1">{KIND_LABELS[item.kind] || item.kind}</span>
                                <ItemEditor
                                  manipulative={selectedManip}
                                  monMode={monMode}
                                  item={item}
                                  onChange={(updated) => updateGeneratedItem(i, updated)}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

```
(inséré directement avant `{/* CPA mode */}`.)

- [ ] **Step 4: Désactiver le mode CPA quand la série est active**

Remplacer le bloc CPA existant :
```jsx
            {/* CPA mode */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={cpaMode}
                  onChange={(e) => setCpaMode(e.target.checked)}
                  className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                    Mode CPA guidé
                  </div>
                  {!focusMode && (
                    <div className="text-xs text-gray-500 mt-0.5">
                      Après la manipulation, guide l'élève vers la représentation picturale (dessin) puis abstraite (notation).
                    </div>
                  )}
                </div>
              </label>
            </div>
```
par :
```jsx
            {/* CPA mode */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              {seriesActive ? (
                <p className="text-xs text-gray-400">
                  Mode CPA non disponible en série — repassez sur « Un seul item » ci-dessus pour l'activer.
                </p>
              ) : (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={cpaMode}
                    onChange={(e) => setCpaMode(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                      Mode CPA guidé
                    </div>
                    {!focusMode && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        Après la manipulation, guide l'élève vers la représentation picturale (dessin) puis abstraite (notation).
                      </div>
                    )}
                  </div>
                </label>
              )}
            </div>
```

- [ ] **Step 5: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built` sans erreur.

- [ ] **Step 6: Vérification manuelle navigateur (sans authentification)**

Comme au Lot A, le formulaire complet nécessite une authentification Supabase.
Pour un contrôle visuel rapide sans authentification, créer temporairement
`src/pages/DevTest.jsx` :
```jsx
import ExerciseCreate from './ExerciseCreate.jsx'
export default function DevTest() {
  return <ExerciseCreate />
}
```
et une route temporaire dans `src/App.jsx` (`<Route path="/dev-test" element={<DevTest />} />`),
lancer `npx vite --port 5190`, ouvrir `/dev-test`, sélectionner « Horloge », mode
« Placer une heure cible », choisir « Série fixe », 4 items, cliquer Générer,
vérifier que 4 lignes d'items apparaissent avec des champs heure/minute éditables,
modifier une valeur, vérifier qu'elle persiste. Retirer ensuite `DevTest.jsx` et la
route temporaire avant de commit (ne pas les committer).

- [ ] **Step 7: Commit**

```bash
git add src/pages/ExerciseCreate.jsx
git commit -m "Lot B / T4 : ExerciseCreate — interface du bloc Série

Sélecteur mono/fixe/aléatoire, nombre d'items (1-10), niveau de
difficulté, génération + édition des items en mode fixe (ItemEditor
par manipulable). Champs de cible mono-item masqués quand une série
est active. Mode CPA désactivé avec message explicatif."
```

---

## Task 5 : StudentView — boucle de série

**Files:**
- Modify: `src/pages/StudentView.jsx`

- [ ] **Step 1: Importer le générateur**

Remplacer :
```js
import Money from '../components/manipulatives/Money.jsx'
```
par :
```js
import Money from '../components/manipulatives/Money.jsx'
import { generateSeries } from '../lib/seriesGenerators.js'
```

- [ ] **Step 2: Ajouter l'état de série**

Après la ligne actuelle :
```js
  const [manipResult, setManipResult] = useState(null)
```
ajouter :
```js
  const [manipResult, setManipResult] = useState(null)

  // Série (Lot B)
  const [seriesItems, setSeriesItems] = useState(null) // null = pas de série ; sinon liste d'overrides
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [seriesResults, setSeriesResults] = useState([])
  const [seriesDone, setSeriesDone] = useState(false)
```

- [ ] **Step 3: Générer/charger les items de série au chargement de l'exercice**

Après le `useEffect` existant qui charge `exercise` (celui qui se termine par
`}, [token, isDemo])`), ajouter :
```js

  // Résout les items de la série une fois l'exercice chargé : lus tels quels
  // en mode fixe, générés côté client (une graine différente par élève) en
  // mode aléatoire.
  useEffect(() => {
    if (!exercise) return
    const mode = exercise.config?.seriesMode
    if (!mode || mode === 'mono') return
    if (mode === 'fixe') {
      setSeriesItems(exercise.config.items || [])
    } else {
      setSeriesItems(
        generateSeries(exercise.manipulative, exercise.config.difficulty, exercise.config.itemCount, exercise.config)
      )
    }
  }, [exercise])

  const isSeries = Array.isArray(seriesItems)
  const seriesItemCount = seriesItems?.length ?? 1
  const currentConfig = isSeries
    ? { ...(exercise?.config || {}), ...seriesItems[currentItemIndex] }
    : (exercise?.config || {})
```

- [ ] **Step 4: Adapter saveSession pour accepter un correct explicite**

Remplacer :
```js
  const saveSession = async (result, duree) => {
    if (!isDemo && supabase && exercise?.id) {
      await supabase.from('mathip_sessions').insert({
        exercise_id: exercise.id,
        prenom_eleve: prenom || null,
        reponse: result,
        correct: result?.correct ?? null,
        duree_secondes: duree,
      })
    }
  }
```
par :
```js
  const saveSession = async (result, duree, correctOverride) => {
    if (!isDemo && supabase && exercise?.id) {
      await supabase.from('mathip_sessions').insert({
        exercise_id: exercise.id,
        prenom_eleve: prenom || null,
        reponse: result,
        correct: correctOverride !== undefined ? correctOverride : (result?.correct ?? null),
        duree_secondes: duree,
      })
    }
  }
```

- [ ] **Step 5: Brancher la boucle de série dans handleValidate**

Remplacer :
```js
  const handleValidate = async (result) => {
    const duree = Math.round((Date.now() - startTime) / 1000)
    setManipResult({ ...result, duree })

    if (!exercise?.config?.cpaMode) {
      setValidated(true)
      if (ttsEnabled) speak(encouragement)
      await saveSession(result, duree)
    }
    // En mode CPA : on ne bascule jamais automatiquement vers l'étape
    // Pictural — le manipulable reste affiché avec son propre feedback
    // (bandeau, animation de recalage…) jusqu'à ce que l'élève clique sur
    // « Continuer ». Voir le bouton sous ManipulativeComponent ci-dessous.
  }
```
par :
```js
  const handleValidate = async (result) => {
    const duree = Math.round((Date.now() - startTime) / 1000)

    if (isSeries) {
      const itemResult = {
        kind: seriesItems[currentItemIndex]?.kind,
        correct: result.correct,
        attempts: result.attempts,
        solutionShown: result.solutionShown || false,
      }
      const updatedResults = [...seriesResults, itemResult]
      setSeriesResults(updatedResults)

      // N'avance jamais avant la fin de l'animation du manipulable (revealMs),
      // avec un plancher pour laisser le temps de voir un succès immédiat.
      const waitMs = Math.max(result.revealMs || 0, 1200)
      setTimeout(() => {
        if (currentItemIndex + 1 < seriesItemCount) {
          setCurrentItemIndex((i) => i + 1)
        } else {
          finishSeries(updatedResults, duree)
        }
      }, waitMs)
      return
    }

    setManipResult({ ...result, duree })
    if (!exercise?.config?.cpaMode) {
      setValidated(true)
      if (ttsEnabled) speak(encouragement)
      await saveSession(result, duree)
    }
    // En mode CPA : on ne bascule jamais automatiquement vers l'étape
    // Pictural — le manipulable reste affiché avec son propre feedback
    // (bandeau, animation de recalage…) jusqu'à ce que l'élève clique sur
    // « Continuer ». Voir le bouton sous ManipulativeComponent ci-dessous.
  }

  const finishSeries = async (results, duree) => {
    const score = results.filter((r) => r.correct === true).length
    const total = results.length
    setSeriesDone(true)
    setValidated(true)
    if (ttsEnabled) speak(`Série terminée : ${score} sur ${total}.`)
    await saveSession({ score, total, items: results }, duree, score === total)
  }
```

- [ ] **Step 6: Passer la config fusionnée et forcer le remontage par item**

Remplacer :
```jsx
          <ManipulativeComponent
            manipulative={exercise.manipulative}
            config={exercise.config || {}}
            onValidate={handleValidate}
          />
```
par :
```jsx
          <ManipulativeComponent
            key={isSeries ? currentItemIndex : 'single'}
            manipulative={exercise.manipulative}
            config={currentConfig}
            onValidate={handleValidate}
          />
```

- [ ] **Step 7: Masquer le manipulable une fois la série terminée, sans changer le comportement mono-item**

Remplacer :
```jsx
      {/* Manipulative — phase Concret */}
      {prenomConfirmed && cpaPhase === 'concret' && (
```
par :
```jsx
      {/* Manipulative — phase Concret */}
      {prenomConfirmed && cpaPhase === 'concret' && !(isSeries && seriesDone) && (
```

- [ ] **Step 8: En-tête de progression**

Juste avant le commentaire `{/* Manipulative — phase Concret */}`, ajouter :
```jsx
      {/* Progression de série */}
      {isSeries && prenomConfirmed && !seriesDone && (
        <div className="mb-4 text-center">
          <span className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Item {currentItemIndex + 1} / {seriesItemCount}
          </span>
        </div>
      )}

```

- [ ] **Step 9: Écran de fin de série distinct du bandeau mono-item**

Remplacer :
```jsx
      {/* Post-validation feedback */}
      {validated && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700 mb-2">{encouragement}</p>
          {exercise.config?.cpaMode && cpaAbstractInput && !focusMode && (
            <p className="text-gray-600 text-sm mb-2">
              Ta notation : <span className="font-mono font-bold text-purple-700">{cpaAbstractInput}</span>
            </p>
          )}
          {!focusMode && (
            <p className="text-green-600 text-sm">
              Ton enseignant·e pourra voir ta réponse dans le tableau de bord.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 py-2 px-4 rounded-xl hover:bg-green-100 transition-colors min-h-[44px]"
          >
            Recommencer
          </button>
        </div>
      )}
```
par :
```jsx
      {/* Post-validation feedback */}
      {validated && isSeries && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700 mb-2">
            Série terminée : {seriesResults.filter((r) => r.correct === true).length} / {seriesResults.length}
          </p>
          {!focusMode && (
            <p className="text-green-600 text-sm">
              Ton enseignant·e pourra voir le détail de tes réponses dans le tableau de bord.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 py-2 px-4 rounded-xl hover:bg-green-100 transition-colors min-h-[44px]"
          >
            Recommencer
          </button>
        </div>
      )}
      {validated && !isSeries && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-xl font-bold text-green-700 mb-2">{encouragement}</p>
          {exercise.config?.cpaMode && cpaAbstractInput && !focusMode && (
            <p className="text-gray-600 text-sm mb-2">
              Ta notation : <span className="font-mono font-bold text-purple-700">{cpaAbstractInput}</span>
            </p>
          )}
          {!focusMode && (
            <p className="text-green-600 text-sm">
              Ton enseignant·e pourra voir ta réponse dans le tableau de bord.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-sm text-green-600 hover:text-green-800 border border-green-300 hover:border-green-500 py-2 px-4 rounded-xl hover:bg-green-100 transition-colors min-h-[44px]"
          >
            Recommencer
          </button>
        </div>
      )}
```

- [ ] **Step 10: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built` sans erreur.

- [ ] **Step 11: Commit**

```bash
git add src/pages/StudentView.jsx
git commit -m "Lot B / T5 : StudentView — boucle de série

Résout les items (lus en mode fixe, générés en mode aléatoire),
fusionne l'override par item sur la config de base, force le
remontage du manipulable par item (key), auto-avance en attendant
max(revealMs, 1200)ms, écran de fin dédié avec score. Le mono-item
existant est inchangé (chemin isSeries=false strictement identique
au comportement actuel)."
```

---

## Task 6 : Dashboard — score et détail dépliable

**Files:**
- Modify: `src/pages/Dashboard.jsx`

- [ ] **Step 1: Importer Fragment et les labels de kind**

Remplacer :
```js
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'
```
par :
```js
import { useState, useEffect, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAccessibility } from '../contexts/AccessibilityContext.jsx'
import { KIND_LABELS } from '../lib/seriesGenerators.js'
```

- [ ] **Step 2: État d'expansion des détails de série**

Après la ligne actuelle :
```js
  const [sharedIds, setSharedIds] = useState(new Set()) // exercise ids already in gallery
```
ajouter :
```js
  const [sharedIds, setSharedIds] = useState(new Set()) // exercise ids already in gallery
  const [expandedSessions, setExpandedSessions] = useState(new Set())
```

- [ ] **Step 3: Fonction de bascule**

Après la fonction `toggleSharePanel` existante (juste avant `handleShare`), ajouter :
```js

  const toggleSessionDetail = (sessionId) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }
```

- [ ] **Step 4: Afficher le score et le détail dépliable**

Remplacer :
```jsx
                              <tbody>
                                {sessions.map((s) => (
                                  <tr key={s.id} className="border-b border-gray-100 last:border-0">
                                    <td className="py-2 pr-4 text-gray-800 font-medium">
                                      {s.prenom_eleve || <span className="text-gray-400 italic">Anonyme</span>}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {s.correct === true && <span className="text-green-600 font-bold">✓ Correct</span>}
                                      {s.correct === false && <span className="text-amber-600 font-bold">✗ À revoir</span>}
                                      {s.correct === null && <span className="text-gray-400">Libre</span>}
                                    </td>
                                    <td className="py-2 pr-4 text-gray-500">
                                      {s.duree_secondes != null ? `${s.duree_secondes}s` : '—'}
                                    </td>
                                    <td className="py-2 text-gray-400 text-xs">
                                      {new Date(s.created_at).toLocaleDateString('fr-BE', {
                                        day: '2-digit', month: '2-digit', year: '2-digit',
                                        hour: '2-digit', minute: '2-digit',
                                      })}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
```
par :
```jsx
                              <tbody>
                                {sessions.map((s) => {
                                  const isSeriesSession = s.reponse && typeof s.reponse === 'object' && Array.isArray(s.reponse.items)
                                  const isExpanded = expandedSessions.has(s.id)
                                  return (
                                    <Fragment key={s.id}>
                                      <tr className="border-b border-gray-100 last:border-0">
                                        <td className="py-2 pr-4 text-gray-800 font-medium">
                                          {s.prenom_eleve || <span className="text-gray-400 italic">Anonyme</span>}
                                        </td>
                                        <td className="py-2 pr-4">
                                          {isSeriesSession ? (
                                            <button
                                              onClick={() => toggleSessionDetail(s.id)}
                                              className="font-bold text-blue-600 hover:underline"
                                            >
                                              {s.reponse.score} / {s.reponse.total} {isExpanded ? '▲' : '▼'}
                                            </button>
                                          ) : (
                                            <>
                                              {s.correct === true && <span className="text-green-600 font-bold">✓ Correct</span>}
                                              {s.correct === false && <span className="text-amber-600 font-bold">✗ À revoir</span>}
                                              {s.correct === null && <span className="text-gray-400">Libre</span>}
                                            </>
                                          )}
                                        </td>
                                        <td className="py-2 pr-4 text-gray-500">
                                          {s.duree_secondes != null ? `${s.duree_secondes}s` : '—'}
                                        </td>
                                        <td className="py-2 text-gray-400 text-xs">
                                          {new Date(s.created_at).toLocaleDateString('fr-BE', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit',
                                          })}
                                        </td>
                                      </tr>
                                      {isSeriesSession && isExpanded && (
                                        <tr>
                                          <td colSpan={4} className="pb-3">
                                            <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs space-y-1">
                                              {s.reponse.items.map((it, idx) => (
                                                <div key={idx} className="flex items-center justify-between gap-2">
                                                  <span className="text-gray-500">
                                                    #{idx + 1} — {KIND_LABELS[it.kind] || it.kind || '—'}
                                                  </span>
                                                  <span className={it.correct ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                                                    {it.correct ? '✓' : '✗'}
                                                  </span>
                                                </div>
                                              ))}
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  )
                                })}
                              </tbody>
```

- [ ] **Step 5: Vérifier le build**

Run: `npx vite build`
Expected: `✓ built` sans erreur.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.jsx
git commit -m "Lot B / T6 : Dashboard — score et détail dépliable pour les séries

Les sessions de série affichent un score (6/8, cliquable) au lieu du
badge correct/incorrect binaire ; un détail par item (kind + juste/faux)
se déplie en dessous. Les sessions mono-item existantes sont inchangées.
mathip_sessions.correct == (score === total) permet au graphique et à
l'export PDF existants de continuer à fonctionner sans modification."
```

---

## Task 7 : Vérification finale et push

**Files:** aucun (vérification uniquement)

- [ ] **Step 1: Build complet**

Run: `npx vite build`
Expected: `✓ built` sans erreur.

- [ ] **Step 2: Test navigateur bout-en-bout avec un item démo temporaire**

Ajouter temporairement une entrée à `DEMO_CONFIGS` dans `src/pages/StudentView.jsx` :
```js
  'demo-serie-test': {
    titre: 'TEST — Série Horloge',
    consigne: 'Test temporaire, à retirer avant commit.',
    manipulative: 'horloge',
    config: {
      mode: 'placer', granularity: 30,
      seriesMode: 'fixe', itemCount: 3,
      items: [
        { kind: 'heure-pleine', targetTime: { h: 3, m: 0 } },
        { kind: 'demie', targetTime: { h: 7, m: 30 } },
        { kind: 'heure-pleine', targetTime: { h: 10, m: 0 } },
      ],
      showSolutionAfterAttempts: 2,
    },
  },
```
Lancer `npx vite --port 5191`, ouvrir `/exercice/demo-serie-test`, vérifier :
- En-tête « Item 1 / 3 » visible.
- Cliquer Valider sans bouger les aiguilles (loin de 3h00) → l'indice s'affiche,
  aucune avance.
- Cliquer Valider une 2e fois → révélation (aiguilles se recalent lentement),
  **puis** avance automatique vers « Item 2 / 3 » une fois l'animation terminée
  (pas avant).
- Répéter jusqu'au 3e item, le résoudre → écran de fin « Série terminée : x / 3 ».
- Retirer l'entrée `demo-serie-test` de `DEMO_CONFIGS` avant de committer quoi que
  ce soit (ne jamais laisser un item de test dans le code committé).

- [ ] **Step 3: Non-régression mono-item**

Ouvrir `/exercice/demo-horloge` (route démo existante, mono-item, inchangée),
vérifier que le comportement Lot A (indice, réessai, révélation, recalage) est
identique à avant ce Lot B.

- [ ] **Step 4: Vérifier qu'aucun changement temporaire ne traîne**

Run: `git status --short`
Expected: aucune modification non committée (l'entrée `demo-serie-test` doit avoir
été retirée au Step 2).

- [ ] **Step 5: Push**

```bash
git push origin main
```

(Demander confirmation à l'utilisateur avant ce push, comme pour les lots
précédents — ne pas pousser automatiquement sans son accord explicite.)
