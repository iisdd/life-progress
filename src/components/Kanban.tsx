import { useState, type FormEvent, type KeyboardEvent, type MouseEvent } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { STEP_STATUSES, STEP_STATUS_LABEL, type Step, type StepCheck, type StepStatus } from '../types'
import { uid } from '../store'
import { formatDate } from '../util'
import { FormattedEditor } from './FormattedText'

function checksToList(checks: StepCheck[]) {
  if (!checks.length) return '- '
  return checks.map((c) => `${'  '.repeat(c.indent ?? 0)}- ${c.text}`).join('\n')
}

function listToChecks(text: string, prev: StepCheck[]): StepCheck[] {
  const bodies = text.replace(/\r\n/g, '\n').split('\n').flatMap((line) => {
    const m = line.match(/^(\s*)(?:[-*•]|\d+[.)、])\s+(.*)$/) ?? line.match(/^(\s*)(.*)$/)
    if (!m) return []
    const raw = m[2].replace(/^\[[ xX]\]\s*/, '').trim()
    if (!raw) return []
    let cols = 0
    for (const ch of m[1]) cols += ch === '\t' ? 2 : 1
    return [{ text: raw, indent: Math.min(6, Math.floor(cols / 2)) }]
  })
  return bodies.map((item, i) => ({
    id: prev[i]?.id ?? uid(),
    text: item.text,
    indent: item.indent,
    done: prev[i]?.text === item.text ? prev[i].done : (prev.find((p) => p.text === item.text)?.done ?? false),
  }))
}

type Props = {
  steps: Step[]
  onMove: (id: string, status: StepStatus, overStepId?: string) => void
  onUpdate: (id: string, partial: Partial<Step>) => void
  onDelete: (id: string) => void
  onAdd: (title: string, status: StepStatus) => void
}

function Chip({
  step,
  onUpdate,
  onDelete,
}: {
  step: Step
  onUpdate: Props['onUpdate']
  onDelete: Props['onDelete']
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(step.title)
  const [listDraft, setListDraft] = useState('')
  const [startDate, setStartDate] = useState(step.startDate ?? '')
  const [dueDate, setDueDate] = useState(step.dueDate ?? '')
  const checksNow = step.checks ?? []

  function startEdit(e?: MouseEvent) {
    e?.stopPropagation()
    setTitle(step.title)
    setListDraft(checksToList(step.checks ?? []))
    setStartDate(step.startDate ?? '')
    setDueDate(step.dueDate ?? '')
    setEditing(true)
  }

  function save(e?: FormEvent) {
    e?.preventDefault()
    const next = title.trim()
    if (!next) return
    onUpdate(step.id, {
      title: next,
      checks: listToChecks(listDraft, step.checks ?? []),
      startDate: startDate || null,
      dueDate: dueDate || null,
    })
    setEditing(false)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditing(false)
      setTitle(step.title)
      setListDraft(checksToList(step.checks ?? []))
    }
  }

  function toggleCheck(id: string) {
    onUpdate(step.id, {
      checks: checksNow.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    })
  }

  function remove(e: MouseEvent) {
    e.stopPropagation()
    if (window.confirm(`删除步骤「${step.title}」？`)) onDelete(step.id)
  }

  return (
    <div className="chip" ref={setNodeRef} style={style}>
      <button className="chip-handle" type="button" aria-label="拖动" {...attributes} {...listeners}>
        ⋮⋮
      </button>
      <div className="chip-body">
        {editing ? (
          <form className="chip-edit" onSubmit={save} onKeyDown={onKey}>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="总标题"
              aria-label="总标题"
            />
            <div className="check-edit">
              <FormattedEditor
                tools="list"
                value={listDraft}
                onChange={setListDraft}
                rows={5}
                placeholder={'- 买菜\n- 洗碗\n  - 先泡着'}
                onSubmit={save}
              />
            </div>
            <div className="chip-dates">
              <label>
                开始
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                截止
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </label>
            </div>
            <div className="row">
              <button className="btn primary" type="submit">
                保存
              </button>
              <button className="btn ghost" type="button" onClick={() => setEditing(false)}>
                取消
              </button>
            </div>
          </form>
        ) : (
          <div className="chip-plain">
            <button type="button" className="chip-title" onDoubleClick={() => startEdit()}>
              {step.title}
            </button>
            {checksNow.length > 0 && (
              <ul className="chip-checks">
                {checksNow.map((c) => (
                  <li key={c.id}>
                    <label
                      className={c.done ? 'is-done' : undefined}
                      style={{ paddingLeft: (c.indent ?? 0) * 16 }}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleCheck(c.id)}
                      />
                      <span>{c.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {(step.startDate || step.dueDate) && (
              <small>
                {formatDate(step.startDate) || '—'} → {formatDate(step.dueDate) || '—'}
              </small>
            )}
          </div>
        )}
      </div>
      {!editing && (
        <div className="chip-acts">
          <button type="button" aria-label="修改" title="修改" onClick={startEdit}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M11.7 2.3a1 1 0 0 1 1.4 0l.6.6a1 1 0 0 1 0 1.4L6.4 11.6 3 12.7l1.1-3.4 7.6-7zM3 14h10v1H3z"
              />
            </svg>
          </button>
          <button type="button" aria-label="删除" title="删除" onClick={remove}>
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="M4.3 4.3a1 1 0 0 1 1.4 0L8 6.6l2.3-2.3a1 1 0 1 1 1.4 1.4L9.4 8l2.3 2.3a1 1 0 0 1-1.4 1.4L8 9.4l-2.3 2.3a1 1 0 0 1-1.4-1.4L6.6 8 4.3 5.7a1 1 0 0 1 0-1.4z"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function Column({
  id,
  steps,
  onUpdate,
  onDelete,
  onAdd,
}: {
  id: StepStatus
  steps: Step[]
  onUpdate: Props['onUpdate']
  onDelete: Props['onDelete']
  onAdd: Props['onAdd']
}) {
  const { setNodeRef } = useDroppable({ id })
  const [draft, setDraft] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    onAdd(draft.trim(), id)
    setDraft('')
  }

  return (
    <div className="col" ref={setNodeRef}>
      <h3>
        {STEP_STATUS_LABEL[id]}
        <em>{steps.length}</em>
      </h3>
      <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        {steps.map((step) => (
          <Chip key={step.id} step={step} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </SortableContext>
      <form className="col-add" onSubmit={submit}>
        <input
          placeholder="总标题，回车添加"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      </form>
    </div>
  )
}

export function Kanban({ steps, onMove, onUpdate, onDelete, onAdd }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const byCol: Record<StepStatus, Step[]> = { todo: [], doing: [], done: [] }
  for (const s of [...steps].sort((a, b) => a.order - b.order)) byCol[s.status].push(s)

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over) return
    const overId = String(over.id)
    const activeId = String(active.id)
    if (activeId === overId) return
    const overIsCol = STEP_STATUSES.includes(overId as StepStatus)
    const nextStatus = overIsCol ? (overId as StepStatus) : steps.find((s) => s.id === overId)?.status
    if (!nextStatus) return
    onMove(activeId, nextStatus, overIsCol ? undefined : overId)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="kanban">
        {STEP_STATUSES.map((st) => (
          <Column
            key={st}
            id={st}
            steps={byCol[st]}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onAdd={onAdd}
          />
        ))}
      </div>
    </DndContext>
  )
}
