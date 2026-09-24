import type { AppData } from './types'
import type { DaySnap } from './snapshots'

const LS_STATE = 'life-progress-v2'
const LS_SNAPS = 'life-progress-snaps-v1'

export async function apiGetState(): Promise<AppData | null> {
  try {
    const res = await fetch('/api/state')
    if (!res.ok) return null
    const data = (await res.json()) as AppData
    if (!data.items || !data.steps || !data.logs) return null
    return data
  } catch {
    return null
  }
}

export async function apiPutState(data: AppData): Promise<boolean> {
  try {
    const res = await fetch('/api/state', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function apiGetSnaps(): Promise<DaySnap[] | null> {
  try {
    const res = await fetch('/api/snaps')
    if (!res.ok) return null
    const parsed = (await res.json()) as { days?: DaySnap[] }
    if (!Array.isArray(parsed.days)) return []
    return parsed.days.filter((d) => d.date && d.data?.items)
  } catch {
    return null
  }
}

export async function apiPutSnap(snap: DaySnap): Promise<DaySnap[] | null> {
  try {
    const res = await fetch(`/api/snaps/${snap.date}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(snap),
    })
    if (!res.ok) return null
    const parsed = (await res.json()) as { days?: DaySnap[] }
    return parsed.days ?? null
  } catch {
    return null
  }
}

export function localState(): AppData | null {
  try {
    const raw = localStorage.getItem(LS_STATE)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppData
    if (!parsed.items || !parsed.steps || !parsed.logs) return null
    return parsed
  } catch {
    return null
  }
}

export function localSnaps(): DaySnap[] {
  try {
    const raw = localStorage.getItem(LS_SNAPS)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { days?: DaySnap[] }
    return Array.isArray(parsed.days) ? parsed.days : []
  } catch {
    return []
  }
}
