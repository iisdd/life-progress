import { useMemo, useState } from 'react'
import { SnapCard } from '../components/SnapCard'
import { useStore } from '../context'
import { formatClock, formatDate } from '../util'
import { silhouetteOf } from '../snapshots'

export function Snapshots({ date }: { date?: string }) {
  const { restoreSnap, snaps } = useStore()
  const [msg, setMsg] = useState('')
  const list = snaps
  const selected = useMemo(() => {
    const want = date ?? list[0]?.date
    if (!want) return undefined
    return list.find((d) => d.date === want)
  }, [date, list])

  const sils = list.map(silhouetteOf)
  const sil = selected ? silhouetteOf(selected) : undefined

  function restore() {
    if (!selected) return
    const ok = window.confirm(
      `用 ${selected.date} 的剪影覆盖当前进度？\n覆盖前会先把此刻存进「今天」的剪影，过往日期不会改。`,
    )
    if (!ok) return
    restoreSnap(selected.date)
    setMsg(`已回到 ${selected.date} 的状态。`)
  }

  return (
    <div className="stack">
      <section className="card">
        <h2>按天剪影</h2>
        <p className="muted">
          改完会马上写入 data/current.json，并按北京时间记到当天剪影。昨天及更早冻结，最多 90 天。
        </p>
        {sils.length ? (
          <div className="snap-strip">
            {sils.map((s) => (
              <SnapCard key={s.date} sil={s} href={`#/snaps/${s.date}`} selected={s.date === selected?.date} />
            ))}
          </div>
        ) : (
          <p className="empty">还没有剪影。改一处事项或刷新后，今天会留下第一份。</p>
        )}
      </section>

      {selected && sil && (
        <section className="card">
          <h2>{formatDate(selected.date)} 的样子</h2>
          <p className="muted">
            存于 {formatClock(selected.savedAt)} · {sil.itemCount} 条事项
          </p>
          <ul className="snap-list">
            {sil.doing.map((d) => (
              <li key={d.id}>
                <span className={`stripe cat-${d.category}`} />
                <b>{d.title}</b>
                <span className="muted">{d.pct}%</span>
              </li>
            ))}
            {!sil.doing.length && <li className="muted">那天没有「正在做」。</li>}
          </ul>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" type="button" onClick={restore}>
              用这天覆盖当前
            </button>
            {msg ? <span className="muted">{msg}</span> : null}
          </div>
        </section>
      )}
    </div>
  )
}
