# Lot A — Cycle indice / réessai / révélation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Généraliser aux 7 manipulables « notables » de Mathipulatifs PLAI le cycle « réponse fausse → indice spécifique → réessai → après N échecs, révélation lente de la solution » que `Base10Blocks` possède déjà, pour qu'aucun élève ne reste bloqué et que chaque item se résolve toujours.

**Architecture :** Un contrat unique, piloté par deux réglages déjà existants dans `Base10Blocks` (`allowMultipleAttempts`, `showSolutionAfterAttempts`), appliqué à 5 composants qui en manquent (`NumberLine`, `CuisenaireRods`, `TenFrames`, `HundredChart`, `Money`) + alignement de `Clock` (révélation automatique au lieu d'un bouton opt-in) + exposition des deux réglages dans l'écran de création pour les 7 manipulables. Aucune migration de base de données.

**Tech Stack :** React 18 + Vite 5 + Tailwind CSS v3. **Aucun framework de test dans ce projet** (voir `package.json`) — ne pas en introduire. Vérification = `npx vite build` + test manuel navigateur sur les routes démo publiques.

---

## Contrat unifié (à respecter dans chaque composant)

Lu depuis `config`, avec ces défauts exacts :

```js
const {
  allowMultipleAttempts = true,
  showSolutionAfterAttempts = 2,   // 0 = ne jamais révéler automatiquement
} = config
```

État additionnel à ajouter dans chaque composant :

```js
const [attempts, setAttempts] = useState(0)
const [hint, setHint] = useState(null)
const [solutionShown, setSolutionShown] = useState(false)
const revealTimer = useRef(null)

useEffect(() => () => clearTimeout(revealTimer.current), [])
```

Comportement à la validation :

- **Pas de cible** (exploration libre) → `onValidate({ ...résultat, correct: null })`, verrouillage. Inchangé.
- **Réponse juste** → `onValidate({ ...résultat, correct: true, attempts: attempts + 1 })`, verrouillage.
- **Réponse fausse** :
  - `attempts` passe à `n = attempts + 1`
  - si `allowMultipleAttempts === false` → `onValidate({ ...résultat, correct: false, attempts: n })`, verrouillage immédiat
  - sinon → un **indice spécifique** s'affiche, **rien n'est verrouillé**, `onValidate` **n'est PAS appelé**, l'élève réessaie
    - si `showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts` → révélation (ci-dessous)

**Révélation en deux temps** (motif validé sur `Clock`) : la réponse de l'élève reste affichée ~2 s, puis la solution apparaît par une transition lente. `onValidate` est appelé **avec le résultat de l'élève** (pas avec la solution) plus `solutionShown: true`.

```js
const revealSolution = (n, studentResult) => {
  setValidated(true)
  setSolutionShown(true)
  if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
  revealTimer.current = setTimeout(() => {
    // ... applique la solution à l'état du composant (spécifique à chacun)
  }, 2000)
}
```

**Important :** `onValidate` est appelé **immédiatement** (pas dans le `setTimeout`) pour que la session soit enregistrée même si l'élève quitte la page pendant l'animation.

---

## File Structure

**Modifiés (6 composants) :**
- `src/components/manipulatives/TenFrames.jsx` — cycle + indice « il t'en manque N »
- `src/components/manipulatives/CuisenaireRods.jsx` — cycle + indice d'écart + révélation gloutonne
- `src/components/manipulatives/Money.jsx` — cycle + indice suggérant une pièce + révélation gloutonne
- `src/components/manipulatives/NumberLine.jsx` — cycle + indice directionnel + `targetValue` configurable + révélation animée
- `src/components/manipulatives/HundredChart.jsx` — cycle + indice manquants/en trop + suppression du bouton de révélation gratuit + correction du bandeau de résultat
- `src/components/manipulatives/Clock.jsx` — révélation automatique au seuil (remplace le bouton opt-in)

**Modifié (1 page) :**
- `src/pages/ExerciseCreate.jsx` — bloc « Aide à l'élève » commun aux 7 manipulables + champ cible pour la Droite numérique

**Inchangés :** `Base10Blocks.jsx` (possède déjà le contrat, seul son défaut passe de 3 à 2), `FractionBars.jsx` (hors périmètre), `StudentView.jsx`, `Dashboard.jsx`, base de données.

---

## Task 1 : TenFrames — le cycle de référence

**Files:**
- Modify: `src/components/manipulatives/TenFrames.jsx`

- [ ] **Step 1 : Remplacer l'en-tête du composant (imports + état + config)**

Remplacer la ligne 1 :
```jsx
import { useState } from 'react'
```
par :
```jsx
import { useState, useRef, useEffect } from 'react'
```

Remplacer le bloc de destructuration et d'état (lignes ~10-23) :
```jsx
export default function TenFrames({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    frames = 1,           // 1 = cadre simple (0–10), 2 = double cadre (0–20)
    targetNumber,
    counterColor = 'red',
    showCounter = true,
  } = config

  const totalCells = frames * 10
  const [filled, setFilled] = useState(new Set())
  const [validated, setValidated] = useState(false)

  const count = filled.size
```
par :
```jsx
export default function TenFrames({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    frames = 1,           // 1 = cadre simple (0–10), 2 = double cadre (0–20)
    targetNumber,
    counterColor = 'red',
    showCounter = true,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config

  const totalCells = frames * 10
  const [filled, setFilled] = useState(new Set())
  const [validated, setValidated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  const count = filled.size
  const hasTarget = targetNumber !== undefined && targetNumber !== null
```

- [ ] **Step 2 : Remplacer `handleValidate` par le cycle complet**

Remplacer intégralement (lignes ~34-48) :
```jsx
  const handleValidate = () => {
    setValidated(true)
    const correct = targetNumber !== undefined ? count === targetNumber : null
    const result = { count, filled: [...filled], correct, targetNumber }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${count}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. La cible était ${targetNumber}.`
      )
    }
  }
