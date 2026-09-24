import { useState, type FormEvent } from 'react'
import { useStore } from '../context'
import { formatDate, itemProgress } from '../store'
import { CATEGORIES, CATEGORY_LABEL, ITEM_STATUS_LABEL, type Category } from '../types'

function nextStep(itemId: string, steps: { itemId: string; status: string; title: string; order: number }[]) {
  const mine = steps.filter((s) => s.itemId === itemId).sort((a, b) => a.order - b.order)
  return mine.find((s) => s.status !== 'done')?.title
}

export function Wall() {
  const { activeItems, steps, addItem, deleteItem } = useStore()
  const [filter, setFilter] = useState<Category | 'all' | 'doing'>('doing')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('life')

  const shown = activeItems.filter((it) => {
    if (filter === 'all') return true
    if (filter === 'doing') return it.status === 'doing'
    return it.category === filter
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const id = addItem({
      title: title.trim(),
      category,
      status: 'doing',
      dueDate: null,
      note: '',
      manualProgress: 0,
    })
    setTitle('')
    window.location.hash = `#/item/${id}`
  }

  return (
    <div>
      <form className="quick-add" onSubmit={submit}>
        <input
          autoFocus
          placeholder="添加事项，回车进入"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value as Category)} aria-label="分类">
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </form>

      <div className="filters">
        <button className="btn" aria-pressed={filter === 'doing'} onClick={() => setFilter('doing')}>
          正在做
        </button>
        <button className="btn" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>
          全部
        </button>
        {CATEGORIES.map((c) => (
          <button key={c} className="btn" aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {CATEGORY_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="work-list">
        {shown.map((it) => {
          const pct = itemProgress(it, steps)
          const next = nextStep(it.id, steps)
          return (
            <a className="work-row" key={it.id} href={`#/item/${it.id}`}>
              <i className={`mark cat-${it.category}`} />
              <div>
                <b>{it.title}</b>
                <span className="muted">
                  {ITEM_STATUS_LABEL[it.status]}
                  {it.dueDate ? ` · ${formatDate(it.dueDate)}` : ''}
                  {next ? ` · ${next}` : ''}
                </span>
              </div>
              <em>{pct}%</em>
              <button
                type="button"
                className="row-del"
                aria-label="删除事项"
                title="删除"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (window.confirm(`删除事项「${it.title}」？步骤和日志也会一起删掉。`)) {
                    deleteItem(it.id)
                  }
                }}
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M4.3 4.3a1 1 0 0 1 1.4 0L8 6.6l2.3-2.3a1 1 0 1 1 1.4 1.4L9.4 8l2.3 2.3a1 1 0 0 1-1.4 1.4L8 9.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L6.6 8 4.3 5.7a1 1 0 0 1 0-1.4z"
                  />
                </svg>
              </button>
            </a>
          )
        })}
        {!shown.length && <p className="empty">这一栏是空的。上面回车就能加一条。</p>}
      </div>
    </div>
  )
}
