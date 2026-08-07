import { useEffect, useRef, useState } from 'react'
import {
  Gamepad2, MoonStar, Flame, Waves, Palette, MonitorUp, Power,
  SlidersHorizontal, Wifi, WifiOff, Sparkles, Settings, Volume2,
  Image as ImageIcon, X, ShieldAlert,
} from 'lucide-react'
import { getLightState, updateLightState } from './wled.js'
import UpdateManager from './UpdateManager.jsx'
import './settings.css'

const scenes = [
  { id: 'gaming', name: 'Gaming', detail: 'Punchy purple + blue', icon: Gamepad2, colors: ['#7c3aed', '#2563eb'] },
  { id: 'ambient', name: 'Ambient', detail: 'Soft room glow', icon: Sparkles, colors: ['#0ea5e9', '#14b8a6'] },
  { id: 'chill', name: 'Chill', detail: 'Slow and low', icon: MoonStar, colors: ['#4338ca', '#9333ea'] },
  { id: 'fire', name: 'Ember', detail: 'Warm flicker', icon: Flame, colors: ['#ef4444', '#f59e0b'] },
  { id: 'wave', name: 'Wave', detail: 'Color movement', icon: Waves, colors: ['#06b6d4', '#8b5cf6'] },
  { id: 'solid', name: 'Solid', detail: 'One clean color', icon: Palette, colors: ['#8b5cf6', '#8b5cf6'] },
]

const quickColors = ['#8b5cf6', '#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#f8fafc']
const defaultPrefs = { backgroundColor: '#050509', backgroundImage: '', alertEnabled: false, noiseThreshold: 65 }