```
par :
```jsx
  const buildHint = () => {
    const diff = targetNumber - count
    if (diff > 0) return `Tu as rempli ${count} cercle${count > 1 ? 's' : ''}. Il t'en manque ${diff}.`
    return `Tu as rempli ${count} cercles. C'est ${-diff} de trop.`
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : voici ${targetNumber}.`)
    // Laisse l'élève voir sa réponse ~2 s, puis affiche la bonne.
    revealTimer.current = setTimeout(() => {
      setFilled(new Set(Array.from({ length: targetNumber }, (_, i) => i)))
    }, 2000)
  }

  const handleValidate = () => {
    const studentResult = { count, filled: [...filled], targetNumber }

    // Exploration libre : pas de cible, on enregistre et on verrouille.
    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`Total : ${count}`)
      return
    }

    const n = attempts + 1
    setAttempts(n)

    if (count === targetNumber) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    // Réponse fausse.
    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak(`Pas tout à fait. La cible était ${targetNumber}.`)
      return
    }

    const msg = buildHint()
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }
```

- [ ] **Step 3 : Remplacer le calcul `isCorrect` (il doit refléter la validation, pas l'état courant)**

Remplacer la ligne ~50 :
```jsx
  const isCorrect = targetNumber !== undefined ? count === targetNumber : null
```
par :
```jsx
  // Après révélation, `filled` contient la solution : on ne doit pas afficher « correct ».
  const isCorrect = !hasTarget ? null : solutionShown ? false : count === targetNumber
```

- [ ] **Step 4 : Ajouter le bloc d'indice et adapter le bandeau final dans le JSX**

Remplacer le bloc de validation et de feedback (lignes ~164-188) :
```jsx
      {/* Validation */}
      {!validated && (
        <button
          onClick={handleValidate}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}

      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            isCorrect === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : isCorrect === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {isCorrect === true && `✓ Correct ! ${count} cercles remplis`}
          {isCorrect === false && `Tu as rempli ${count} cases — Cible : ${targetNumber}`}
          {isCorrect === null && `Total : ${count} cercles remplis`}
        </div>
      )}
```
par :
```jsx
      {/* Indice après une réponse fausse — l'élève peut réessayer */}
      {hint && !validated && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}

      {/* Validation */}
      {!validated && (
        <button
          onClick={handleValidate}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}

      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            isCorrect === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : isCorrect === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {isCorrect === true && `✓ Correct ! ${count} cercles remplis`}
          {solutionShown && `Voici ${targetNumber} — regarde bien le cadre.`}
          {isCorrect === false && !solutionShown && `Tu as rempli ${count} cases — Cible : ${targetNumber}`}
          {isCorrect === null && `Total : ${count} cercles remplis`}
        </div>
      )}
```

- [ ] **Step 5 : Vérifier le build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 6 : Vérification manuelle navigateur**

Démarrer le serveur **explicitement depuis le répertoire du projet** (piège connu : les lanceurs par nom peuvent servir un autre checkout) :
`cd projets/mathipulatifs-plai && npx vite --port 5210 --strictPort`

Aller sur `http://localhost:5210/exercice/demo-cadres10` (cible = 7, route publique, pas d'auth).
- Remplir 5 cercles → Valider → attendu : indice « Tu as rempli 5 cercles. Il t'en manque 2. », **rien n'est verrouillé**, on peut continuer à cliquer.
- Valider une 2ᵉ fois sans corriger → attendu : après ~2 s, le cadre se remplit tout seul à 7 cercles, bandeau « Voici 7 — regarde bien le cadre. », tout est verrouillé.
- Recharger, remplir exactement 7 → Valider → attendu : « ✓ Correct ! 7 cercles remplis » immédiatement.

Arrêter le serveur ensuite.

- [ ] **Step 7 : Commit**

```bash
git add src/components/manipulatives/TenFrames.jsx
git commit -m "Cadres à 10 : cycle indice / réessai / révélation automatique"
```

---

## Task 2 : CuisenaireRods

**Files:**
- Modify: `src/components/manipulatives/CuisenaireRods.jsx`

- [ ] **Step 1 : Imports + état + config**

Remplacer la ligne 1 :
```jsx
import { useState } from 'react'
```
par :
```jsx
import { useState, useRef, useEffect } from 'react'
```

Remplacer le bloc d'état (lignes ~78-86) :
```jsx
export default function CuisenaireRods({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const { targetNumber, showCounter = true, showUnits: showUnitsInit = false } = config

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)
  const [showUnits, setShowUnits] = useState(showUnitsInit)

  const total = workspace.reduce((sum, v) => sum + v, 0)
```
par :
```jsx
/** Décomposition gloutonne : les plus grandes réglettes d'abord (max 10). */
function greedyRods(target) {
  const out = []
  let rest = target
  while (rest > 0) {
    const v = Math.min(10, rest)
    out.push(v)
    rest -= v
  }
  return out
}

export default function CuisenaireRods({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    targetNumber,
    showCounter = true,
    showUnits: showUnitsInit = false,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)
  const [showUnits, setShowUnits] = useState(showUnitsInit)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  const total = workspace.reduce((sum, v) => sum + v, 0)
  const hasTarget = targetNumber !== undefined && targetNumber !== null
```

- [ ] **Step 2 : Remplacer `handleValidate` par le cycle complet**

Remplacer intégralement (lignes ~98-112) :
```jsx
  const handleValidate = () => {
    setValidated(true)
    const correct = targetNumber !== undefined ? total === targetNumber : null
    const result = { total, workspace, correct, targetNumber }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${total}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. La cible était ${targetNumber}.`
      )
    }
  }
```
par :
```jsx
  const buildHint = () => {
    const diff = targetNumber - total
    if (diff > 0) return `Ton total fait ${total}. Il te manque ${diff} pour atteindre ${targetNumber}.`
    return `Ton total fait ${total}. C'est ${-diff} de trop.`
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : voici une façon de faire ${targetNumber}.`)
    // Laisse l'élève voir sa réponse ~2 s, puis compose une solution valide.
    revealTimer.current = setTimeout(() => {
      setWorkspace(greedyRods(targetNumber))
    }, 2000)
  }

  const handleValidate = () => {
    const studentResult = { total, workspace, targetNumber }

    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`Total : ${total}`)
      return
    }

    const n = attempts + 1
    setAttempts(n)

    if (total === targetNumber) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak(`Pas tout à fait. La cible était ${targetNumber}.`)
      return
    }

    const msg = buildHint()
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }
```

- [ ] **Step 3 : Corriger `isCorrect`**

Remplacer la ligne ~114 :
```jsx
  const isCorrect = targetNumber !== undefined ? total === targetNumber : null
```
par :
```jsx
  // Après révélation, `workspace` contient la solution : on ne doit pas afficher « correct ».
  const isCorrect = !hasTarget ? null : solutionShown ? false : total === targetNumber
```

- [ ] **Step 4 : Indice + bandeau final dans le JSX**

Remplacer le bloc de validation/feedback (lignes ~216-240) :
```jsx
          {!validated && (
            <button
              onClick={handleValidate}
              disabled={workspace.length === 0}
              className="mt-3 w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Valider
            </button>
          )}

          {validated && (
            <div
              className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
                isCorrect === true
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : isCorrect === false
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCorrect === true && `✓ Correct ! Total = ${total}`}
              {isCorrect === false && `Total : ${total} — Cible : ${targetNumber}`}
              {isCorrect === null && `Total : ${total}`}
            </div>
          )}
```
par :
```jsx
          {hint && !validated && (
            <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">💡</span>
                <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
              </div>
            </div>
          )}

          {!validated && (
            <button
              onClick={handleValidate}
              disabled={workspace.length === 0}
              className="mt-3 w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Valider
            </button>
          )}

          {validated && (
            <div
              className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
                isCorrect === true
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : isCorrect === false
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCorrect === true && `✓ Correct ! Total = ${total}`}
              {solutionShown && `Voici une façon de faire ${targetNumber} — il en existe d'autres !`}
              {isCorrect === false && !solutionShown && `Total : ${total} — Cible : ${targetNumber}`}
              {isCorrect === null && `Total : ${total}`}
            </div>
          )}
```

- [ ] **Step 5 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 6 : Vérification manuelle**

Serveur depuis le répertoire du projet, puis `http://localhost:5210/exercice/demo-cuisenaire` (cible = 10).
- Poser une réglette de 7 → Valider → attendu : « Ton total fait 7. Il te manque 3 pour atteindre 10. », rien de verrouillé.
- Valider une 2ᵉ fois sans corriger → attendu : après ~2 s l'espace se remplit d'une décomposition valide (10), bandeau « Voici une façon de faire 10 — il en existe d'autres ! », verrouillé.
- Recharger, composer exactement 10 → « ✓ Correct ! Total = 10 ».

