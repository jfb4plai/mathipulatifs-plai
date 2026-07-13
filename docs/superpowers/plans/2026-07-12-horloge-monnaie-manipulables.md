# Manipulables Horloge & Monnaie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter deux nouveaux manipulables mathématiques — Horloge (lecture de l'heure) et Monnaie (pièces/billets euros) — à Mathipulatifs PLAI, en suivant à l'identique le pattern architectural des 6 manipulables existants.

**Architecture:** Chaque manipulable est un composant React autonome (`config` + `onValidate`) branché à 6 endroits fixes de l'app (StudentView, ExerciseCreate, Dashboard, Home, Guide, contrainte DB). Le mode CPA guidé est déjà générique dans `StudentView.jsx` — aucun changement requis pour l'hériter.

**Tech Stack:** React 18 + Vite 5 + Tailwind CSS v3, Supabase (migration SQL), pas de framework de test dans ce projet — la vérification se fait par `npx vite build` (obligatoire avant tout commit, règle du projet) et par test manuel dans le navigateur via les routes démo (`/exercice/demo-horloge`, `/exercice/demo-monnaie`), qui ne nécessitent pas de compte.

**Important — adaptation TDD :** ce projet n'a pas de suite de tests automatisés (aucun framework configuré dans `package.json`). Les étapes « test » de ce plan sont donc des vérifications manuelles dans le navigateur (dev server + interaction), pas des tests unitaires. Ne pas installer de framework de test — ce serait hors périmètre.

---

## File Structure

**Créés :**
- `src/components/manipulatives/Clock.jsx` — composant Horloge
- `src/components/manipulatives/Money.jsx` — composant Monnaie
- `supabase/migrations/20260712170000_add_horloge_monnaie_manipulatives.sql` — migration DB

**Modifiés :**
- `src/pages/StudentView.jsx` — imports, `ManipulativeComponent`, `DEMO_CONFIGS`
- `src/pages/ExerciseCreate.jsx` — liste `manipulatives`, state + `buildConfig()` + pré-remplissage + panneau de configuration
- `src/pages/Dashboard.jsx` — `manipulativeLabels`
- `src/pages/Home.jsx` — tableau `manipulatives` + `colorMap`
- `src/pages/Guide.jsx` — `RISS_REFS`, `MANIPULATIVES`, titre de section

---

## Task 0: Migration base de données

**Files:**
- Create: `supabase/migrations/20260712170000_add_horloge_monnaie_manipulatives.sql`

- [ ] **Step 1: Écrire la migration**

```sql
-- Élargit la contrainte manipulative pour accepter 'horloge' et 'monnaie'.
-- Utilise un bloc dynamique plutôt qu'un nom de contrainte codé en dur :
-- la table a été renommée (exercises -> mathip_exercises) par une migration
-- précédente sans que Postgres ne renomme la contrainte associée, son nom
-- réel n'est donc pas garanti.
DO $$
DECLARE
  con RECORD;
BEGIN
  FOR con IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.mathip_exercises'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%manipulative%'
  LOOP
    EXECUTE format('ALTER TABLE public.mathip_exercises DROP CONSTRAINT %I', con.conname);
  END LOOP;
END $$;

ALTER TABLE public.mathip_exercises
  ADD CONSTRAINT mathip_exercises_manipulative_check
  CHECK (manipulative IN ('base10', 'droite-numerique', 'fractions', 'cuisenaire', 'cadres10', 'grille100', 'horloge', 'monnaie'));
```

- [ ] **Step 2: Appliquer la migration**

Run: `cd projets/mathipulatifs-plai && supabase db push`
Expected: la sortie liste `20260712170000_add_horloge_monnaie_manipulatives.sql` comme appliquée, sans erreur.

- [ ] **Step 3: Vérifier l'application**

Run: `supabase migration list`
Expected: la ligne `20260712170000` apparaît dans les colonnes Local **et** Remote.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712170000_add_horloge_monnaie_manipulatives.sql
git commit -m "Ajoute horloge et monnaie à la contrainte manipulative en base"
```

---

## Task 1: Composant Clock.jsx

**Files:**
- Create: `src/components/manipulatives/Clock.jsx`

- [ ] **Step 1: Écrire le composant**

```jsx
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
              <text key={i} x={p.x} y={p.y + 5} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#2D3748">
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
              />
              <circle
                cx={minuteEnd.x}
                cy={minuteEnd.y}
                r={14}
                fill="rgba(49,130,206,0.15)"
                onMouseDown={handleDown('minute')}
                onTouchStart={handleDown('minute')}
                style={{ cursor: 'grab' }}
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
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/manipulatives/Clock.jsx
git commit -m "Ajoute le composant manipulable Horloge (Clock.jsx)"
```

---

## Task 2: Composant Money.jsx

**Files:**
- Create: `src/components/manipulatives/Money.jsx`

- [ ] **Step 1: Écrire le composant**

```jsx
import { useState, useMemo } from 'react'
import { useAccessibility } from '../../contexts/AccessibilityContext.jsx'

