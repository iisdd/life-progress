import type { Silhouette } from '../snapshots'

type Props = {
  sil: Silhouette
  href?: string
  selected?: boolean
}

export function SnapCard({ sil, href, selected }: Props) {
  const inner = (
    <>
      <div className="snap-date">{sil.date.slice(5)}</div>
      <div className="snap-bars">
        {sil.doing.length ? (
          sil.doing.slice(0, 4).map((d) => (
            <div className="bar snap-bar" key={d.id} title={`${d.title} ${d.pct}%`}>
              <i className={`cat-${d.category}`} style={{ width: `${Math.max(8, d.pct)}%` }} />
            </div>
          ))
        ) : (
          <div className="bar snap-bar" />
        )}
      </div>
      <div className="muted">
        {sil.doing.length} 件在做 · {sil.logCount} 条日志
      </div>
    </>
  )
  if (href) {
    return (
      <a className={`snap-card${selected ? ' selected' : ''}`} href={href}>
        {inner}
      </a>
    )
  }
  return <div className={`snap-card${selected ? ' selected' : ''}`}>{inner}</div>
}