- [ ] **Step 7 : Commit**

```bash
git add src/components/manipulatives/CuisenaireRods.jsx
git commit -m "Réglettes Cuisenaire : cycle indice / réessai / révélation automatique"
```

---

## Task 3 : Money

**Files:**
- Modify: `src/components/manipulatives/Money.jsx`

- [ ] **Step 1 : Imports + helper glouton + état**

Remplacer la ligne 1 :
```jsx
import { useState, useMemo } from 'react'
```
par :
```jsx
import { useState, useMemo, useRef, useEffect } from 'react'
```

Juste **après** la fonction `formatCents` (qui se termine par sa dernière accolade avant `function CoinShape`), insérer :
```jsx
/** Composition gloutonne exacte : les plus grosses valeurs d'abord.
 *  La pièce de 1 centime est toujours disponible, donc le reste tombe à 0. */
function greedyCoins(target, denoms) {
  const out = []
  let rest = target
  const desc = [...denoms].sort((a, b) => b.value - a.value)
  for (const d of desc) {
    while (rest >= d.value) {
      out.push(d.value)
      rest -= d.value
    }
  }
  return out
}
```

Remplacer le bloc de destructuration et d'état (lignes ~71-79 du fichier actuel) :
```jsx
export default function Money({ config = {}, onValidate }) {
  const { mode = 'composer', targetAmount, price, paid, maxDenomination = 500 } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const availableDenoms = useMemo(() => DENOMS.filter((d) => d.value <= maxDenomination), [maxDenomination])

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)
```
par :
```jsx
export default function Money({ config = {}, onValidate }) {
  const {
    mode = 'composer',
    targetAmount,
    price,
    paid,
    maxDenomination = 500,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const availableDenoms = useMemo(() => DENOMS.filter((d) => d.value <= maxDenomination), [maxDenomination])

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])
```

- [ ] **Step 2 : Remplacer `handleValidate` par le cycle complet**

Remplacer intégralement (lignes ~113-127 du fichier actuel) :
```jsx
  const handleValidate = () => {
    setValidated(true)
    const correct = hasTarget ? total === target : null
    const result = { total, workspace, correct, target }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `Total : ${formatCents(total)}`
          : correct
          ? 'Bonne réponse !'
          : `Pas tout à fait. Il fallait ${formatCents(target)}.`
      )
    }
  }
```
par :
```jsx
  const buildHint = () => {
    const gap = target - total
    if (gap > 0) {
      // Suggère la plus grosse pièce/billet disponible qui tienne dans l'écart.
      const suggestion = [...availableDenoms].sort((a, b) => b.value - a.value).find((d) => d.value <= gap)
      if (suggestion) {
        const article = suggestion.type === 'billet' ? 'un billet de' : 'une pièce de'
        return `Il te manque ${formatCents(gap)} — essaie d'ajouter ${article} ${suggestion.spoken}.`
      }
      return `Il te manque ${formatCents(gap)}.`
    }
    return `Tu as ${formatCents(-gap)} de trop — retire une pièce ou un billet.`
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : voici une façon de faire ${formatCents(target)}.`)
    // Laisse l'élève voir sa réponse ~2 s, puis compose une solution valide.
    revealTimer.current = setTimeout(() => {
      setWorkspace(greedyCoins(target, availableDenoms))
    }, 2000)
  }

  const handleValidate = () => {
    const studentResult = { total, workspace, target }

    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`Total : ${formatCents(total)}`)
      return
    }

    const n = attempts + 1
    setAttempts(n)

    if (total === target) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak(`Pas tout à fait. Il fallait ${formatCents(target)}.`)
      return
    }

    const msg = buildHint()
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }
```

- [ ] **Step 3 : Corriger `isCorrect`**

Remplacer la ligne ~129 :
```jsx
  const isCorrect = hasTarget ? total === target : null
```
par :
```jsx
  // Après révélation, `workspace` contient la solution : on ne doit pas afficher « correct ».
  const isCorrect = !hasTarget ? null : solutionShown ? false : total === target
```

- [ ] **Step 4 : Indice + bandeau final dans le JSX**

Remplacer le bloc de validation/feedback final (le `{!validated && (<button ... Valider ...)}` et le `{validated && (<div ... isCorrect ...)}` situés dans la colonne de droite) :
```jsx
          {!validated && (
            <button
              onClick={handleValidate}
              disabled={workspace.length === 0}
              className="mt-3 w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Valider
            </button>
          )}

          {validated && (
            <div
              className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
                isCorrect === true
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : isCorrect === false
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCorrect === true && `✓ Correct ! Total = ${formatCents(total)}`}
              {isCorrect === false && `Total : ${formatCents(total)} — Attendu : ${formatCents(target)}`}
              {isCorrect === null && `Total : ${formatCents(total)}`}
            </div>
          )}
```
par :
```jsx
          {hint && !validated && (
            <div className="mt-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">💡</span>
                <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
              </div>
            </div>
          )}

          {!validated && (
            <button
              onClick={handleValidate}
              disabled={workspace.length === 0}
              className="mt-3 w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors min-h-[44px]"
            >
              Valider
            </button>
          )}

          {validated && (
            <div
              className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
                isCorrect === true
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : isCorrect === false
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {isCorrect === true && `✓ Correct ! Total = ${formatCents(total)}`}
              {solutionShown && `Voici une façon de faire ${formatCents(target)} — il en existe d'autres !`}
              {isCorrect === false && !solutionShown && `Total : ${formatCents(total)} — Attendu : ${formatCents(target)}`}
              {isCorrect === null && `Total : ${formatCents(total)}`}
            </div>
          )}
```

- [ ] **Step 5 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 6 : Vérification manuelle**

`http://localhost:5210/exercice/demo-monnaie` (cible = 3,50 €).
- Ajouter une pièce de 1 € → Valider → attendu : « Il te manque 2,50 € — essaie d'ajouter une pièce de 2 euros. », rien de verrouillé, la jauge reste visible.
- Valider une 2ᵉ fois sans corriger → attendu : après ~2 s l'espace se remplit d'une composition exacte de 3,50 € (2 € + 1 € + 50 c), bandeau « Voici une façon de faire 3,50 € — il en existe d'autres ! ».
- Recharger, composer exactement 3,50 € → « ✓ Correct ! Total = 3,50 € ».

- [ ] **Step 7 : Commit**

```bash
git add src/components/manipulatives/Money.jsx
git commit -m "Monnaie : cycle indice / réessai / révélation automatique"
```

---

## Task 4 : NumberLine (+ cible configurable)

**Files:**
- Modify: `src/components/manipulatives/NumberLine.jsx`

- [ ] **Step 1 : Config `targetValue` + état du cycle**

