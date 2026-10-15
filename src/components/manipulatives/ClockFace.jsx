// Cadran analogique fixe (lecture seule) : sert aux exercices où l'élève lit un
// cadran sans le manipuler (durée écoulée, correspondance analogique/digital).

const SIZE = 260
const CENTER = SIZE / 2
const RADIUS = CENTER - 20

function dialPoint(angle, length) {
  return {
    x: CENTER + length * Math.sin((angle * Math.PI) / 180),
    y: CENTER - length * Math.cos((angle * Math.PI) / 180),
  }
}

function Hand({ angle, length, stroke, strokeWidth }) {
  const p = dialPoint(angle, length)
  return <line x1={CENTER} y1={CENTER} x2={p.x} y2={p.y} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />
}

export default function ClockFace({ h, m, width = 'min(100%, 260px)', label }) {
  const hourAngle = (((h % 12) + m / 60) * 30) % 360
  const minuteAngle = (m / 60) * 360
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ width, height: 'auto' }} role="img" aria-label={label || "Cadran d'horloge"}>
      <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="#F7FAFC" stroke="#4A5568" strokeWidth={4} />
      {Array.from({ length: 60 }).map((_, i) => {
        if (i % 5 === 0) return null
        const a = (i / 60) * 360
        const p1 = dialPoint(a, RADIUS - 6)
        const p2 = dialPoint(a, RADIUS - 12)
        return <line key={`m${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#A0AEC0" strokeWidth={1} />
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * 360
        const p1 = dialPoint(a, RADIUS - 8)
        const p2 = dialPoint(a, RADIUS - 18)
        const t = dialPoint(a, RADIUS - 32)
        return (
          <g key={`h${i}`}>
            <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#4A5568" strokeWidth={i % 3 === 0 ? 3 : 1.5} />
            <text x={t.x} y={t.y + 6} textAnchor="middle" fontSize={18} fontWeight="bold" fill="#2D3748">
              {i === 0 ? 12 : i}
            </text>
          </g>
        )
      })}
      <Hand angle={hourAngle} length={RADIUS * 0.52} stroke="#1A202C" strokeWidth={7} />
      <Hand angle={minuteAngle} length={RADIUS * 0.8} stroke="#3182CE" strokeWidth={5} />
      <circle cx={CENTER} cy={CENTER} r={7} fill="#1A202C" />
    </svg>
  )
}