const DENOMS = [
  { value: 1, label: '1 c', type: 'piece', color: '#B87333' },
  { value: 2, label: '2 c', type: 'piece', color: '#B87333' },
  { value: 5, label: '5 c', type: 'piece', color: '#B87333' },
  { value: 10, label: '10 c', type: 'piece', color: '#D4A24C' },
  { value: 20, label: '20 c', type: 'piece', color: '#D4A24C' },
  { value: 50, label: '50 c', type: 'piece', color: '#D4A24C' },
  { value: 100, label: '1 €', type: 'piece', color: '#C9B037' },
  { value: 200, label: '2 €', type: 'piece', color: '#C0C0C0' },
  { value: 500, label: '5 €', type: 'billet', color: '#8C6BAF' },
  { value: 1000, label: '10 €', type: 'billet', color: '#C0392B' },
  { value: 2000, label: '20 €', type: 'billet', color: '#2980B9' },
  { value: 5000, label: '50 €', type: 'billet', color: '#E67E22' },
]

function formatCents(c) {
  const euros = Math.floor(c / 100)
  const cents = c % 100
  if (cents === 0) return `${euros} €`
  return `${euros},${String(cents).padStart(2, '0')} €`
}

function CoinShape({ denom, size = 48 }) {
  if (denom.type === 'billet') {
    return (
      <div
        style={{
          width: size * 1.6,
          height: size * 0.75,
          backgroundColor: denom.color,
          border: '2px solid rgba(0,0,0,0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 12,
        }}
      >
        {denom.label}
      </div>
    )
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: denom.color,
        border: '2px solid rgba(0,0,0,0.25)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 11,
      }}
    >
      {denom.label}
    </div>
  )
}

