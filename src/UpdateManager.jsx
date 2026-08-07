import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'
import './update-manager.css'

export default function UpdateManager() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [updateKey, setUpdateKey] = useState('')

  const check = async () => {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/update/status')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Update check failed')
      setStatus(data)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  const apply = async () => {
    setBusy(true)
    setMessage('Installing update…')
    try {
      const response = await fetch('/api/update/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Update-Key': updateKey,
        },
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Update failed')
      if (!data.updated) {
        setStatus(data)
        setMessage('Already up to date.')
        return
      }
      setMessage('Update installed. Restarting…')
      window.setTimeout(() => window.location.reload(), 4000)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-group update-settings">
      <div className="settings-title">
        <Download size={18} />
        <div>
          <strong>Software update</strong>
          <small>Update this controller from the latest version on GitHub.</small>
        </div>
      </div>

      {status && (
        <div className="update-status">
          <span>{status.updateAvailable ? 'Update available' : 'Up to date'}</span>
          <small>
            {status.updateAvailable
              ? `${status.commitsBehind} change${status.commitsBehind === 1 ? '' : 's'} behind main`
              : `Running ${status.current?.slice(0, 7)}`}
          </small>
        </div>
      )}

      {status?.updateAvailable && (
        <label className="update-key-field">
          <span>Update key</span>
          <input
            type="password"
            value={updateKey}
            onChange={(event) => setUpdateKey(event.target.value)}
            autoComplete="off"
            placeholder="Enter update key"
          />
        </label>
      )}

      <div className="update-actions">
        <button type="button" onClick={check} disabled={busy}>
          <RefreshCw size={15} className={busy ? 'spinning' : ''} />
          Check for updates
        </button>
        {status?.updateAvailable && (
          <button type="button" className="update-primary" onClick={apply} disabled={busy || !updateKey}>
            <Download size={15} />
            Install update
          </button>
        )}
      </div>

      {message && <small className="update-message">{message}</small>}
    </div>
  )
}
