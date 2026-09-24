import { useState } from 'react'
import { Heatmap } from '../components/Heatmap'
import { Kanban } from '../components/Kanban'
import { LifeTimeline } from '../components/LifeTimeline'
import { ProgressRing } from '../components/ProgressRing'
import { useStore } from '../context'
import { FormattedEditor, MdView } from '../components/FormattedText'
import { formatDate, itemProgress } from '../util'
import {
  CATEGORIES,
  CATEGORY_LABEL,
  ITEM_STATUSES,
  ITEM_STATUS_LABEL,
  type Category,
  type ItemStatus,
  type StepStatus,
} from '../types'

export function ItemDetail({ id }: { id: string }) {
  const { items, steps, logs, updateItem, deleteItem, addStep, updateStep, moveStep, deleteStep, addLog } =
    useStore()
  const item = items.find((i) => i.id === id)
  const [logText, setLogText] = useState('')
  const [tab, setTab] = useState<'board' | 'log' | 'more'>('board')

  if (!item) {
    return (
      <section className="card">
        <p>找不到这条事项。</p>
        <a className="back" href="#/item">
          ← 返回事项
        </a>
      </section>
    )
  }

  const mineSteps = steps.filter((s) => s.itemId === item.id)
  const mineLogs = logs.filter((l) => l.itemId === item.id)
  const pct = itemProgress(item, steps)

  return (
    <div className="stack">
      <section className="card hero">
        <div className="hero-main">
          <a className="back" href="#/item">
            ← 返回事项
          </a>
          <input
            className="title-field"
            value={item.title}
            onChange={(e) => updateItem(item.id, { title: e.target.value })}
          />
          <div className="props">
            <select
              value={item.category}
              onChange={(e) => updateItem(item.id, { category: e.target.value as Category })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>
            <select
              value={item.status}
              onChange={(e) => updateItem(item.id, { status: e.target.value as ItemStatus })}
            >
              {ITEM_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ITEM_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={item.dueDate ?? ''}
              onChange={(e) => updateItem(item.id, { dueDate: e.target.value || null })}
            />
          </div>
        </div>
        <ProgressRing value={pct} category={item.category} size={96} />
      </section>

      <div className="tabs">
        <button type="button" className={tab === 'board' ? 'on' : ''} onClick={() => setTab('board')}>
          步骤
        </button>
        <button type="button" className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
          日志
        </button>
        <button type="button" className={tab === 'more' ? 'on' : ''} onClick={() => setTab('more')}>
          更多
        </button>
      </div>

      {tab === 'board' && (
        <section className="board-wrap">
          <Kanban
            steps={mineSteps}
            onMove={moveStep}
            onUpdate={updateStep}
            onDelete={deleteStep}
            onAdd={(title, status: StepStatus) => addStep(item.id, title, { status })}
          />
        </section>
      )}

      {tab === 'log' && (
        <section className="card">
          <FormattedEditor
            value={logText}
            onChange={setLogText}
            rows={4}
            placeholder="今天推进了一点。可用 # 标题、## 子标题、- 或 1. 写列表，Ctrl+Enter 记下"
            onSubmit={() => {
              if (!logText.trim()) return
              addLog(item.id, logText.trim())
              setLogText('')
            }}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                if (!logText.trim()) return
                addLog(item.id, logText.trim())
                setLogText('')
              }}
            >
              记下
            </button>
          </div>
          {mineLogs.length ? (
            [...mineLogs]
              .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
              .map((log) => (
                <div className="log-line" key={log.id}>
                  <time>{formatDate(log.date)}</time>
                  <MdView text={log.text} />
                </div>
              ))
          ) : (
            <p className="empty">还没有写下过。</p>
          )}
        </section>
      )}

      {tab === 'more' && (
        <div className="stack">
          <section className="card">
            <h2>备注</h2>
            <FormattedEditor
              value={item.note}
              onChange={(note) => updateItem(item.id, { note })}
              rows={6}
              placeholder={'例如：\n# 周末\n## 出门前\n- 充电\n- 带钥匙\n\n1. 看天气\n2. 定时间'}
            />
            {!mineSteps.length && (
              <label className="field" style={{ marginTop: 12 }}>
                手工进度 {item.manualProgress ?? 0}%
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={item.manualProgress ?? 0}
                  onChange={(e) => updateItem(item.id, { manualProgress: Number(e.target.value) })}
                />
              </label>
            )}
          </section>
          <section className="card">
            <h2>时间</h2>
            <LifeTimeline items={[item]} steps={mineSteps} />
            <div style={{ marginTop: 16 }}>
              <Heatmap logs={mineLogs} weeks={12} />
            </div>
          </section>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              if (window.confirm(`删除事项「${item.title}」？步骤和日志也会一起删掉。`)) {
                deleteItem(item.id)
                window.location.hash = '#/item'
              }
            }}
          >
            删除这条事项
          </button>
        </div>
      )}
    </div>
  )
}
