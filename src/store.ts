import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AppData, Item, ItemStatus, LogEntry, Step, StepCheck, StepStatus } from './types'
import { seedData } from './seed'
import { apiGetSnaps, apiGetState, apiPutSnap, apiPutState, localSnaps, localState } from './persist'
import type { DaySnap } from './snapshots'
import { todayISO } from './util'

export { itemProgress, todayISO, formatDate, formatClock, addDaysISO } from './util'

export function uid() {
  return crypto.randomUUID()
}

function checksFrom(s: Step & { subtitle?: string }): StepCheck[] {
  if (Array.isArray(s.checks) && s.checks.length) {
    return s.checks.map((c, i) => ({
      id: c.id || `c-${i}`,
      text: c.text ?? '',
      done: Boolean(c.done),
      indent: Math.max(0, Number(c.indent) || 0),
    }))
  }
  return (s.subtitle ?? '')
    .split(/\r?\n/)
    .flatMap((line, i) => {
      const t = line.trim()
      if (!t) return []
      const m = t.match(/^(?:[-*•]\s*)?\[([ xX])\]\s*(.*)$/)
      if (m) return [{ id: `c-${i}`, text: m[2], done: /x/i.test(m[1]), indent: 0 }]
      return [{ id: `c-${i}`, text: t, done: false, indent: 0 }]
    })
}

function hydrate(raw: AppData): AppData {
  return {
    items: raw.items ?? [],
    logs: raw.logs ?? [],
    steps: (raw.steps ?? []).map((s) => {
      const rawStep = s as Step & { subtitle?: string }
      return {
        id: rawStep.id,
        itemId: rawStep.itemId,
        title: rawStep.title,
        checks: checksFrom(rawStep),
        status: rawStep.status,
        startDate: rawStep.startDate ?? null,
        dueDate: rawStep.dueDate ?? null,
        order: rawStep.order,
      }
    }),
  }
}

