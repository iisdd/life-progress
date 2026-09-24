import { useRef, type KeyboardEvent, type TextareaHTMLAttributes } from 'react'

function inline(text: string) {
  const parts: Array<string | { b: string }> = []
  const re = /\*\*(.+?)\*\*/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push({ b: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) =>
    typeof p === 'string' ? <span key={i}>{p}</span> : <strong key={i}>{p.b}</strong>,
  )
}

type NestedItem = { text: string; children: NestedList | null }
type NestedList = { type: 'ul' | 'ol'; start?: number; items: NestedItem[] }

type Block =
  | { type: 'h'; level: 1 | 2; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; list: NestedList }

function indentCols(ws: string) {
  let n = 0
  for (const ch of ws) n += ch === '\t' ? 2 : 1
  return n
}

function nestList(
  lines: { cols: number; kind: 'ul' | 'ol'; text: string; start?: number }[],
): NestedList {
  const root: NestedList = { type: lines[0]?.kind ?? 'ul', start: lines[0]?.start, items: [] }
  if (!lines.length) return root
  const cols = [...new Set(lines.map((l) => l.cols))].sort((a, b) => a - b)
  const levelOf = (c: number) => {
    let lv = 0
    for (let i = 0; i < cols.length; i += 1) if (cols[i] <= c) lv = i
    return lv
  }
  const stack: { lv: number; list: NestedList }[] = [{ lv: levelOf(lines[0].cols), list: root }]
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const lv = levelOf(line.cols)
    const item: NestedItem = { text: line.text, children: null }
    if (i === 0) {
      root.items.push(item)
      continue
    }
    const top = () => stack[stack.length - 1]
    if (lv > top().lv) {
      const prev = top().list.items[top().list.items.length - 1]
      if (prev) {
        prev.children = { type: line.kind, start: line.start, items: [item] }
        stack.push({ lv, list: prev.children })
        continue
      }
    }
    while (stack.length > 1 && lv < top().lv) stack.pop()
    top().list.items.push(item)
  }
  return root
}

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const heading = line.match(/^(#{1,2})\s*(.+)$/)
    const ul = line.match(/^(\s*)[-*•]\s+(.*)$/)
    const ol = line.match(/^(\s*)(\d+)[.)、]\s+(.*)$/)
    if (heading) {
      blocks.push({ type: 'h', level: heading[1].length === 1 ? 1 : 2, text: heading[2] })
      i += 1
      continue
    }
    if (ul || ol) {
      const run: { cols: number; kind: 'ul' | 'ol'; text: string; start?: number }[] = []
      while (i < lines.length) {
        const u = lines[i].match(/^(\s*)[-*•]\s+(.*)$/)
        const o = lines[i].match(/^(\s*)(\d+)[.)、]\s+(.*)$/)
        if (u) run.push({ cols: indentCols(u[1]), kind: 'ul', text: u[2] })
        else if (o) run.push({ cols: indentCols(o[1]), kind: 'ol', text: o[3], start: Number(o[2]) })
        else break
        i += 1
      }
      blocks.push({ type: 'list', list: nestList(run) })
      continue
    }
    if (line.trim() === '') {
      i += 1
      continue
    }
    const para = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !/^\s*(#{1,2}|[-*•]|\d+[.)、])\s*/.test(lines[i])) {
      para.push(lines[i])
      i += 1
    }
    blocks.push({ type: 'p', text: para.join('\n') })
  }
  return blocks
}

function renderList(list: NestedList, key: string | number) {
  const Tag = list.type === 'ol' ? 'ol' : 'ul'
  return (
    <Tag key={key} start={list.start}>
      {list.items.map((it, j) => (
        <li key={j}>
          {inline(it.text)}
          {it.children ? renderList(it.children, `${key}-${j}`) : null}
        </li>
      ))}
    </Tag>
  )
}

export function MdView({ text, className = '' }: { text: string; className?: string }) {
  if (!text.trim()) return null
  const blocks = parseBlocks(text)
  return (
    <div className={`md ${className}`}>
      {blocks.map((b, i) => {
        if (b.type === 'list') return renderList(b.list, i)
        if (b.type === 'h') {
          return (
            <div key={i} className={`md-h md-h${b.level}`}>
              {inline(b.text)}
            </div>
          )
        }
        return (
          <p key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {inline(b.text)}
          </p>
        )
      })}
    </div>
  )
}

function insert(value: string, start: number, end: number, snippet: string) {
  return {
    next: value.slice(0, start) + snippet + value.slice(end),
    caret: start + snippet.length,
  }
}

type EditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  onSubmit?: () => void
  tools?: 'full' | 'list'
  preview?: boolean
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>