Remplacer le bloc d'ouverture (lignes ~4-25) :
```jsx
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
```
par :
```jsx
export default function NumberLine({ config = {}, onValidate }) {
  const {
    min = 0,
    max = 20,
    step = 1,
    showLabels = true,
    mode = 'libre',
    targetValue,                    // cible imposée par l'enseignant (optionnelle)
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config
  const { dyslexicFont, largeText, focusMode, ttsEnabled, speak } = useAccessibility()

  const ticks = []
  for (let v = min; v <= max; v += step) ticks.push(v)

  const [currentValue, setCurrentValue] = useState(min)
  const [isDragging, setIsDragging] = useState(false)
  const [validated, setValidated] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const [revealing, setRevealing] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  // Cible : celle de l'enseignant si fournie (recalée sur la graduation la plus
  // proche), sinon tirage au hasard comme avant.
  const [target] = useState(() => {
    if (mode !== 'placer') return null
    if (targetValue !== undefined && targetValue !== null) {
      return ticks.reduce((best, t) => (Math.abs(t - targetValue) < Math.abs(best - targetValue) ? t : best), ticks[0])
    }
    const idx = Math.floor(Math.random() * ticks.length)
    return ticks[idx]
  })
```

Note : `useRef` et `useEffect` sont **déjà importés** en ligne 1 de ce fichier (`import { useState, useRef, useEffect, useCallback } from 'react'`) — ne rien changer aux imports.

- [ ] **Step 2 : Remplacer `handleValidate` par le cycle complet**

Remplacer intégralement (lignes ~110-118) :
```jsx
  const handleValidate = () => {
    const isCorrect = mode === 'placer' ? currentValue === target : true
    setValidated(true)
    setFeedback(isCorrect)
    if (onValidate) onValidate({ value: currentValue, target, correct: isCorrect })
    if (ttsEnabled) {
      speak(isCorrect ? 'Bravo, c\'est correct !' : `Pas tout à fait. La réponse était ${target}.`)
    }
  }
```
par :
```jsx
  const buildHint = () => {
    const direction = currentValue < target ? 'à droite' : 'à gauche'
    return `Tu es sur ${currentValue}. Le nombre ${target} est plus ${direction}.`
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setFeedback(false)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : ${target} est ici.`)
    // Laisse l'élève voir sa réponse ~2 s, puis fait glisser lentement le jeton.
    revealTimer.current = setTimeout(() => {
      setRevealing(true)
      setCurrentValue(target)
    }, 2000)
  }

  const handleValidate = () => {
    const studentResult = { value: currentValue, target }

    // Mode libre : pas de cible.
    if (mode !== 'placer') {
      setValidated(true)
      setFeedback(null)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`Tu es sur ${currentValue}`)
      return
    }

    const n = attempts + 1
    setAttempts(n)

    if (currentValue === target) {
      setValidated(true)
      setFeedback(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, c\'est correct !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      setFeedback(false)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak(`Pas tout à fait. La réponse était ${target}.`)
      return
    }

    const msg = buildHint()
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }
```

- [ ] **Step 3 : Réinitialiser aussi le cycle dans `handleReset`**

Remplacer (lignes ~120-124) :
```jsx
  const handleReset = () => {
    setCurrentValue(min)
    setValidated(false)
    setFeedback(null)
  }
```
par :
```jsx
  const handleReset = () => {
    clearTimeout(revealTimer.current)
    setCurrentValue(min)
    setValidated(false)
    setFeedback(null)
    setHint(null)
    setAttempts(0)
    setSolutionShown(false)
    setRevealing(false)
  }
