import { useEffect, useState } from 'react'
import {
  Gamepad2,
  MoonStar,
  Flame,
  Waves,
  Palette,
  MonitorUp,
  Power,
  SlidersHorizontal,
  Wifi,
  WifiOff,
  Sparkles,
} from 'lucide-react'
import { getLightState, updateLightState } from './wled.js'

const scenes = [
  { id: 'gaming', name: 'Gaming', detail: 'Punchy purple + blue', icon: Gamepad2, colors: ['#7c3aed', '#2563eb'] },
  { id: 'ambient', name: 'Ambient', detail: 'Soft room glow', icon: Sparkles, colors: ['#0ea5e9', '#14b8a6'] },
  { id: 'chill', name: 'Chill', detail: 'Slow and low', icon: MoonStar, colors: ['#4338ca', '#9333ea'] },
  { id: 'fire', name: 'Ember', detail: 'Warm flicker', icon: Flame, colors: ['#ef4444', '#f59e0b'] },
  { id: 'wave', name: 'Wave', detail: 'Color movement', icon: Waves, colors: ['#06b6d4', '#8b5cf6'] },
  { id: 'solid', name: 'Solid', detail: 'One clean color', icon: Palette, colors: ['#8b5cf6', '#8b5cf6'] },
]

const quickColors = ['#8b5cf6', '#2563eb', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#f8fafc']

export default function App() {
  const [state, setState] = useState({ on: true, brightness: 72, color: '#8b5cf6', scene: 'gaming', live: false, connected: false })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getLightState()
      .then(setState)
      .catch(() => setError('Controller unavailable'))
      .finally(() => setLoading(false))
  }, [])

  const update = async (patch) => {
    setState((current) => ({ ...current, ...patch }))
    try {
      const next = await updateLightState(patch)
      setState((current) => ({ ...current, ...next, scene: patch.scene ?? current.scene }))
      setError('')
    } catch {
      setError('Could not reach WLED')
    }
  }

  const chooseScene = (scene) => {
    update({ scene: scene.id, color: scene.colors[0], on: true })
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="dashboard">
        <header className="topbar">
          <div>
            <p className="eyebrow">GAMING LIGHTS</p>
            <h1>Michael's setup</h1>
          </div>
          <button className={`power-button ${state.on ? 'active' : ''}`} onClick={() => update({ on: !state.on })} aria-label="Toggle lights">
            <Power size={21} />
          </button>
        </header>

        <section className="hero-card">
          <div className="hero-copy">
            <div className="status-row">
              <span className={`status-dot ${state.connected ? 'online' : ''}`} />
              {loading ? 'Finding controller…' : error || (state.connected ? 'WLED connected' : 'Mock controller')}
            </div>
            <p className="hero-kicker">CURRENT MODE</p>
            <h2>{state.live ? 'Game Sync' : scenes.find((scene) => scene.id === state.scene)?.name || 'Custom'}</h2>
            <p>{state.live ? 'Lighting is reacting to the gaming PC.' : state.on ? 'Room lighting is active.' : 'Lights are standing by.'}</p>
          </div>
          <div className={`light-orb ${state.on ? '' : 'off'}`} style={{ '--orb-color': state.color }}>
            <div className="orb-core"><Gamepad2 size={34} /></div>
          </div>
        </section>

        {state.live && (
          <section className="sync-banner">
            <div className="sync-icon"><MonitorUp size={22} /></div>
            <div><strong>Game Sync active</strong><span>Controlled by the gaming PC</span></div>
            <button onClick={() => update({ live: false })}>Stop</button>
          </section>
        )}

        <section className="section-block">
          <div className="section-heading">
            <div><p className="eyebrow">LIGHTING</p><h3>Pick a vibe</h3></div>
            <SlidersHorizontal size={19} />
          </div>
          <div className="scene-grid">
            {scenes.map((scene) => {
              const Icon = scene.icon
              const active = state.scene === scene.id && !state.live
              return (
                <button key={scene.id} className={`scene-card ${active ? 'selected' : ''}`} onClick={() => chooseScene(scene)}>
                  <span className="scene-icon" style={{ background: `linear-gradient(135deg, ${scene.colors[0]}, ${scene.colors[1]})` }}><Icon size={22} /></span>
                  <span className="scene-text"><strong>{scene.name}</strong><small>{scene.detail}</small></span>
                  {active && <span className="selected-dot" />}
                </button>
              )
            })}
          </div>
        </section>

        <section className="control-card">
          <div className="control-label"><span>Brightness</span><strong>{state.brightness}%</strong></div>
          <input className="brightness" type="range" min="1" max="100" value={state.brightness} onChange={(event) => setState((current) => ({ ...current, brightness: Number(event.target.value) }))} onPointerUp={(event) => update({ brightness: Number(event.currentTarget.value), on: true })} onKeyUp={(event) => update({ brightness: Number(event.currentTarget.value), on: true })} />
          <div className="quick-label">Quick color</div>
          <div className="color-row">
            {quickColors.map((color) => <button key={color} aria-label={`Set color ${color}`} className={`color-swatch ${state.color === color ? 'chosen' : ''}`} style={{ background: color }} onClick={() => update({ color, scene: 'solid', on: true })} />)}
          </div>
        </section>

        <button className="sync-button" onClick={() => update({ live: !state.live, on: true })}>
          <span className="sync-button-icon"><MonitorUp size={22} /></span>
          <span><strong>{state.live ? 'Game Sync is running' : 'Start Game Sync'}</strong><small>React to what's happening on the PC</small></span>
          <span className="arrow">›</span>
        </button>

        <footer>
          <span>{state.connected ? <Wifi size={15} /> : <WifiOff size={15} />}{state.connected ? 'Controller online' : 'Development mode'}</span>
          <span>Gaming Lights · v0.1</span>
        </footer>
      </div>
    </main>
  )
}