export function FormattedEditor({
  value,
  onChange,
  placeholder,
  rows = 5,
  onSubmit,
  tools = 'full',
  preview,
  ...rest
}: EditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  function put(snippet: string) {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const end = el?.selectionEnd ?? value.length
    const { next, caret } = insert(value, start, end, snippet)
    onChange(next)
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  function putBullet() {
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const line = value.slice(lineStart).split('\n')[0] ?? ''
    const lead = line.match(/^(\s*)(?:[-*•]|\d+[.)、])\s/)
    if (!value.slice(lineStart, start).trim()) put(`${lead ? lead[1] : ''}- `)
    else put(`\n${lead ? lead[1] : ''}- `)
  }

  function replaceLineRange(from: number, to: number, nextChunk: string, caret: number) {
    const el = ref.current
    onChange(value.slice(0, from) + nextChunk + value.slice(to))
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  function indentLines(outdent: boolean) {
    const el = ref.current
    const start = el?.selectionStart ?? 0
    const end = el?.selectionEnd ?? start
    const from = value.lastIndexOf('\n', start - 1) + 1
    const nl = value.indexOf('\n', end)
    const to = nl === -1 ? value.length : nl
    const chunk = value.slice(from, to)
    const next = chunk
      .split('\n')
      .map((line) => {
        if (outdent) {
          if (line.startsWith('\t')) return line.slice(1)
          if (line.startsWith('  ')) return line.slice(2)
          if (line.startsWith(' ')) return line.slice(1)
          return line
        }
        return `  ${line}`
      })
      .join('\n')
    const delta = next.length - chunk.length
    replaceLineRange(from, to, next, Math.max(from, end + delta))
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && onSubmit) {
      e.preventDefault()
      onSubmit()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      indentLines(e.shiftKey)
      return
    }
    if (e.key !== 'Enter' || e.shiftKey || e.ctrlKey || e.metaKey) return
    const el = e.currentTarget
    const start = el.selectionStart
    const line = value.slice(0, start).split('\n').pop() ?? ''
    const ul = line.match(/^(\s*)([-*•])\s(.*)$/)
    const ol = line.match(/^(\s*)(\d+)[.)、]\s(.*)$/)
    if (ul) {
      e.preventDefault()
      if (!ul[3].trim()) {
        if (ul[1].length) {
          const less = ul[1].startsWith('\t') ? ul[1].slice(1) : ul[1].replace(/ {1,2}$/, '')
          const lineStart = start - line.length
          replaceLineRange(lineStart, start, `${less}- `, lineStart + less.length + 2)
          return
        }
        const cut = start - line.length
        onChange(value.slice(0, cut) + value.slice(start))
        requestAnimationFrame(() => el.setSelectionRange(cut, cut))
        return
      }
      put(`\n${ul[1]}- `)
      return
    }
    if (ol) {
      e.preventDefault()
      if (!ol[3].trim()) {
        if (ol[1].length) {
          const less = ol[1].startsWith('\t') ? ol[1].slice(1) : ol[1].replace(/ {1,2}$/, '')
          const lineStart = start - line.length
          replaceLineRange(lineStart, start, `${less}1. `, lineStart + less.length + 3)
          return
        }
        const cut = start - line.length
        onChange(value.slice(0, cut) + value.slice(start))
        requestAnimationFrame(() => el.setSelectionRange(cut, cut))
        return
      }
      put(`\n${ol[1]}${Number(ol[2]) + 1}. `)
    }
  }

  function putHeading(level: 1 | 2) {
    const marker = level === 1 ? '# ' : '## '
    const el = ref.current
    const start = el?.selectionStart ?? value.length
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const nl = value.indexOf('\n', lineStart)
    const lineEnd = nl === -1 ? value.length : nl
    const line = value.slice(lineStart, lineEnd)
    const stripped = line.replace(/^#{1,2}\s*/, '')
    const nextLine = marker + stripped
    onChange(value.slice(0, lineStart) + nextLine + value.slice(lineEnd))
    const caret = lineStart + nextLine.length
    requestAnimationFrame(() => {
      el?.focus()
      el?.setSelectionRange(caret, caret)
    })
  }

  return (
    <div className="fmt">
      <div className="fmt-bar">
        {tools === 'full' && (
          <>
            <button type="button" className="btn ghost" onClick={() => putHeading(1)}>
              标题
            </button>
            <button type="button" className="btn ghost" onClick={() => putHeading(2)}>
              子标题
            </button>
          </>
        )}
        <button type="button" className="btn ghost" onClick={putBullet}>
          · 列表
        </button>
        <button type="button" className="btn ghost" onClick={() => put('1. ')}>
          1. 列表
        </button>
        <span className="muted">
          {tools === 'list' ? 'Enter 续行，Tab 缩进' : 'Enter 续行，Tab 缩进；日志可用 Ctrl+Enter 提交'}
        </span>
      </div>
      <textarea
        {...rest}
        ref={ref}
        rows={rows}
        placeholder={placeholder ?? '可用 # 标题、## 子标题、- 列表、1. 2. 3.'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {preview !== false && value.trim() ? (
        <div className="fmt-preview">
          <MdView text={value} />
        </div>
      ) : null}
    </div>
  )
}