```

- [ ] **Step 4 : Animer le jeton lors de la révélation**

Le jeton est aujourd'hui dessiné avec des coordonnées absolues, non animables. L'envelopper dans un groupe translaté (technique déjà utilisée dans `Clock.jsx`).

Remplacer le bloc `{/* Token */}` (lignes ~241-264) :
```jsx
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
```
par :
```jsx
          {/* Token — groupe translaté pour pouvoir animer le glissement de révélation */}
          <g
            style={{
              transform: `translateX(${tokenX}px)`,
              // Pendant le glissement : aucune latence. Révélation : lent et visible.
              transition: isDragging ? 'none' : revealing ? 'transform 2s ease-in-out' : 'transform 0.3s ease',
            }}
          >
            <circle
              cx={0}
              cy={lineY}
              r={tokenR}
              fill={validated ? (feedback ? '#22C55E' : '#EF4444') : '#3B82F6'}
              stroke="white"
              strokeWidth={3}
              style={{ filter: isDragging ? 'drop-shadow(0 4px 8px rgba(59,130,246,0.5))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
            />
            <text
              x={0}
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
```

- [ ] **Step 5 : Indice + bandeau de feedback dans le JSX**

Remplacer le bloc `{/* Feedback */}` (lignes ~289-298) :
```jsx
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
```
par :
```jsx
      {/* Indice après une réponse fausse — l'élève peut réessayer */}
      {hint && !validated && (
        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {validated && feedback !== null && (
        <div
          className={`mt-4 p-4 rounded-xl text-center font-bold text-lg ${
            feedback ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-orange-50 text-orange-700 border border-orange-300'
          }`}
        >
          {feedback && `✅ Bravo ! ${currentValue} est correct !`}
          {!feedback && solutionShown && `Voici où se trouve ${target} — regarde bien.`}
          {!feedback && !solutionShown && `Pas tout à fait. La réponse était ${target}.`}
        </div>
      )}
```

- [ ] **Step 6 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 7 : Vérification manuelle**

La route `demo-droite-numerique` est en mode `libre` : elle **ne teste pas** le cycle. Vérifier d'abord qu'elle fonctionne toujours (glisser le jeton, Valider → « Tu es sur N », pas de plantage).

Pour tester le mode `placer`, modifier **temporairement** l'entrée `demo-droite-numerique` de `DEMO_CONFIGS` dans `src/pages/StudentView.jsx` en :
```js
    config: { min: 0, max: 20, step: 1, mode: 'placer', targetValue: 14, showLabels: true },
```
Puis sur `http://localhost:5210/exercice/demo-droite-numerique` :
- Attendu : la consigne affiche « Place le nombre : 14 » (et non un nombre au hasard) → confirme que `targetValue` est pris en compte.
- Placer le jeton sur 8 → Valider → attendu : « Tu es sur 8. Le nombre 14 est plus à droite. », rien de verrouillé.
- Valider une 2ᵉ fois → attendu : après ~2 s le jeton **glisse lentement** jusqu'à 14, bandeau « Voici où se trouve 14 — regarde bien. ».
- Placer exactement sur 14 → « ✅ Bravo ! 14 est correct ! ».

**Puis RESTAURER `StudentView.jsx` à son état d'origine** (`mode: 'libre'`, sans `targetValue`) et vérifier `git status` — seul `NumberLine.jsx` doit être modifié avant le commit.

- [ ] **Step 8 : Commit**

```bash
git add src/components/manipulatives/NumberLine.jsx
git commit -m "Droite numérique : cible configurable + cycle indice / réessai / révélation"
```

---

## Task 5 : HundredChart

**Files:**
- Modify: `src/components/manipulatives/HundredChart.jsx`

- [ ] **Step 1 : Imports + état + config**

Remplacer la ligne 1 :
```jsx
import { useState } from 'react'
```
par :
```jsx
import { useState, useRef, useEffect } from 'react'
```

Remplacer le bloc d'ouverture (lignes ~11-26) :
```jsx
export default function HundredChart({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    startAt = 1,        // 1 or 0
    mode = 'libre',     // 'libre' | 'multiples'
    multipleOf,         // used when mode = 'multiples'
  } = config

  const total = 100
  const numbers = Array.from({ length: total }, (_, i) => i + startAt)

  // colored: { [number]: colorId }
  const [colored, setColored] = useState({})
  const [activeColor, setActiveColor] = useState('yellow')
  const [validated, setValidated] = useState(false)
  const [revealed, setRevealed] = useState(false)
```
par :
```jsx
export default function HundredChart({ config = {}, onValidate }) {
  const { focusMode, ttsEnabled, speak } = useAccessibility()
  const {
    startAt = 1,        // 1 or 0
    mode = 'libre',     // 'libre' | 'multiples'
    multipleOf,         // used when mode = 'multiples'
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config

  const total = 100
  const numbers = Array.from({ length: total }, (_, i) => i + startAt)

  // colored: { [number]: colorId }
  const [colored, setColored] = useState({})
  const [activeColor, setActiveColor] = useState('yellow')
  const [validated, setValidated] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [hint, setHint] = useState(null)
  const [solutionShown, setSolutionShown] = useState(false)
  const revealTimer = useRef(null)

  useEffect(() => () => clearTimeout(revealTimer.current), [])

  const hasTarget = mode === 'multiples' && !!multipleOf
  const expectedMultiples = hasTarget ? numbers.filter((n) => n !== 0 && n % multipleOf === 0) : []
```

Note : l'état `revealed` disparaît — il n'était utilisé que par le bouton de révélation gratuit, supprimé à l'étape 3.

- [ ] **Step 2 : Remplacer `clearAll`, `handleReveal` et `handleValidate`**

Remplacer intégralement (lignes ~41-80) :
```jsx
  const clearAll = () => {
    if (validated) return
    setColored({})
    setRevealed(false)
  }

  const handleReveal = () => {
    if (!multipleOf) return
    const auto = {}
    numbers.forEach((n) => {
      if (n !== 0 && n % multipleOf === 0) auto[n] = 'green'
    })
    setColored(auto)
    setRevealed(true)
  }

  const handleValidate = () => {
    setValidated(true)
    const coloredNumbers = Object.keys(colored).map(Number)
    let correct = null
    if (mode === 'multiples' && multipleOf) {
      const expected = numbers.filter((n) => n !== 0 && n % multipleOf === 0)
      const userSet = new Set(coloredNumbers)
      const expectedSet = new Set(expected)
      correct =
        userSet.size === expectedSet.size &&
        [...expectedSet].every((n) => userSet.has(n))
    }
    const result = { colored: coloredNumbers, correct, multipleOf }
    if (onValidate) onValidate(result)
    if (ttsEnabled) {
      speak(
        correct === null
          ? `${coloredNumbers.length} cases coloriées`
          : correct
          ? 'Bonne réponse !'
          : 'Pas tout à fait, regarde les multiples surlignés.'
      )
    }
  }
```
par :
```jsx
  const clearAll = () => {
    if (validated) return
    setColored({})
  }

  const buildHint = (coloredNumbers) => {
    const userSet = new Set(coloredNumbers)
    const missing = expectedMultiples.filter((n) => !userSet.has(n))
    const extra = coloredNumbers.filter((n) => n === 0 || n % multipleOf !== 0)
    const parts = []
    if (missing.length > 0) {
      parts.push(`Il te manque ${missing.length} multiple${missing.length > 1 ? 's' : ''} de ${multipleOf}.`)
    }
    if (extra.length > 0) {
      parts.push(
        `Tu as colorié ${extra.length} case${extra.length > 1 ? 's' : ''} qui ne ${extra.length > 1 ? 'sont' : 'est'} pas ${extra.length > 1 ? 'des' : 'un'} multiple${extra.length > 1 ? 's' : ''} de ${multipleOf}.`
      )
    }
    return parts.join(' ')
  }

  const revealSolution = (n, studentResult) => {
    setValidated(true)
    setSolutionShown(true)
    setHint(null)
    if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n, solutionShown: true })
    if (ttsEnabled) speak(`Regarde : voici les multiples de ${multipleOf}.`)
    // Laisse l'élève voir sa réponse ~2 s, puis colorie la bonne.
    revealTimer.current = setTimeout(() => {
      const auto = {}
      expectedMultiples.forEach((n) => { auto[n] = 'green' })
      setColored(auto)
    }, 2000)
  }

  const handleValidate = () => {
    const coloredNumbers = Object.keys(colored).map(Number)
    const studentResult = { colored: coloredNumbers, multipleOf }

    // Coloriage libre : pas de cible.
    if (!hasTarget) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: null })
      if (ttsEnabled) speak(`${coloredNumbers.length} cases coloriées`)
      return
    }

    const userSet = new Set(coloredNumbers)
    const correct =
      userSet.size === expectedMultiples.length && expectedMultiples.every((n) => userSet.has(n))

    const n = attempts + 1
    setAttempts(n)

    if (correct) {
      setValidated(true)
      setHint(null)
      if (onValidate) onValidate({ ...studentResult, correct: true, attempts: n })
      if (ttsEnabled) speak('Bravo, bonne réponse !')
      return
    }

    if (!allowMultipleAttempts) {
      setValidated(true)
      if (onValidate) onValidate({ ...studentResult, correct: false, attempts: n })
      if (ttsEnabled) speak('Pas tout à fait.')
      return
    }

    const msg = buildHint(coloredNumbers)
    setHint(msg)
    if (ttsEnabled) speak(msg)

    if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
      revealSolution(n, studentResult)
    }
  }
```

- [ ] **Step 3 : Supprimer le bouton « Révéler les multiples » (il donnait la réponse gratuitement)**

Remplacer le bloc `{/* Actions */}` (lignes ~179-197) :
```jsx
      {/* Actions */}
      {!validated && (
        <div className="flex gap-2 flex-wrap">
          {mode === 'multiples' && multipleOf && (
            <button
              onClick={handleReveal}
              className="flex-1 py-2.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold rounded-xl transition-colors min-h-[44px] text-sm"
            >
              Révéler les multiples de {multipleOf}
            </button>
          )}
          <button
            onClick={handleValidate}
            className="flex-1 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
          >
            Valider
          </button>
        </div>
      )}
```
par :
```jsx
      {/* Indice après une réponse fausse — l'élève peut réessayer */}
      {hint && !validated && (
        <div className="mb-3 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      {!validated && (
        <button
          onClick={handleValidate}
          className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors min-h-[44px]"
        >
          Valider
        </button>
      )}
```

- [ ] **Step 4 : Définir `finalCorrect` près de `coloredCount`**

Remplacer la ligne ~99 :
```jsx
  const coloredCount = Object.keys(colored).length
```
par :
```jsx
  const coloredCount = Object.keys(colored).length

  // Reflète la validation, pas l'état courant : après révélation, la grille
  // contient la solution et ne doit surtout pas s'afficher comme « correcte ».
  const finalCorrect = (() => {
    if (!hasTarget) return null
    if (solutionShown) return false
    if (!validated) return null
    const userSet = new Set(Object.keys(colored).map(Number))
    return userSet.size === expectedMultiples.length && expectedMultiples.every((n) => userSet.has(n))
  })()
```

- [ ] **Step 5 : Corriger le bandeau final (il affichait « vert » même sur une réponse fausse)**

Remplacer le bloc final (lignes ~199-213) :
```jsx
      {validated && (
        <div
          className={`p-3 rounded-xl text-center font-bold text-sm ${
            mode === 'multiples'
              ? colored && Object.keys(colored).length > 0
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {mode === 'multiples' && multipleOf
            ? `${coloredCount} multiple${coloredCount > 1 ? 's' : ''} de ${multipleOf} coloriés`
            : `${coloredCount} case${coloredCount > 1 ? 's' : ''} coloriée${coloredCount > 1 ? 's' : ''}`}
        </div>
      )}
```
par :
```jsx
      {validated && (
        <div
          className={`mt-3 p-3 rounded-xl text-center font-bold text-sm ${
            finalCorrect === true
              ? 'bg-green-50 text-green-700 border border-green-200'
              : finalCorrect === false
              ? 'bg-orange-50 text-orange-700 border border-orange-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
          }`}
        >
          {finalCorrect === true && `✓ Correct ! Tous les multiples de ${multipleOf} sont coloriés.`}
          {solutionShown && `Voici les multiples de ${multipleOf} — regarde bien la grille.`}
          {finalCorrect === false && !solutionShown && `Pas tout à fait — les multiples de ${multipleOf} ne sont pas tous corrects.`}
          {finalCorrect === null && `${coloredCount} case${coloredCount > 1 ? 's' : ''} coloriée${coloredCount > 1 ? 's' : ''}`}
        </div>
      )}
```

- [ ] **Step 6 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 7 : Vérification manuelle**

`http://localhost:5210/exercice/demo-grille100` (multiples de 5).
- Confirmer que le bouton « Révéler les multiples de 5 » **a disparu**.
- Colorier 5, 10, 15 seulement → Valider → attendu : « Il te manque 17 multiples de 5. », rien de verrouillé.
- Colorier aussi 7 (non multiple) → Valider → attendu : l'indice mentionne **et** les manquants **et** « 1 case qui n'est pas un multiple de 5 ». Ce 2ᵉ échec déclenche la révélation : après ~2 s la grille se colorie sur les 20 multiples de 5, bandeau « Voici les multiples de 5 — regarde bien la grille. ».
- Recharger, colorier exactement les 20 multiples de 5 → « ✓ Correct ! Tous les multiples de 5 sont coloriés. »

- [ ] **Step 8 : Commit**

```bash
git add src/components/manipulatives/HundredChart.jsx
git commit -m "Grille des 100 : cycle indice / réessai, révélation automatique, corrige le bandeau de résultat"
```

---

## Task 6 : Clock — révélation automatique

**Files:**
- Modify: `src/components/manipulatives/Clock.jsx`

- [ ] **Step 1 : Lire les deux réglages depuis `config`**

Remplacer la ligne ~137 :
```jsx
  const { mode = 'libre', granularity = 30, targetTime } = config
```
par :
```jsx
  const {
    mode = 'libre',
    granularity = 30,
    targetTime,
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
  } = config
```

- [ ] **Step 2 : Déclencher la révélation automatiquement au seuil**

Dans `handleValidate`, remplacer la branche « else » du mode `placer` (celle qui suit `if (okH && okM) { ... }`) :
```jsx
      } else {
        setAttempts((n) => n + 1)
        const parts = []
        if (!okM) parts.push(minuteHint(target.m))
        if (!okH) parts.push(hourHint(target.h, target.m))
        const msg = parts.join(' ')
        setHint(msg)
        if (ttsEnabled) speak(`Pas encore. ${msg}`)
      }
      return
    }
```
par :
```jsx
      } else {
        const n = attempts + 1
        setAttempts(n)

        // Mode évaluation : une seule tentative, on verrouille avec la réponse.
        if (!allowMultipleAttempts) {
          showSolution(n)
          return
        }

        const parts = []
        if (!okM) parts.push(minuteHint(target.m))
        if (!okH) parts.push(hourHint(target.h, target.m))
        const msg = parts.join(' ')
        setHint(msg)
        if (ttsEnabled) speak(`Pas encore. ${msg}`)

        // Après N échecs : on montre la réponse, l'élève n'est jamais bloqué.
        if (showSolutionAfterAttempts > 0 && n >= showSolutionAfterAttempts) {
          showSolution(n)
        }
      }
      return
    }
```

- [ ] **Step 3 : Rendre `showSolution` progressive (pause puis animation lente) et lui passer le nombre de tentatives**

Remplacer intégralement `showSolution` :
```jsx
  const showSolution = () => {
    if (onValidate) onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts, solutionShown: true })
    setHourAngle(hourAngleOf(target.h, target.m))
    setMinuteAngle(minuteAngleOf(target.m))
    setValidated(true)
    setFeedback('solution')
    setHint(null)
    if (ttsEnabled) speak(`Regarde : voici ${formatTime(target.h, target.m)}.`)
  }
```
par :
```jsx
  const showSolution = (n) => {
    setValidated(true)
    setFeedback('solution')
    setHint(null)
    if (onValidate) {
      onValidate({ placed: { h: readHours, m: readMinutes }, target, correct: false, attempts: n, solutionShown: true })
    }
    // Laisse l'élève voir sa réponse ~2 s, puis recale lentement les aiguilles.
    correctionTimer.current = setTimeout(() => {
      setCorrecting(true)
      setHourAngle(hourAngleOf(target.h, target.m))
      setMinuteAngle(minuteAngleOf(target.m))
      if (ttsEnabled) speak(`Voici ${formatTime(target.h, target.m)}.`)
    }, 2000)
  }
```

- [ ] **Step 4 : Supprimer le bouton opt-in « Montre-moi la réponse »**

Dans le bloc d'indice du JSX, remplacer :
```jsx
      {hint && !validated && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <div className="flex-1">
              <p className="font-semibold text-amber-800 text-sm">{hint}</p>
              {attempts >= 2 && (
                <button
                  onClick={showSolution}
                  className="mt-2 text-xs font-bold text-amber-700 underline hover:text-amber-900 min-h-[36px]"
                >
                  Montre-moi la réponse
                </button>
              )}
            </div>
          </div>
        </div>
      )}
```
par :
```jsx
      {hint && !validated && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">💡</span>
            <p className="font-semibold text-amber-800 text-sm flex-1" aria-live="polite">{hint}</p>
          </div>
        </div>
      )}
```

- [ ] **Step 5 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 6 : Vérification manuelle**

`http://localhost:5210/exercice/demo-horloge` (cible 2h30, départ 10h10).
- Valider sans rien bouger → attendu : indice (« La grande aiguille (bleue) doit pointer sur le 6. La petite aiguille (noire) doit être à mi-chemin entre le 2 et le 3. »), **aucun bouton « Montre-moi la réponse »**, rien de verrouillé.
- Valider une 2ᵉ fois → attendu : verrouillage immédiat + après ~2 s les aiguilles glissent lentement jusqu'à 2h30, bandeau « Voici 2h30 — regarde bien la position des deux aiguilles. ».
- Recharger, placer correctement 2h30 → « ✓ Bravo » et recalage sur la position exacte (comportement existant, non régressé).

- [ ] **Step 7 : Commit**

```bash
git add src/components/manipulatives/Clock.jsx
git commit -m "Horloge : révélation automatique après N échecs (remplace le bouton opt-in)"
```

---

## Task 7 : ExerciseCreate — réglages communs aux 7 manipulables

**Files:**
- Modify: `src/pages/ExerciseCreate.jsx`

- [ ] **Step 1 : Remplacer l'état spécifique base10 par un état commun, et ajouter la cible de la Droite numérique**

Remplacer :
```jsx
  // Base10 config
  const [b10Target, setB10Target] = useState('')
  const [b10Max, setB10Max] = useState(999)
  const [b10MultipleAttempts, setB10MultipleAttempts] = useState(true)
  const [b10ShowSolutionAfter, setB10ShowSolutionAfter] = useState(3)
```
par :
```jsx
  // Base10 config
  const [b10Target, setB10Target] = useState('')
  const [b10Max, setB10Max] = useState(999)

  // Aide à l'élève — commun aux 7 manipulables ayant une cible
  const [allowRetry, setAllowRetry] = useState(true)
  const [solutionAfter, setSolutionAfter] = useState(2)
```

Puis, dans le bloc « Droite numérique config », remplacer :
```jsx
  // Droite numérique config
  const [dnMin, setDnMin] = useState(0)
  const [dnMax, setDnMax] = useState(20)
  const [dnStep, setDnStep] = useState(1)
  const [dnMode, setDnMode] = useState('libre')
```
par :
```jsx
  // Droite numérique config
  const [dnMin, setDnMin] = useState(0)
  const [dnMax, setDnMax] = useState(20)
  const [dnStep, setDnStep] = useState(1)
  const [dnMode, setDnMode] = useState('libre')
  const [dnTarget, setDnTarget] = useState('')
```

- [ ] **Step 2 : Ajouter le calcul « ce manipulable a-t-il une cible ? »**

Juste **avant** `const buildConfig = () => {`, insérer :
```jsx
  // Les réglages d'aide n'ont de sens que si une cible existe : sans cible, il
  // n'y a rien à valider, donc rien à réessayer ni à révéler.
  const hasTarget = (() => {
    switch (selectedManip) {
      case 'base10':            return b10Target !== ''
      case 'droite-numerique':  return dnMode === 'placer'
      case 'cuisenaire':        return cuiTarget !== ''
      case 'cadres10':          return tenTarget !== ''
      case 'grille100':         return chartMode === 'multiples'
      case 'horloge':           return clkMode === 'placer' || clkMode === 'lire'
      case 'monnaie':           return monMode === 'rendu' || (monMode === 'composer' && monTarget !== '')
      default:                  return false   // 'fractions' n'a pas de notion de correct
    }
  })()

  // Injecté dans le config de tout manipulable ayant une cible.
  const helpConfig = hasTarget
    ? { allowMultipleAttempts: allowRetry, showSolutionAfterAttempts: allowRetry ? parseInt(solutionAfter) : 1 }
    : {}
```

- [ ] **Step 3 : Injecter `helpConfig` dans les 7 branches de `buildConfig()` et ajouter `targetValue`**

Dans `buildConfig()`, remplacer chaque branche comme suit.

`base10` — remplacer :
```jsx
    if (selectedManip === 'base10') {
      return {
        targetNumber: b10Target !== '' ? parseInt(b10Target) : undefined,
        maxNumber: parseInt(b10Max),
        showCounter: true,
        allowMultipleAttempts: b10MultipleAttempts,
        showSolutionAfterAttempts: b10MultipleAttempts ? b10ShowSolutionAfter : 1,
        cpaMode,
      }
    }
```
par :
```jsx
    if (selectedManip === 'base10') {
      return {
        targetNumber: b10Target !== '' ? parseInt(b10Target) : undefined,
        maxNumber: parseInt(b10Max),
        showCounter: true,
        ...helpConfig,
        cpaMode,
      }
    }
```

`droite-numerique` — remplacer :
```jsx
    if (selectedManip === 'droite-numerique') {
      return {
        min: parseInt(dnMin),
        max: parseInt(dnMax),
        step: parseInt(dnStep),
        mode: dnMode,
        showLabels: true,
        cpaMode,
      }
    }
```
par :
```jsx
    if (selectedManip === 'droite-numerique') {
      return {
        min: parseInt(dnMin),
        max: parseInt(dnMax),
        step: parseInt(dnStep),
        mode: dnMode,
        targetValue: dnMode === 'placer' && dnTarget !== '' ? parseInt(dnTarget) : undefined,
        showLabels: true,
        ...helpConfig,
        cpaMode,
      }
    }
```

`cuisenaire` — ajouter `...helpConfig,` juste avant `cpaMode,` :
```jsx
    if (selectedManip === 'cuisenaire') {
      return {
        targetNumber: cuiTarget !== '' ? parseInt(cuiTarget) : undefined,
        showCounter: true,
        showUnits: cuiShowUnits,
        ...helpConfig,
        cpaMode,
      }
    }
```

`cadres10` — ajouter `...helpConfig,` juste avant `cpaMode,` :
```jsx
    if (selectedManip === 'cadres10') {
      return {
        frames: parseInt(tenFrames),
        targetNumber: tenTarget !== '' ? parseInt(tenTarget) : undefined,
        counterColor: tenColor,
        showCounter: true,
        ...helpConfig,
        cpaMode,
      }
    }
```

`grille100` — ajouter `...helpConfig,` juste avant `cpaMode,` :
```jsx
    if (selectedManip === 'grille100') {
      return {
        startAt: parseInt(chartStart),
        mode: chartMode,
        multipleOf: chartMode === 'multiples' ? parseInt(chartMultiple) : undefined,
        ...helpConfig,
        cpaMode,
      }
    }
```

`horloge` — ajouter `...helpConfig,` juste avant `cpaMode,` :
```jsx
    if (selectedManip === 'horloge') {
      return {
        mode: clkMode,
        granularity: parseInt(clkGranularity),
        targetTime: clkMode === 'placer' ? { h: parseInt(clkTargetH) || 3, m: parseInt(clkTargetM) || 0 } : undefined,
        ...helpConfig,
        cpaMode,
      }
    }
```

`monnaie` — ajouter `...helpConfig,` juste avant `cpaMode,` :
```jsx
    if (selectedManip === 'monnaie') {
      return {
        mode: monMode,
        targetAmount: monMode === 'composer' && monTarget !== '' ? Math.round(parseFloat(monTarget) * 100) : undefined,
        price: monMode === 'rendu' ? Math.round(parseFloat(monPrice || 0) * 100) : undefined,
        paid: monMode === 'rendu' ? Math.round(parseFloat(monPaid || 0) * 100) : undefined,
        maxDenomination: parseInt(monMaxDenom),
        ...helpConfig,
        cpaMode,
      }
    }
```

- [ ] **Step 4 : Pré-remplissage en mode édition**

Dans `loadExercise`, remplacer :
```jsx
        if (data.manipulative === 'base10') {
          setB10Target(cfg.targetNumber !== undefined ? String(cfg.targetNumber) : '')
          setB10Max(cfg.maxNumber || 999)
        }
        if (data.manipulative === 'droite-numerique') {
          setDnMin(cfg.min ?? 0)
          setDnMax(cfg.max ?? 20)
          setDnStep(cfg.step ?? 1)
          setDnMode(cfg.mode || 'libre')
        }
```
par :
```jsx
        // Réglages d'aide, communs à tous les manipulables ayant une cible.
        if (cfg.allowMultipleAttempts !== undefined) setAllowRetry(cfg.allowMultipleAttempts)
        if (cfg.showSolutionAfterAttempts !== undefined) setSolutionAfter(cfg.showSolutionAfterAttempts)

        if (data.manipulative === 'base10') {
          setB10Target(cfg.targetNumber !== undefined ? String(cfg.targetNumber) : '')
          setB10Max(cfg.maxNumber || 999)
        }
        if (data.manipulative === 'droite-numerique') {
          setDnMin(cfg.min ?? 0)
          setDnMax(cfg.max ?? 20)
          setDnStep(cfg.step ?? 1)
          setDnMode(cfg.mode || 'libre')
          setDnTarget(cfg.targetValue !== undefined ? String(cfg.targetValue) : '')
        }
```

- [ ] **Step 5 : Supprimer le bloc d'aide spécifique à base10 dans le JSX**

Dans le panneau `{selectedManip === 'base10' && (...)}`, supprimer intégralement le bloc suivant (il devient commun) :
```jsx
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={b10MultipleAttempts}
                      onChange={(e) => setB10MultipleAttempts(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                        Autoriser plusieurs tentatives
                      </div>
                      {!focusMode && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          L'élève reçoit un indice guidé et peut corriger sa réponse.
                        </div>
                      )}
                    </div>
                  </label>
                  {b10MultipleAttempts && (
                    <div className="pl-8">
                      <label className={labelClass}>
                        Afficher la solution après combien d'erreurs ?
                      </label>
                      <select
                        value={b10ShowSolutionAfter}
                        onChange={(e) => setB10ShowSolutionAfter(parseInt(e.target.value))}
                        className={inputClass}
                      >
                        <option value={0}>Jamais (l'élève continue jusqu'à réussir)</option>
                        <option value={2}>Après 2 erreurs</option>
                        <option value={3}>Après 3 erreurs</option>
                        <option value={5}>Après 5 erreurs</option>
                      </select>
                    </div>
                  )}
                </div>
```

- [ ] **Step 6 : Ajouter le champ « nombre cible » à la Droite numérique**

Dans le panneau `{selectedManip === 'droite-numerique' && (...)}`, juste **après** le `<div>` contenant le `<select>` du Mode, ajouter :
```jsx
                {dnMode === 'placer' && (
                  <div>
                    <label className={labelClass}>Nombre à placer (optionnel)</label>
                    <input
                      type="number"
                      value={dnTarget}
                      onChange={(e) => setDnTarget(e.target.value)}
                      min={dnMin}
                      max={dnMax}
                      placeholder={`Ex : 14 (laisser vide = tiré au hasard entre ${dnMin} et ${dnMax})`}
                      className={inputClass}
                    />
                    {!focusMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        Si vous laissez vide, chaque élève recevra un nombre différent tiré au hasard.
                      </p>
                    )}
                  </div>
                )}
```

- [ ] **Step 7 : Ajouter le bloc « Aide à l'élève » commun, avant le bloc CPA**

Juste **avant** le commentaire `{/* CPA mode */}`, insérer :
```jsx
            {/* Aide à l'élève — commun à tous les manipulables ayant une cible */}
            {hasTarget && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <h3 className="font-semibold text-gray-700 text-sm">Aide à l'élève</h3>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={allowRetry}
                    onChange={(e) => setAllowRetry(e.target.checked)}
                    className="mt-1 w-5 h-5 accent-blue-500 cursor-pointer"
                  />
                  <div>
                    <div className="font-semibold text-gray-700 text-sm group-hover:text-blue-600 transition-colors">
                      Autoriser plusieurs tentatives
                    </div>
                    {!focusMode && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        En cas d'erreur, l'élève reçoit un indice adapté au manipulable et peut corriger sa réponse.
                        Décochez pour une utilisation en évaluation : une seule tentative.
                      </div>
                    )}
                  </div>
                </label>
                {allowRetry && (
                  <div className="pl-8">
                    <label className={labelClass}>Montrer la solution après combien d'erreurs ?</label>
                    <select
                      value={solutionAfter}
                      onChange={(e) => setSolutionAfter(parseInt(e.target.value))}
                      className={inputClass}
                    >
                      <option value={0}>Jamais (l'élève continue jusqu'à réussir)</option>
                      <option value={2}>Après 2 erreurs</option>
                      <option value={3}>Après 3 erreurs</option>
                      <option value={5}>Après 5 erreurs</option>
                    </select>
                    {!focusMode && (
                      <p className="text-xs text-gray-500 mt-1">
                        La bonne réponse s'affiche alors lentement sous les yeux de l'élève, pour qu'il voie le bon modèle.
                        L'élève n'est jamais bloqué.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
```

- [ ] **Step 8 : Build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 9 : Vérification manuelle (limitée)**

La route `/exercice/creer` est protégée par authentification (`ProtectedRoute` dans `App.jsx`). Sans identifiants de test, la vérification live n'est pas possible — c'est **attendu**, le signaler honnêtement dans le rapport.

Vérifier au minimum :
- `npx vite build` passe.
- Le serveur de dev sert `ExerciseCreate.jsx` sans erreur console (charger `/exercice/creer`, on est redirigé vers la connexion : c'est normal).
- Relire le diff : aucune référence résiduelle à `b10MultipleAttempts` ou `b10ShowSolutionAfter` (`grep -n "b10MultipleAttempts\|b10ShowSolutionAfter" src/pages/ExerciseCreate.jsx` doit ne rien retourner).

- [ ] **Step 10 : Commit**

```bash
git add src/pages/ExerciseCreate.jsx
git commit -m "Création d'exercice : réglages d'aide communs aux 7 manipulables + cible de la Droite numérique"
```

---

## Task 8 : Alignement du défaut de Base10Blocks et vérification finale

**Files:**
- Modify: `src/components/manipulatives/Base10Blocks.jsx`

- [ ] **Step 1 : Aligner le défaut sur 2 (au lieu de 3)**

Remplacer :
```jsx
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 3,
```
par :
```jsx
    allowMultipleAttempts = true,
    showSolutionAfterAttempts = 2,
```

- [ ] **Step 2 : Build complet**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 3 : Parcours de non-régression sur toutes les routes démo**

Serveur lancé depuis le répertoire du projet. Pour **chacune** de ces routes, vérifier qu'elle s'affiche et qu'on peut valider sans erreur console :
- `/exercice/demo-base10` (exploration libre — doit rester inchangé)
- `/exercice/demo-droite-numerique` (mode libre — inchangé)
- `/exercice/demo-fractions` (hors périmètre — doit être strictement inchangé)
- `/exercice/demo-cuisenaire` (cible 10 — cycle actif)
- `/exercice/demo-cadres10` (cible 7 — cycle actif)
- `/exercice/demo-grille100` (multiples de 5 — cycle actif, plus de bouton « Révéler »)
- `/exercice/demo-horloge` (2h30 — cycle actif, plus de bouton opt-in)
- `/exercice/demo-monnaie` (3,50 € — cycle actif)

Aucune erreur console sur aucune route.

- [ ] **Step 4 : Commit et push**

```bash
git add src/components/manipulatives/Base10Blocks.jsx
git commit -m "Blocs base 10 : aligne le défaut de révélation sur 2 échecs"
git push origin main
```

Expected : push accepté, Vercel redéploie automatiquement.
