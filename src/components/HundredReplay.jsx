import { stepStatus } from '../lib/hundredActivities.js'

const COLORS = {
  start:    { bg: '#BEE3F8', border: '#2C5282' },
  ok:       { bg: '#F6E05E', border: '#B7791F' },
  revealed: { bg: '#FBD38D', border: '#C05621' },
  final:    { bg: '#68D391', border: '#276749' },
  wrong:    { bg: '#FED7D7', border: '#C53030' },
  empty:    { bg: '#F7FAFC', border: '#E2E8F0' },
}

/** Rejoue sur la grille le parcours d'un élève (séquence étape par étape) :
 *  mêmes couleurs que chez l'élève, plus les cases proposées à tort en rouge. */
export default function HundredReplay({ startAt = 1, reponse }) {
  const { startCell, ops = [], steps = [] } = reponse
  const first = Number(startAt) === 0 ? 0 : 1
  const numbers = Array.from({ length: 100 }, (_, i) => i + first)

  const info = {}
  for (const st of steps) {
    for (const t of st.tries) {
      if (t !== st.expected) info[t] = info[t] || { kind: 'wrong', step: st.step }
    }
  }
  for (const st of steps) {
    const status = stepStatus(st.tries, st.revealed)
    const kind = status === 'revealed' ? 'revealed' : st.step === ops.length ? 'final' : 'ok'
    info[st.expected] = { kind, step: st.step }
  }
  info[startCell] = { kind: 'start' }

  const legend = [
    ['start', 'Départ'], ['ok', 'Étape trouvée'], ['final', 'Arrivée trouvée'],
    ['revealed', 'Solution montrée'], ['wrong', 'Case proposée à tort'],
  ]

  return (
    <div>
      <div
        role="img"
        aria-label={`Parcours de l'élève : départ ${startCell}, ${steps.map((s) => `étape ${s.step} case ${s.expected}`).join(', ')}`}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 28px)', gap: 2, width: 'fit-content' }}
      >
        {numbers.map((n) => {
          const c = info[n]
          const col = COLORS[c?.kind || 'empty']
          return (
            <div
              key={n}
              style={{
                position: 'relative', height: 28, borderRadius: 3, fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#2D3748', fontWeight: c ? 700 : 400,
                background: col.bg, border: `${c ? 2 : 1}px solid ${col.border}`,
              }}
            >
              {n}
              {c && c.kind !== 'start' && c.kind !== 'wrong' && (
                <span style={{ position: 'absolute', top: -1, left: 1, fontSize: 9, fontWeight: 700 }}>{c.step}</span>
              )}
              {c?.kind === 'wrong' && (
                <span style={{ position: 'absolute', top: -1, right: 1, fontSize: 9, fontWeight: 700, color: '#C53030' }}>✗</span>
              )}
            </div>
          )
        })}
      </div>
      <ul className="mt-2 flex gap-x-4 gap-y-1 flex-wrap text-xs text-gray-600">
        {legend.map(([k, label]) => (
          <li key={k} className="flex items-center gap-1">
            <span style={{ display: 'inline-block', width: 12, height: 12, background: COLORS[k].bg, border: `2px solid ${COLORS[k].border}` }} />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
