import { useCallback, useEffect, useState } from 'react'
import { MonitorUp, Music2, RefreshCw, ScreenShare, Square } from 'lucide-react'
import './openrgb.css'

const modes = [
  { id: 'ambilight', label: 'Screen', detail: 'Match what is on screen', icon: ScreenShare },
  { id: 'audio', label: 'Audio', detail: 'React to sound', icon: Music2 },
  { id: 'gaming', label: 'Gaming', detail: 'Use the gaming sync profile', icon: MonitorUp },
]

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.error || body.detail || `Request failed (${response.status})`)
  return body
}

export default function OpenRgbControl({ onSyncChange }) {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const next = await api('/api/openrgb/status')
      setStatus(next)
      setError('')
      onSyncChange?.(next.requestedMode !== 'off', next.requestedMode)
    } catch (err) {
      setStatus((current) => current ? { ...current, online: false } : null)
      setError(err.message)
      onSyncChange?.(false, 'off')
    }
  }, [onSyncChange])

  useEffect(() => {
    refresh()
    const timer = window.setInterval(refresh, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const start = async (mode) => {
    setBusy(true)
    setError('')
    try {
      const next = await api('/api/openrgb/start', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      })
      setStatus(next)
      onSyncChange?.(true, mode)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    setError('')
    try {
      const next = await api('/api/openrgb/stop', { method: 'POST' })
      setStatus(next)
      onSyncChange?.(false, 'off')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const online = Boolean(status?.online)
  const activeMode = status?.requestedMode || 'off'
  const active = activeMode !== 'off'

  return (
    <section className={`openrgb-card ${active ? 'active' : ''}`}>
      <div className="openrgb-heading">
        <div className="openrgb-title-row">
          <span className="sync-button-icon"><MonitorUp size={22} /></span>
          <div>
            <strong>Game Sync</strong>
            <small>{online ? `OpenRGB online · ${status?.host}` : 'Gaming PC / OpenRGB unavailable'}</small>
          </div>
        </div>
        <button className="openrgb-refresh" onClick={refresh} disabled={busy} aria-label="Refresh OpenRGB status">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="openrgb-status-row">
        <span className={`openrgb-status-dot ${online ? 'online' : ''}`} />
        <span>{online ? `SDK connected on port ${status?.sdkPort || 6742}` : 'Waiting for OpenRGB SDK server'}</span>
        {active && <strong>{activeMode}</strong>}
      </div>

      <div className="openrgb-modes">
        {modes.map((mode) => {
          const Icon = mode.icon
          const selected = activeMode === mode.id
          return (
            <button key={mode.id} className={`openrgb-mode ${selected ? 'selected' : ''}`} disabled={!online || busy} onClick={() => start(mode.id)}>
              <Icon size={18} />
              <span><strong>{mode.label}</strong><small>{mode.detail}</small></span>
            </button>
          )
        })}
      </div>

      {active && (
        <button className="openrgb-stop" onClick={stop} disabled={busy}>
          <Square size={14} /> Stop sync
        </button>
      )}

      {error && <p className="openrgb-error">{error}</p>}
      {!online && <p className="openrgb-help">Open OpenRGB on Michael's PC and enable the SDK server on TCP 6742. The control buttons unlock automatically when the LXC can reach it.</p>}
    </section>
  )
}
