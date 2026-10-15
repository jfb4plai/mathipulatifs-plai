import { momentOfDay, momentRange } from '../../lib/clockProblems.js'

/** Repère du moment de la journée, bien visible : lève l'ambiguïté entre deux
 *  heures qui partagent le même cadran (7h45 et 19h45). */
export default function MomentBadge({ h }) {
  const range = momentRange(h)
  return (
    <div
      role="note"
      className="mx-auto w-full max-w-[380px] px-4 py-3 rounded-2xl bg-amber-100 border-4 border-amber-500 text-amber-900 text-center"
    >
      <span className="block text-5xl font-extrabold leading-none tracking-wide uppercase">{momentOfDay(h)}</span>
      <span className="block text-xl font-bold mt-1">entre {range.from} h et {range.to} h</span>
    </div>
  )
}
