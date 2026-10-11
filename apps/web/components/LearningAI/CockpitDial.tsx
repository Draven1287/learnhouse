import { useId } from 'react'

const point = (a: number, r: number) => [
  r * Math.cos(((a - 90) * Math.PI) / 180),
  r * Math.sin(((a - 90) * Math.PI) / 180),
]
const arc = (a: number, b: number, r: number) => {
  const [x, y] = point(a, r),
    [u, v] = point(b, r)
  return `M${x} ${y} A${r} ${r} 0 0 1 ${u} ${v}`
}

/** The selected Cockpit geometry; future lessons are marks, never fake progress. */
export default function CockpitDial({
  page = 0,
  completed = false,
  lesson = false,
}: {
  page?: number
  completed?: boolean
  lesson?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const count = lesson ? 4 : 15
  const gap = lesson ? 4 : 1.3
  const span = lesson ? (240 - 12) / 4 : (240 - 22) / 15
  const needle = lesson
    ? -120 + (completed ? 240 : (page + 0.5) * 60)
    : -120 + (completed ? span : (page / 4) * span)
  return (
    <svg viewBox="-320 -320 640 640" aria-hidden="true">
      <circle className="inner" r="196" />
      {Array.from({ length: count }, (_, i) => {
        const a =
          -120 +
          i * (lesson ? span + gap : span) +
          (lesson ? 0 : Math.floor(i / 5) * 11)
        const b = a + span - (lesson ? 0 : gap)
        const [x, y] = point((a + b) / 2, 282)
        return (
          <g key={i}>
            <path className="trk" d={arc(a, b, 226)} />
            {Array.from({ length: lesson ? 21 : 12 }, (_, j) => {
              const angle = a + ((j + 0.5) / (lesson ? 21 : 12)) * (b - a),
                [x1, y1] = point(angle, 238),
                [x2, y2] = point(angle, 254)
              return (
                <line
                  key={j}
                  className={`tk ${angle < needle ? 'on' : ''}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                />
              )
            })}
            <text
              className={`lnum ${i === (lesson ? page : 0) ? 'now' : 'locked'}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {String(i + 1).padStart(2, '0')}
            </text>
          </g>
        )
      })}
      {!lesson &&
        ['UNDERSTAND', 'REVISE', 'JUDGMENT'].map((part, i) => (
          <g key={part}>
            <path
              id={`${id}-${i}`}
              d={arc(-120 + i * 83.6667, -47.333 + i * 83.6667, 304)}
              fill="none"
            />
            <text className="part">
              <textPath
                href={`#${id}-${i}`}
                startOffset="50%"
                textAnchor="middle"
              >
                0{i + 1} {part}
              </textPath>
            </text>
          </g>
        ))}
      <g className="ndl" transform={`rotate(${needle})`}>
        <line className="hz" x1="0" y1="-200" x2="0" y2="-222" />
        <line x1="0" y1="-226" x2="0" y2="-268" />
      </g>
    </svg>
  )
}

export function CockpitMiniDial({
  number,
  completed = false,
}: {
  number: number
  completed?: boolean
}) {
  return (
    <svg className="mini" viewBox="-60 -60 120 120" aria-hidden="true">
      <path className="trk" d={arc(-120, 120, 39)} />
      {Array.from({ length: 20 }, (_, i) => {
        const angle = -120 + (i + 0.5) * 12
        const [x1, y1] = point(angle, 44),
          [x2, y2] = point(angle, 53)
        return (
          <line
            key={i}
            className={`tk ${completed && i < 4 ? 'on' : ''}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
          />
        )
      })}
      <text
        className="mini-n"
        y="4"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {String(number).padStart(2, '0')}
      </text>
    </svg>
  )
}