export default function Money({ config = {}, onValidate }) {
  const { mode = 'composer', targetAmount, price, paid, maxDenomination = 500 } = config
  const { focusMode, ttsEnabled, speak } = useAccessibility()

  const availableDenoms = useMemo(() => DENOMS.filter((d) => d.value <= maxDenomination), [maxDenomination])

  const [workspace, setWorkspace] = useState([])
  const [validated, setValidated] = useState(false)

  const total = workspace.reduce((sum, v) => sum + v, 0)
  const changeExpected = mode === 'rendu' ? (paid ?? 0) - (price ?? 0) : null
  const target = mode === 'composer' ? targetAmount : changeExpected

  const addCoin = (value) => {
    if (validated) return
    setWorkspace((prev) => [...prev, value])
  }

  const removeCoin = (index) => {
    if (validated) return
    setWorkspace((prev) => prev.filter((_, i) => i !== index))
  }

  const handleValidate = () => {
    setValidated(true)
    const correct = target !== undefined && target !== null ? total === target : null
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

  const isCorrect = target !== undefined && target !== null ? total === target : null

  return (
    <div>
      {mode === 'rendu' && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-blue-800 font-semibold">
            Prix de l'article : <span className="font-bold">{formatCents(price ?? 0)}</span> — Payé :{' '}
            <span className="font-bold">{formatCents(paid ?? 0)}</span>
          </p>
          <p className="text-blue-600 text-sm mt-1">Rends la monnaie exacte au client.</p>
        </div>
      )}
      {mode === 'composer' && targetAmount !== undefined && (
        <div className="mb-4 text-center">
          <span className="text-lg font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-xl border border-blue-200">
            Cible : {formatCents(targetAmount)}
          </span>
        </div>
      )}

      <div className="flex gap-6 flex-wrap items-start">
        <div className="shrink-0">
          {!focusMode && <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Banque</h3>}
          <div className="flex flex-wrap gap-2 max-w-[280px]">
            {availableDenoms.map((d) => (
              <button
                key={d.value}
                onClick={() => addCoin(d.value)}
                disabled={validated}
                title={`Ajouter ${d.label}`}
                className="disabled:opacity-50 hover:scale-105 transition-transform"
                style={{ cursor: validated ? 'default' : 'pointer' }}
              >
                <CoinShape denom={d} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-[240px]">
          {!focusMode && (
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Espace de travail —{' '}
              <span className="font-bold text-sm normal-case text-gray-700">Total : {formatCents(total)}</span>
            </h3>
          )}
          {focusMode && <div className="mb-2 font-bold text-gray-700">Total : {formatCents(total)}</div>}

          <div className="min-h-[160px] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 flex flex-wrap gap-2 content-start">
            {workspace.length === 0 && (
              <p className="text-gray-400 text-sm w-full text-center pt-8">
                Clique sur une pièce ou un billet pour l'ajouter ici
              </p>
            )}
            {workspace.map((value, index) => {
              const d = DENOMS.find((x) => x.value === value)
              return (
                <button
                  key={index}
                  onClick={() => removeCoin(index)}
                  disabled={validated}
                  title={`Retirer ${d.label}`}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: validated ? 'default' : 'pointer' }}
                >
                  <CoinShape denom={d} />
                </button>
              )
            })}
          </div>

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
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Vérifier que le build passe**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 3: Commit**

```bash
git add src/components/manipulatives/Money.jsx
git commit -m "Ajoute le composant manipulable Monnaie (Money.jsx)"
```

---

## Task 3: Brancher Clock et Money dans StudentView.jsx

**Files:**
- Modify: `src/pages/StudentView.jsx:1-68`

- [ ] **Step 1: Ajouter les imports**

Après la ligne `import HundredChart from '../components/manipulatives/HundredChart.jsx'` (ligne 10) :

```jsx
import Clock from '../components/manipulatives/Clock.jsx'
import Money from '../components/manipulatives/Money.jsx'
```

- [ ] **Step 2: Ajouter les entrées DEMO_CONFIGS**

Dans l'objet `DEMO_CONFIGS`, après l'entrée `'demo-grille100'` (avant la fermeture `}` de l'objet, ligne 49) :

```js
  'demo-horloge': {
    titre: 'Exploration — Horloge',
    consigne: "Place les aiguilles sur l'heure demandée.",
    manipulative: 'horloge',
    config: { mode: 'placer', granularity: 30, targetTime: { h: 2, m: 30 } },
  },
  'demo-monnaie': {
    titre: 'Exploration — Monnaie',
    consigne: 'Compose la somme de 3,50 € avec les pièces et billets.',
    manipulative: 'monnaie',
    config: { mode: 'composer', targetAmount: 350, maxDenomination: 500 },
  },
```

- [ ] **Step 3: Brancher dans ManipulativeComponent**

Dans la fonction `ManipulativeComponent` (ligne 60-68), après la ligne `if (manipulative === 'grille100') return <HundredChart config={config} onValidate={onValidate} />` :

```jsx
  if (manipulative === 'horloge') return <Clock config={config} onValidate={onValidate} />
  if (manipulative === 'monnaie') return <Money config={config} onValidate={onValidate} />
```

- [ ] **Step 4: Vérifier le build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 5: Vérification manuelle dans le navigateur**

Démarrer le serveur de dev (`preview_start` avec la config `mathipulatifs-plai` de `.claude/launch.json`), naviguer vers `http://localhost:5179/exercice/demo-horloge`.
Expected : le cadran s'affiche avec le texte "Place 2h30", les aiguilles sont visibles.
Naviguer vers `http://localhost:5179/exercice/demo-monnaie`.
Expected : la banque de pièces/billets s'affiche avec la cible "3,50 €".

- [ ] **Step 6: Commit**

```bash
git add src/pages/StudentView.jsx
git commit -m "Branche Horloge et Monnaie dans StudentView (démo + rendu élève)"
```

---

## Task 4: Brancher Clock et Money dans ExerciseCreate.jsx

**Files:**
- Modify: `src/pages/ExerciseCreate.jsx:1-784`

- [ ] **Step 1: Ajouter les entrées dans le tableau `manipulatives`**

Après l'entrée `id: 'grille100'` (ligne 37-42, avant la fermeture `]` du tableau) :

```js
  {
    id: 'horloge',
    emoji: '🕐',
    titre: 'Horloge',
    description: "Lire l'heure, placer les aiguilles sur un cadran",
  },
  {
    id: 'monnaie',
    emoji: '💶',
    titre: 'Monnaie',
    description: 'Composer une somme ou rendre la monnaie avec des pièces/billets',
  },
```

- [ ] **Step 2: Ajouter le state de configuration**

Après le bloc `// Grille des 100 config` (lignes 83-86), avant `const [loading, setLoading] = useState(false)` :

```js
  // Horloge config
  const [clkMode, setClkMode] = useState('libre')
  const [clkGranularity, setClkGranularity] = useState(30)
  const [clkTargetH, setClkTargetH] = useState(3)
  const [clkTargetM, setClkTargetM] = useState(0)

  // Monnaie config
  const [monMode, setMonMode] = useState('composer')
  const [monTarget, setMonTarget] = useState('')
  const [monPrice, setMonPrice] = useState('')
  const [monPaid, setMonPaid] = useState('')
  const [monMaxDenom, setMonMaxDenom] = useState(500)
```

- [ ] **Step 3: Ajouter le pré-remplissage en mode édition**

Dans le `useEffect` de `loadExercise` (fonction interne, après le bloc `if (data.manipulative === 'grille100') { ... }`, avant `} catch (err) {`) :

```js
        if (data.manipulative === 'horloge') {
          setClkMode(cfg.mode || 'libre')
          setClkGranularity(cfg.granularity || 30)
          if (cfg.targetTime) {
            setClkTargetH(cfg.targetTime.h)
            setClkTargetM(cfg.targetTime.m)
          }
        }
        if (data.manipulative === 'monnaie') {
          setMonMode(cfg.mode || 'composer')
          setMonTarget(cfg.targetAmount !== undefined ? String(cfg.targetAmount / 100) : '')
          setMonPrice(cfg.price !== undefined ? String(cfg.price / 100) : '')
          setMonPaid(cfg.paid !== undefined ? String(cfg.paid / 100) : '')
          setMonMaxDenom(cfg.maxDenomination || 500)
        }
```

- [ ] **Step 4: Ajouter les branches dans `buildConfig()`**

Dans `buildConfig()`, après le bloc `if (selectedManip === 'grille100') { ... }`, avant `return {}` :

```js
    if (selectedManip === 'horloge') {
      return {
        mode: clkMode,
        granularity: parseInt(clkGranularity),
        targetTime: clkMode === 'placer' ? { h: parseInt(clkTargetH), m: parseInt(clkTargetM) } : undefined,
        cpaMode,
      }
    }
    if (selectedManip === 'monnaie') {
      return {
        mode: monMode,
        targetAmount: monMode === 'composer' && monTarget !== '' ? Math.round(parseFloat(monTarget) * 100) : undefined,
        price: monMode === 'rendu' ? Math.round(parseFloat(monPrice || 0) * 100) : undefined,
        paid: monMode === 'rendu' ? Math.round(parseFloat(monPaid || 0) * 100) : undefined,
        maxDenomination: parseInt(monMaxDenom),
        cpaMode,
      }
    }
```

- [ ] **Step 5: Ajouter les panneaux de configuration UI**

Dans le JSX, après le bloc `{selectedManip === 'grille100' && ( ... )}` (avant le commentaire `{/* CPA mode */}`) :

```jsx
            {selectedManip === 'horloge' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={clkMode} onChange={(e) => setClkMode(e.target.value)} className={inputClass}>
                    <option value="libre">Libre (exploration)</option>
                    <option value="placer">Placer une heure cible</option>
                    <option value="lire">Lire l'heure affichée</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Granularité</label>
                  <select value={clkGranularity} onChange={(e) => setClkGranularity(e.target.value)} className={inputClass}>
                    <option value={60}>Heure pleine</option>
                    <option value={30}>Demi-heure</option>
                    <option value={15}>Quart d'heure</option>
                    <option value={5}>5 minutes</option>
                  </select>
                </div>
                {clkMode === 'placer' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Heure cible — heures</label>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={clkTargetH}
                        onChange={(e) => setClkTargetH(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Heure cible — minutes</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={clkTargetM}
                        onChange={(e) => setClkTargetM(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedManip === 'monnaie' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Mode</label>
                  <select value={monMode} onChange={(e) => setMonMode(e.target.value)} className={inputClass}>
                    <option value="composer">Composer une somme</option>
                    <option value="rendu">Rendre la monnaie</option>
                  </select>
                </div>
                {monMode === 'composer' && (
                  <div>
                    <label className={labelClass}>Montant cible en € (optionnel)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={monTarget}
                      onChange={(e) => setMonTarget(e.target.value)}
                      placeholder="Ex : 3.50 (laisser vide pour exploration libre)"
                      className={inputClass}
                    />
                  </div>
                )}
                {monMode === 'rendu' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Prix de l'article (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={monPrice}
                        onChange={(e) => setMonPrice(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Montant payé (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={monPaid}
                        onChange={(e) => setMonPaid(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className={labelClass}>Dénominations disponibles jusqu'à</label>
                  <select value={monMaxDenom} onChange={(e) => setMonMaxDenom(e.target.value)} className={inputClass}>
                    <option value={50}>50 centimes max (P1-P2)</option>
                    <option value={200}>2 € max (pièces seulement)</option>
                    <option value={500}>5 € max</option>
                    <option value={2000}>20 € max</option>
                    <option value={5000}>50 € max</option>
                  </select>
                </div>
              </div>
            )}
```

- [ ] **Step 6: Vérifier le build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 7: Vérification manuelle**

Se connecter (ou créer un compte de test) dans le dev server, aller sur `/exercice/creer`, sélectionner "Horloge" puis "Monnaie" successivement.
Expected : le panneau de configuration correspondant s'affiche à chaque sélection, sans erreur console.

- [ ] **Step 8: Commit**

```bash
git add src/pages/ExerciseCreate.jsx
git commit -m "Branche Horloge et Monnaie dans le créateur d'exercices"
```

---

## Task 5: Dashboard.jsx et Home.jsx

**Files:**
- Modify: `src/pages/Dashboard.jsx:6-13`
- Modify: `src/pages/Home.jsx:5-87`

- [ ] **Step 1: Ajouter les libellés dans Dashboard.jsx**

Dans l'objet `manipulativeLabels` (lignes 6-13), après `grille100: { ... }` :

```js
  horloge:  { label: 'Horloge', color: 'bg-amber-100 text-amber-700' },
  monnaie:  { label: 'Monnaie', color: 'bg-cyan-100 text-cyan-700' },
```

- [ ] **Step 2: Ajouter les entrées dans le tableau `manipulatives` de Home.jsx**

Après l'entrée `id: 'grille100'` (lignes 46-53, avant la fermeture `]`) :

```js
  {
    id: 'horloge',
    emoji: '🕐',
    titre: 'Horloge',
    description: "Lire l'heure et placer les aiguilles. Manipule un cadran pour comprendre les heures, demi-heures et quarts d'heure.",
    couleur: 'amber',
    demoToken: 'demo-horloge',
  },
  {
    id: 'monnaie',
    emoji: '💶',
    titre: 'Monnaie',
    description: 'Compose une somme ou rends la monnaie avec des pièces et billets euros.',
    couleur: 'cyan',
    demoToken: 'demo-monnaie',
  },
```

- [ ] **Step 3: Ajouter les couleurs dans `colorMap` de Home.jsx**

Dans l'objet `colorMap` (lignes 56-87), après l'entrée `teal: { ... }` :

```js
  amber: {
    card: 'border-amber-200 hover:border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    btn: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  cyan: {
    card: 'border-cyan-200 hover:border-cyan-400',
    badge: 'bg-cyan-100 text-cyan-700',
    btn: 'bg-cyan-500 hover:bg-cyan-600 text-white',
  },
```

- [ ] **Step 4: Vérifier le build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 5: Vérification manuelle**

Naviguer vers `http://localhost:5179/` (accueil).
Expected : 8 cartes de manipulables visibles, dont "Horloge" (ambre) et "Monnaie" (cyan), chacune avec un bouton "Essayer" fonctionnel menant à la route démo correspondante.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.jsx src/pages/Home.jsx
git commit -m "Ajoute Horloge et Monnaie au tableau de bord et à l'accueil"
```

---

## Task 6: Guide.jsx — références RISS et fiches manipulables

**Files:**
- Modify: `src/pages/Guide.jsx:1-323`

- [ ] **Step 1: Ajouter les 4 références RISS**

Dans le tableau `RISS_REFS` (lignes 4-76), après l'entrée `lacombe2021` (avant la fermeture `]`) :

```js
  {
    id: 'gangloffgrateau2019',
    citation: "Gangloff-Grateau, L. (2019). Le temps : des origines à sa structuration en classe. DUMAS.",
    riss: 'dumas-04649697',
    content:
      "L'apprentissage de la lecture de l'heure sur un cadran à aiguilles gagne à être explicite et progressif — heure pleine, puis demi-heure, puis quart d'heure — la notion de « moins le quart » restant la plus difficile à construire. La manipulation régulière des aiguilles, individuelle puis collective, réduit les confusions entre petite et grande aiguille.",
  },
  {
    id: 'bertrand2018',
    citation:
      "Bertrand, A. (2018). Les outils de structuration temporelle au service des apprentissages chez les élèves avec troubles des fonctions cognitives. DUMAS.",
    riss: 'dumas-02000366',
    content:
      "Chez les élèves porteurs de troubles des fonctions cognitives, le temps vécu comme durée est la dimension la plus difficile à se représenter car elle n'est pas matérialisée dans leur esprit. Symboliser ce temps par un outil concret comme l'horloge réduit l'anxiété et soutient l'autonomie dans les apprentissages.",
  },
  {
    id: 'fix2016',
    citation: "Fix, C. (2016). La différenciation pédagogique au service de la réussite des élèves. DUMAS.",
    riss: 'dumas-01380192',
    content:
      "Comparé à un enseignement magistral sur polycopié, l'usage d'un matériel de manipulation — de la fausse monnaie — pour travailler l'euro et le centime motive davantage les élèves, y compris ceux en grande difficulté scolaire.",
  },
  {
    id: 'davidblandin2021',
    citation:
      "David-Blandin, V. (2021). Étude comparative des interactions didactiques lors d'un enseignement-apprentissage du nombre avec des élèves à besoins éducatifs particuliers. DUMAS.",
    riss: 'dumas-03282600',
    content:
      "Chez les élèves à besoins éducatifs particuliers, la monnaie est souvent réduite à une activité usuelle de comptage plutôt que traitée comme un objet mathématique structuré pour construire le nombre — un usage pédagogique explicite et manipulable de la monnaie peut combler cet écart.",
  },
```

- [ ] **Step 2: Ajouter les fiches manipulables**

Dans le tableau `MANIPULATIVES` (lignes 147-196), après l'entrée `Grille des 100` (avant la fermeture `]`) :

```js
  {
    emoji: '🕐',
    name: 'Horloge',
    levels: 'P2–P4 · S1 en difficulté',
    skills: "Lecture de l'heure, structuration du temps, heures/demi-heures/quarts d'heure",
    desc: "Un cadran à aiguilles heures et minutes à manipuler. Trois modes : libre (exploration), placer une heure cible, ou lire l'heure affichée et la saisir.",
    cpa: "Concret : déplacement des aiguilles → Semi-concret : cadran affiché → Abstrait : écriture chiffrée de l'heure",
  },
  {
    emoji: '💶',
    name: 'Monnaie',
    levels: 'P2–P5 · S1–S2 en difficulté',
    skills: 'Monnaie, euro et centime, addition, rendu de monnaie',
    desc: 'Une banque de pièces et billets euros à cliquer pour composer une somme cible ou rendre la monnaie sur un achat. Dénominations disponibles configurables selon le niveau.',
    cpa: 'Concret : manipulation des pièces/billets → Semi-concret : représentation des pièces à l\'écran → Abstrait : calcul de la somme en euros',
  },
```

- [ ] **Step 3: Mettre à jour le titre de section**

Ligne 217, remplacer :
```jsx
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Les 6 manipulables</h2>
```
par :
```jsx
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Les 8 manipulables</h2>
```

- [ ] **Step 4: Vérifier le build**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur.

- [ ] **Step 5: Vérification manuelle**

Naviguer vers `http://localhost:5179/guide`.
Expected : "Les 8 manipulables" en titre, les fiches Horloge et Monnaie visibles dans la liste, les 4 nouvelles références RISS visibles dans la section "Ancrage scientifique" avec leur badge `RISS : dumas-...`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Guide.jsx
git commit -m "Documente Horloge et Monnaie dans le guide avec ancrage RISS"
```

---

## Task 7: Vérification finale et déploiement

**Files:** aucun (vérification transverse)

- [ ] **Step 1: Build complet**

Run: `cd projets/mathipulatifs-plai && npx vite build`
Expected: `✓ built in` sans erreur, aucun warning bloquant.

- [ ] **Step 2: Parcours démo complet dans le navigateur**

Avec le dev server lancé, vérifier successivement :
- `/` — 8 cartes affichées, aucune erreur console
- `/exercice/demo-horloge` — mode placer, glisser une aiguille change l'heure affichée, "Valider" affiche un feedback correct/incorrect
- `/exercice/demo-monnaie` — cliquer des pièces met à jour le total, "Valider" affiche un feedback correct/incorrect
- `/guide` — section "Les 8 manipulables" et 13 références RISS au total (9 existantes + 4 nouvelles)

- [ ] **Step 3: Push**

```bash
git push origin main
```

Expected : push accepté sans conflit, Vercel redéploie automatiquement.
