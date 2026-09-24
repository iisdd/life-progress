import type { AppData, Category } from './types'
import { itemProgress } from './util'

export type DaySnap = {
  date: string
  savedAt: string
  data: AppData
}

export type Silhouette = {
  date: string
  doing: { id: string; title: string; category: Category; pct: number }[]
  logCount: number
  itemCount: number
}

export function silhouetteOf(snap: DaySnap): Silhouette {
  const items = snap.data.items.filter((i) => !i.archived)
  const doing = items
    .filter((i) => i.status === 'doing')
    .map((i) => ({
      id: i.id,
      title: i.title,
      category: i.category,
      pct: itemProgress(i, snap.data.steps),
    }))
  const logCount = snap.data.logs.filter((l) => l.date === snap.date).length
  return { date: snap.date, doing, logCount, itemCount: items.length }
}
