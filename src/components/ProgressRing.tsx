import { CATEGORY_LABEL, type Category } from '../types'

type Props = {
  value: number
  category: Category
  label?: string
  size?: number
}

const COLORS: Record<Category, string> = {
  life: '#c4784a',
  health: '#3d8a6a',
  money: '#8a7a3d',
  work: '#6b5c9e',
  study: '#3d6ea8',
  hobby: '#b85c7a',
  other: '#7a7468',
}

export function ProgressRing({ value, category, label, size = 124 }: Props) {
  const r = 48
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const offset = c * (1 - clamped / 100)
  const color = COLORS[category]

  return (
    <div className="ring-wrap" style={{ width: size }}>
      <svg width={size} height={size} viewBox="0 0 120 120" aria-label={`${label ?? ''} ${clamped}%`}>
        <circle cx="60" cy="60" r={r} fill="none" stroke="#efe6d6" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="56" textAnchor="middle" fontSize="20" fontWeight="650" fill="#1f1c18">
          {clamped}%
        </text>
        <text x="60" y="74" textAnchor="middle" fontSize="10" fill="#7a7268">
          {CATEGORY_LABEL[category]}
        </text>
      </svg>
      {label ? <p>{label}</p> : null}
    </div>
  )
}
