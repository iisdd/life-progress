import type { LogEntry } from '../types'
import { addDaysISO, todayISO } from '../util'

type Props = { logs: LogEntry[]; weeks?: number }

export function Heatmap({ logs, weeks = 12 }: Props) {
  const counts = new Map<string, number>()
  for (const log of logs) counts.set(log.date, (counts.get(log.date) ?? 0) + 1)

  const today = todayISO()
  const weekday = new Date(`${today}T12:00:00`).getDay()
  const start = addDaysISO(today, -(weeks * 7 - 1) - weekday)

  const cells: { date: string; count: number }[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const key = addDaysISO(start, i)
    cells.push({ date: key, count: counts.get(key) ?? 0 })
  }

  return (
    <div className="heatmap" title="有日志的日子会点亮">
      {cells.map((cell) => {
        const lv = cell.count >= 3 ? 'lv3' : cell.count === 2 ? 'lv2' : cell.count === 1 ? 'lv1' : ''
        return <div key={cell.date} className={`heat-cell ${lv}`} title={`${cell.date} · ${cell.count} 条`} />
      })}
    </div>
  )
}
