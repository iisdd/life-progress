import { itemProgress, todayISO } from '../store'
import type { Item, Step } from '../types'

const COLORS: Record<string, string> = {
  life: '#c4784a',
  health: '#3d8a6a',
  money: '#8a7a3d',
  work: '#6b5c9e',
  study: '#3d6ea8',
  hobby: '#b85c7a',
  other: '#7a7468',
}

type Props = { items: Item[]; steps: Step[] }

function monthRange() {
  const [y, m] = todayISO().split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return { start, end, days: end.getDate() }
}

function parse(iso: string | null) {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function LifeTimeline({ items, steps }: Props) {
  const { start, end, days } = monthRange()
  const startMs = start.getTime()
  const span = end.getTime() - startMs || 1

  const rows = items
    .filter((it) => it.status === 'doing' || it.status === 'planned')
    .map((it) => {
      const mine = steps.filter((s) => s.itemId === it.id)
      const starts = mine.map((s) => parse(s.startDate)).filter(Boolean) as Date[]
      const dues = mine.map((s) => parse(s.dueDate)).filter(Boolean) as Date[]
      const from = starts.length ? new Date(Math.min(...starts.map((d) => d.getTime()))) : parse(it.dueDate) ?? start
      const to = dues.length ? new Date(Math.max(...dues.map((d) => d.getTime()))) : parse(it.dueDate) ?? end
      const left = Math.max(0, ((from.getTime() - startMs) / span) * 100)
      const right = Math.min(100, ((to.getTime() - startMs) / span) * 100)
      const width = Math.max(4, right - left)
      return { it, left, width, pct: itemProgress(it, steps) }
    })

  if (!rows.length) return <p className="empty">这个月还没有正在推进的事项。</p>

  return (
    <div className="timeline">
      {rows.map(({ it, left, width, pct }) => (
        <div className="tl-row" key={it.id}>
          <div className="tl-name">{it.title}</div>
          <div className="tl-track">
            <div
              className="tl-bar"
              style={{ left: `${left}%`, width: `${width}%`, background: COLORS[it.category], opacity: 0.35 + pct / 200 }}
              title={`${it.title} ${pct}%`}
            />
          </div>
        </div>
      ))}
      <div className="tl-axis">
        <span>1 日</span>
        <span>{Math.ceil(days / 2)} 日</span>
        <span>{days} 日</span>
      </div>
    </div>
  )
}
