import { useEffect, useState, type ChangeEvent } from 'react'
import { StoreProvider, useStore } from './context'
import { formatClock } from './util'
import { ItemDetail } from './pages/ItemDetail'
import { Overview } from './pages/Overview'
import { Snapshots } from './pages/Snapshots'
import { Wall } from './pages/Wall'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash || '#/')
  useEffect(() => {
    const on = () => setHash(window.location.hash || '#/')
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

function Shell() {
  const hash = useHash()
  const { exportJson, importJson, persist, saveState, savedAt, ready } = useStore()
  const itemMatch = hash.match(/^#\/item\/([^/?#]+)$/)
  const snapMatch = hash.match(/^#\/snaps(?:\/(.+))?$/)
  const itemList = /^#\/item\/?$/.test(hash)
  const page = itemMatch ? 'item' : snapMatch ? 'snaps' : hash.startsWith('#/wall') || itemList ? 'wall' : 'home'

  function onImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) importJson(file)
    e.target.value = ''
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-row">
          <a className="brand" href="#/">
            <h1>生活进度</h1>
          </a>
          <nav className="seg">
            <a href="#/" className={page === 'home' ? 'active' : ''}>
              总览
            </a>
            <a href="#/item" className={page === 'wall' || page === 'item' ? 'active' : ''}>
              事项
            </a>
            <a href="#/snaps" className={page === 'snaps' ? 'active' : ''}>
              剪影
            </a>
          </nav>
        </div>
        <div className="toolbar">
          <span className="status">
            <i className={`dot${saveState === 'error' || persist === 'browser' ? ' warn' : ''}`} />
            {saveState === 'saving'
              ? '保存中'
              : saveState === 'error'
                ? '未保存'
                : persist === 'file'
                  ? savedAt
                    ? `已保存 ${formatClock(savedAt)}`
                    : '已保存'
                  : persist === 'browser'
                    ? '仅浏览器'
                    : '…'}
          </span>
          <button className="btn ghost" type="button" onClick={exportJson}>
            导出
          </button>
          <label className="btn ghost">
            导入
            <input className="hidden-file" type="file" accept="application/json" onChange={onImport} />
          </label>
        </div>
      </header>
      {!ready ? (
        <p className="muted">正在读取 data 文件夹…</p>
      ) : (
        <>
          {page === 'home' && <Overview />}
          {page === 'wall' && <Wall />}
          {page === 'snaps' && <Snapshots date={snapMatch?.[1]} />}
          {page === 'item' && itemMatch && <ItemDetail id={decodeURIComponent(itemMatch[1])} />}
        </>
      )}
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