function EtherealWave() {
  return (
    <div className="wave-stage" aria-hidden="true">
      <svg className="wave-field" viewBox="0 0 1600 420" preserveAspectRatio="none">
        <defs>
          <linearGradient id="waveGradientA" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#9d3cff" /><stop offset="24%" stopColor="#4f63ff" />
            <stop offset="48%" stopColor="#31b7ff" /><stop offset="70%" stopColor="#d8b56c" />
            <stop offset="100%" stopColor="#d94c7f" />
          </linearGradient>
          <linearGradient id="waveGradientB" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#b43cff" /><stop offset="32%" stopColor="#405cff" />
            <stop offset="62%" stopColor="#45d6cf" /><stop offset="100%" stopColor="#d97186" />
          </linearGradient>
          <filter id="waveGlow" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="18" /></filter>
        </defs>
        <g className="wave-glow" filter="url(#waveGlow)">
          <path d="M-120 250 C80 120 210 350 390 245 S680 125 835 250 S1100 360 1270 235 S1510 150 1720 250" />
          <path d="M-120 260 C120 360 220 140 430 260 S700 340 880 225 S1150 150 1320 265 S1530 350 1720 230" />
        </g>
        <g className="wave-ribbons wave-ribbons-a">
          <path d="M-120 250 C80 120 210 350 390 245 S680 125 835 250 S1100 360 1270 235 S1510 150 1720 250" />
          <path d="M-120 275 C70 355 240 145 415 260 S690 345 860 230 S1110 145 1295 260 S1530 345 1720 230" />
        </g>
        <g className="wave-ribbons wave-ribbons-b">
          <path d="M-140 230 C80 355 235 160 420 245 S700 330 875 215 S1130 155 1310 245 S1510 335 1740 225" />
          <path d="M-140 285 C80 155 220 340 405 255 S705 145 870 275 S1135 345 1320 235 S1550 150 1740 270" />
        </g>
      </svg>
      <div className="wave-haze" />
      <div className="wave-stars"><i /><i /><i /><i /><i /><i /><i /><i /></div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState({ on: true, brightness: 72, color: '#8b5cf6', scene: 'gaming', live: false, connected: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [prefs, setPrefs] = useState(() => {
    try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem('gamingLightsPrefs') || '{}') } }
    catch { return defaultPrefs }
  })
  const [noiseLevel, setNoiseLevel] = useState(0)
  const [micStatus, setMicStatus] = useState('off')
  const stateRef = useRef(state)
  const audioRef = useRef(null)
  const alertLockRef = useRef(false)

  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { localStorage.setItem('gamingLightsPrefs', JSON.stringify(prefs)) }, [prefs])
  useEffect(() => () => stopListening(), [])
  useEffect(() => {
    getLightState().then(setState).catch(() => setError('Controller unavailable')).finally(() => setLoading(false))
  }, [])

  const update = async (patch) => {
    setState((current) => ({ ...current, ...patch }))
    try {
      const next = await updateLightState(patch)
      setState((current) => ({ ...current, ...next, scene: patch.scene ?? current.scene }))
      setError('')
    } catch { setError('Could not reach WLED') }
  }

  const chooseScene = (scene) => update({ scene: scene.id, color: scene.colors[0], on: true })
  const chooseColor = (color) => update({ color, scene: 'solid', on: true })

  const triggerNoiseAlert = async () => {
    if (alertLockRef.current || !prefs.alertEnabled) return
    alertLockRef.current = true
    const previous = { color: stateRef.current.color, scene: stateRef.current.scene, on: stateRef.current.on }
    await update({ color: '#ff2d2d', scene: 'solid', on: true })
    window.setTimeout(async () => {
      await update(previous)
      window.setTimeout(() => { alertLockRef.current = false }, 1800)
    }, 900)
  }

  const startListening = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setMicStatus('unsupported'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.82
      context.createMediaStreamSource(stream).connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      audioRef.current = { stream, context, analyser, frame: null }
      setMicStatus('listening')
      const sample = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (const value of data) { const normalized = (value - 128) / 128; sum += normalized * normalized }
        const rms = Math.sqrt(sum / data.length)
        const level = Math.min(100, Math.round(rms * 360))
        setNoiseLevel(level)
        if (level >= prefs.noiseThreshold) triggerNoiseAlert()
        if (audioRef.current) audioRef.current.frame = requestAnimationFrame(sample)
      }
      sample()
    } catch { setMicStatus('denied') }
  }

  const stopListening = () => {
    if (!audioRef.current) return
    cancelAnimationFrame(audioRef.current.frame)
    audioRef.current.stream.getTracks().forEach((track) => track.stop())
    audioRef.current.context.close()
    audioRef.current = null
    setNoiseLevel(0)
    setMicStatus('off')
  }

  const setAlertEnabled = (enabled) => {
    setPrefs((current) => ({ ...current, alertEnabled: enabled }))
    if (!enabled) stopListening()
  }

  const handleBackgroundUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPrefs((current) => ({ ...current, backgroundImage: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  const shellStyle = {
    '--custom-bg': prefs.backgroundColor,
    '--custom-bg-image': prefs.backgroundImage ? `url("${prefs.backgroundImage}")` : 'none',
  }

  return (
    <main className="app-shell custom-background" style={shellStyle}>
      <div className="custom-background-image" />
      <EtherealWave />
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="dashboard">
        <header className="topbar">
          <div><p className="eyebrow">GAMING LIGHTS</p><h1>Michael's setup</h1></div>
          <button className={`power-button ${state.on ? 'active' : ''}`} onClick={() => update({ on: !state.on })} aria-label="Toggle lights"><Power size={21} /></button>
        </header>

        <section className={`hero-card ${noiseLevel >= prefs.noiseThreshold && prefs.alertEnabled ? 'noise-warning' : ''}`}>
          <div className="hero-copy">
            <div className="status-row"><span className={`status-dot ${state.connected ? 'online' : ''}`} />{loading ? 'Finding controller…' : error || (state.connected ? 'WLED connected' : 'Mock controller')}</div>
            <p className="hero-kicker">CURRENT MODE</p>
            <h2>{state.live ? 'Game Sync' : scenes.find((scene) => scene.id === state.scene)?.name || 'Custom'}</h2>
            <p>{state.live ? 'Lighting is reacting to the gaming PC.' : state.on ? 'Room lighting is active.' : 'Lights are standing by.'}</p>
          </div>
          <div className={`light-orb ${state.on ? '' : 'off'}`} style={{ '--orb-color': state.color }}><div className="orb-core"><Gamepad2 size={34} /></div></div>
        </section>

        {state.live && <section className="sync-banner"><div className="sync-icon"><MonitorUp size={22} /></div><div><strong>Game Sync active</strong><span>Controlled by the gaming PC</span></div><button onClick={() => update({ live: false })}>Stop</button></section>}

        <section className="section-block">
          <div className="section-heading"><div><p className="eyebrow">LIGHTING</p><h3>Pick a vibe</h3></div><SlidersHorizontal size={19} /></div>
          <div className="scene-grid">{scenes.map((scene) => { const Icon = scene.icon; const active = state.scene === scene.id && !state.live; return <button key={scene.id} className={`scene-card ${active ? 'selected' : ''}`} onClick={() => chooseScene(scene)}><span className="scene-icon" style={{ background: `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})` }}><Icon size={22} /></span><span className="scene-text"><strong>{scene.name}</strong><small>{scene.detail}</small></span>{active && <span className="selected-dot" />}</button> })}</div>
        </section>

        <section className="control-card">
          <div className="control-label"><span>Brightness</span><strong>{state.brightness}%</strong></div>
          <input className="brightness" type="range" min="1" max="100" value={state.brightness} onChange={(e) => setState((c) => ({ ...c, brightness: Number(e.target.value) }))} onPointerUp={(e) => update({ brightness: Number(e.currentTarget.value), on: true })} onKeyUp={(e) => update({ brightness: Number(e.currentTarget.value), on: true })} />
          <div className="color-control-heading"><div><div className="quick-label">Color</div><span className="current-color-value">{state.color.toUpperCase()}</span></div><label className="color-picker-control"><span className="color-picker-preview" style={{ background: state.color }} /><span>Custom</span><input type="color" value={state.color} onChange={(e) => chooseColor(e.target.value)} aria-label="Custom light color" /></label></div>
          <div className="color-row">{quickColors.map((color) => <button key={color} aria-label={`Set color ${color}`} className={`color-swatch ${state.color === color ? 'chosen' : ''}`} style={{ background: color }} onClick={() => chooseColor(color)} />)}</div>
        </section>

        <button className="sync-button" onClick={() => update({ live: !state.live, on: true })}><span className="sync-button-icon"><MonitorUp size={22} /></span><span><strong>{state.live ? 'Game Sync is running' : 'Start Game Sync'}</strong><small>React to what's happening on the PC</small></span><span className="arrow">›</span></button>

        {settingsOpen && <section className="settings-panel">
          <div className="settings-header"><div><p className="eyebrow">SETTINGS</p><h3>Personalize the setup</h3></div><button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
          <div className="settings-group">
            <div className="settings-title"><ImageIcon size={18} /><div><strong>Background</strong><small>Change the room-control backdrop.</small></div></div>
            <div className="appearance-grid">
              <label><span>Background color</span><input type="color" value={prefs.backgroundColor} onChange={(e) => setPrefs((c) => ({ ...c, backgroundColor: e.target.value }))} /></label>
              <label className="upload-button"><ImageIcon size={16} /><span>Choose image</span><input type="file" accept="image/*" onChange={handleBackgroundUpload} /></label>
            </div>
            {prefs.backgroundImage && <button className="text-button" onClick={() => setPrefs((c) => ({ ...c, backgroundImage: '' }))}>Remove background image</button>}
          </div>
          <div className="settings-group discreet-setting">
            <div className="settings-title"><ShieldAlert size={18} /><div><strong>Awareness alert</strong><small>A private volume cue using this device's microphone.</small></div></div>
            <label className="toggle-row"><span>Enable noise alert</span><input type="checkbox" checked={prefs.alertEnabled} onChange={(e) => setAlertEnabled(e.target.checked)} /></label>
            {prefs.alertEnabled && <>
              <div className="noise-meter-wrap"><div className="noise-meta"><span>Live noise</span><strong>{noiseLevel}%</strong></div><div className="noise-meter"><span style={{ width: `${noiseLevel}%` }} /><i style={{ left: `${prefs.noiseThreshold}%` }} /></div></div>
              <label className="threshold-control"><span>Alert threshold <strong>{prefs.noiseThreshold}%</strong></span><input type="range" min="25" max="95" value={prefs.noiseThreshold} onChange={(e) => setPrefs((c) => ({ ...c, noiseThreshold: Number(e.target.value) }))} /></label>
              <div className="mic-actions">{micStatus !== 'listening' ? <button onClick={startListening}><Volume2 size={16} />Start listening</button> : <button onClick={stopListening}>Stop listening</button>}<small>{micStatus === 'denied' ? 'Microphone permission was denied.' : micStatus === 'unsupported' ? 'Microphone access is unavailable here.' : micStatus === 'listening' ? 'Listening locally. Audio is not uploaded.' : 'Microphone remains off until started.'}</small></div>
            </>}
          </div>
          <UpdateManager />
        </section>}

        <footer><span>{state.connected ? <Wifi size={15} /> : <WifiOff size={15} />}{state.connected ? 'Controller online' : 'Development mode'}</span><button className="footer-settings" onClick={() => setSettingsOpen((open) => !open)}><Settings size={14} />Settings</button><span>Gaming Lights · v0.5</span></footer>
      </div>
    </main>
  )
}
