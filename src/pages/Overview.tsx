import { Heatmap } from '../components/Heatmap'
import { LifeTimeline } from '../components/LifeTimeline'
import { ProgressRing } from '../components/ProgressRing'
import { MdView } from '../components/FormattedText'
import { useStore } from '../context'
import { formatDate, itemProgress, todayISO, addDaysISO } from '../store'
import { ITEM_STATUS_LABEL } from '../types'

function cmp(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0
}

export function Overview() {
  const { activeItems, steps, logs } = useStore()
  const today = todayISO()
  const week = addDaysISO(today, 7)
  const doing = activeItems.filter((i) => i.status === 'doing')
  const overdue = activeItems.filter((i) => i.dueDate && i.dueDate < today && i.status !== 'done')
  const soon = activeItems.filter(
    (i) => i.dueDate && i.dueDate >= today && i.dueDate <= week && i.status !== 'done',
  )
  const recent = [...logs].sort((a, b) => cmp(b.date, a.date)).slice(0, 5)
  const byId = Object.fromEntries(activeItems.map((i) => [i.id, i]))

  return (
    <div className="stack">
      <div className="grid-2">
        <section className="card">
          <h2>正在做</h2>
          <div className="doing-list">
            {doing.length ? (
              doing.map((it) => (
                <a className="doing-row" key={it.id} href={`#/item/${it.id}`}>
                  <ProgressRing value={itemProgress(it, steps)} category={it.category} size={72} />
                  <div>
                    <b>{it.title}</b>
                    <span className="muted">{it.dueDate ? formatDate(it.dueDate) : '没有截止日期'}</span>
                  </div>
                </a>
              ))
            ) : (
              <p className="empty">
                还没有正在推进的事项。<a href="#/item">去添加</a>
              </p>
            )}
          </div>
        </section>
        <section className="card">
          <h2>这周</h2>
          {overdue.map((it) => (
            <a key={it.id} className="focus-card overdue" href={`#/item/${it.id}`}>
              <b>{it.title}</b>
              <span>过了 {formatDate(it.dueDate)}</span>
            </a>
          ))}
          {soon.map((it) => (
            <a key={it.id} className="focus-card soon" href={`#/item/${it.id}`}>
              <b>{it.title}</b>
              <span>
                {formatDate(it.dueDate)} · {ITEM_STATUS_LABEL[it.status]}
              </span>
            </a>
          ))}
          {!overdue.length && !soon.length && <p className="empty">这周没有赶点的事。</p>}
          {recent.length > 0 && (
            <div className="recent-mini">
              {recent.slice(0, 3).map((log) => (
                <div key={log.id} className="recent-item">
                  <span className="muted">
                    {formatDate(log.date)} · {byId[log.itemId]?.title ?? ''}
                  </span>
                  <MdView className="md-compact" text={log.text} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card">
        <h2>这个月</h2>
        <LifeTimeline items={activeItems} steps={steps} />
        <div className="heat-foot">
          <Heatmap logs={logs} />
        </div>
      </section>
    </div>
  )
}
