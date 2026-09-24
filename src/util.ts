import type { Item, Step } from './types'

export const CHINA_TZ = 'Asia/Shanghai'

function chinaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: CHINA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? ''
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

export function todayISO(date = new Date()) {
  const p = chinaParts(date)
  return `${p.year}-${p.month}-${p.day}`
}

export function formatClock(value: string | Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const p = chinaParts(date)
  return `${p.hour}:${p.minute}`
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  if (!m || !d) return iso
  return `${Number(m)}月${Number(d)}日`
}

export function addDaysISO(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${dt.getFullYear()}-${mm}-${dd}`
}

export function itemProgress(item: Item, steps: Step[]) {
  const mine = steps.filter((s) => s.itemId === item.id)
  if (!mine.length) return item.manualProgress ?? 0
  const parts = mine.map((s) => {
    if (s.status === 'done') return 1
    const checks = s.checks ?? []
    if (!checks.length) return 0
    return checks.filter((c) => c.done).length / checks.length
  })
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100)
}