export type PersistMode = 'loading' | 'file' | 'browser'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function useAppStore() {
  const [data, setData] = useState<AppData>(() => hydrate(seedData()))
  const [snaps, setSnaps] = useState<DaySnap[]>([])
  const [persist, setPersist] = useState<PersistMode>('loading')
  const [ready, setReady] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const skipTodaySnap = useRef(false)
  const persistRef = useRef<PersistMode>('loading')
  const dataRef = useRef(data)
  persistRef.current = persist
  dataRef.current = data

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const file = await apiGetState()
      const fromLs = localState()
      const next = hydrate(file ?? fromLs ?? seedData())
      if (cancelled) return
      setData(next)

      const fileSnaps = await apiGetSnaps()
      if (cancelled) return
      if (fileSnaps) {
        setSnaps(fileSnaps)
        setPersist('file')
        if (!file) await apiPutState(next)
        if (!fileSnaps.length) {
          const today: DaySnap = { date: todayISO(), savedAt: new Date().toISOString(), data: next }
          const saved = await apiPutSnap(today)
          if (saved) setSnaps(saved)
        }
      } else {
        setSnaps(localSnaps())
        setPersist('browser')
      }
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const mode = persistRef.current
    setSaveState('saving')
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          if (mode === 'file') {
            const ok = await apiPutState(data)
            if (!ok) throw new Error('write failed')
          }
          if (!skipTodaySnap.current) {
            const snap: DaySnap = { date: todayISO(), savedAt: new Date().toISOString(), data }
            if (mode === 'file') {
              const days = await apiPutSnap(snap)
              if (days) setSnaps(days)
            } else {
              setSnaps((prev) => {
                const rest = prev.filter((d) => d.date !== snap.date)
                return [snap, ...rest].slice(0, 90)
              })
            }
          } else {
            skipTodaySnap.current = false
          }
          setSavedAt(new Date().toISOString())
          setSaveState('saved')
        } catch {
          setSaveState('error')
        }
      })()
    }, 180)
    return () => window.clearTimeout(t)
  }, [data, ready])

  useEffect(() => {
    function flush() {
      if (!ready || persistRef.current !== 'file') return
      void apiPutState(dataRef.current)
    }
    function onHide() {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [ready])

  const patch = useCallback((fn: (prev: AppData) => AppData) => {
    setData((prev) => fn(prev))
  }, [])

  const addItem = useCallback(
    (item: Omit<Item, 'id' | 'createdAt' | 'archived'>) => {
      const next: Item = {
        ...item,
        id: uid(),
        archived: false,
        createdAt: new Date().toISOString(),
      }
      patch((p) => ({ ...p, items: [next, ...p.items] }))
      return next.id
    },
    [patch],
  )

  const updateItem = useCallback(
    (id: string, partial: Partial<Item>) => {
      patch((p) => ({
        ...p,
        items: p.items.map((it) => (it.id === id ? { ...it, ...partial } : it)),
      }))
    },
    [patch],
  )

  const deleteItem = useCallback((id: string) => {
    patch((p) => ({
      items: p.items.filter((it) => it.id !== id),
      steps: p.steps.filter((s) => s.itemId !== id),
      logs: p.logs.filter((l) => l.itemId !== id),
    }))
  }, [patch])

  const setItemStatus = useCallback(
    (id: string, status: ItemStatus) => updateItem(id, { status }),
    [updateItem],
  )

  const addStep = useCallback(
    (itemId: string, title: string, extra?: { status?: StepStatus; startDate?: string | null; dueDate?: string | null }) => {
      patch((p) => {
        const order = p.steps.filter((s) => s.itemId === itemId).length
        const step: Step = {
          id: uid(),
          itemId,
          title,
          checks: [],
          status: extra?.status ?? 'todo',
          startDate: extra?.startDate ?? null,
          dueDate: extra?.dueDate ?? null,
          order,
        }
        return { ...p, steps: [...p.steps, step] }
      })
    },
    [patch],
  )

  const updateStep = useCallback(
    (id: string, partial: Partial<Step>) => {
      patch((p) => ({
        ...p,
        steps: p.steps.map((s) => (s.id === id ? { ...s, ...partial } : s)),
      }))
    },
    [patch],
  )

  const moveStep = useCallback(
    (id: string, status: StepStatus, overStepId?: string) => {
      patch((p) => {
        const moving = p.steps.find((s) => s.id === id)
        if (!moving) return p
        const dest = p.steps
          .filter((s) => s.itemId === moving.itemId && s.id !== id && s.status === status)
          .sort((a, b) => a.order - b.order)
        let at = dest.length
        if (overStepId) {
          const i = dest.findIndex((s) => s.id === overStepId)
          if (i >= 0) at = i
        }
        dest.splice(at, 0, { ...moving, status })
        const nextOrder = new Map(dest.map((s, i) => [s.id, i]))
        return {
          ...p,
          steps: p.steps.map((s) => {
            if (s.id === id) return { ...s, status, order: nextOrder.get(id) ?? s.order }
            const order = nextOrder.get(s.id)
            return order === undefined ? s : { ...s, order }
          }),
        }
      })
    },
    [patch],
  )

  const deleteStep = useCallback((id: string) => {
    patch((p) => ({ ...p, steps: p.steps.filter((s) => s.id !== id) }))
  }, [patch])

  const addLog = useCallback(
    (itemId: string, text: string, date = todayISO()) => {
      const entry: LogEntry = { id: uid(), itemId, date, text }
      patch((p) => ({ ...p, logs: [entry, ...p.logs] }))
    },
    [patch],
  )

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `生活进度-${todayISO()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [data])

  const importJson = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppData
        if (!parsed.items || !parsed.steps || !parsed.logs) throw new Error('bad')
        setData(hydrate(parsed))
      } catch {
        alert('导入失败：文件格式不对')
      }
    }
    reader.readAsText(file)
  }, [])

  const restoreSnap = useCallback(
    (date: string) => {
      const snap = snaps.find((d) => d.date === date)
      if (!snap) return
      const today: DaySnap = { date: todayISO(), savedAt: new Date().toISOString(), data }
      skipTodaySnap.current = true
      if (persistRef.current === 'file') void apiPutSnap(today)
      else {
        setSnaps((prev) => {
          const rest = prev.filter((d) => d.date !== today.date)
          return [today, ...rest]
        })
      }
      setData(hydrate(snap.data))
    },
    [data, snaps],
  )

  const activeItems = useMemo(() => data.items.filter((i) => !i.archived), [data.items])

  return {
    ...data,
    snaps,
    persist,
    saveState,
    savedAt,
    ready,
    activeItems,
    addItem,
    updateItem,
    deleteItem,
    setItemStatus,
    addStep,
    updateStep,
    moveStep,
    deleteStep,
    addLog,
    exportJson,
    importJson,
    restoreSnap,
  }
}

export type Store = ReturnType<typeof useAppStore>
