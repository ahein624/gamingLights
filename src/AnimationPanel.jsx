import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Zap, Waves, Flame, Orbit, CloudMoon } from 'lucide-react'
import { getEffects, getLightState, setEffect } from './wled.js'
import './animations.css'

const curated = [
  { key: 'aurora', names: ['Aurora'], title: 'Aurora', detail: 'Slow neon ribbons', icon: CloudMoon, colors: ['#8b5cf6', '#22d3ee'] },
  { key: 'colorwaves', names: ['Colorwaves'], title: 'Color Waves', detail: 'Flowing spectrum', icon: Waves, colors: ['#2563eb', '#d946ef'] },
  { key: 'pacifica', names: ['Pacifica'], title: 'Pacifica', detail: 'Deep ocean motion', icon: Waves, colors: ['#0ea5e9', '#14b8a6'] },
  { key: 'fire', names: ['Fire 2012', 'Fire Flicker'], title: 'Inferno', detail: 'Living flame', icon: Flame, colors: ['#ef4444', '#f59e0b'] },
  { key: 'pride', names: ['Pride 2015', 'Pride'], title: 'Hypercolor', detail: 'Dense animated gradient', icon: Sparkles, colors: ['#ec4899', '#8b5cf6'] },
  { key: 'flow', names: ['Flow'], title: 'Flow', detail: 'Smooth directional drift', icon: Orbit, colors: ['#06b6d4', '#6366f1'] },
  { key: 'rainbow', names: ['Rainbow'], title: 'Rainbow Run', detail: 'Classic RGB sweep', icon: Zap, colors: ['#ef4444', '#22c55e'] },
  { key: 'twinkle', names: ['Twinklefox', 'Twinklecat', 'Twinkle'], title: 'Starlight', detail: 'Soft scattered sparkle', icon: Sparkles, colors: ['#f8fafc', '#8b5cf6'] },
]

function findEffect(effects, candidate) {
  for (const name of candidate.names) {
    const index = effects.findIndex((effect) => effect.toLowerCase() === name.toLowerCase())
    if (index >= 0) return { ...candidate, effectId: index, effectName: effects[index] }
  }
  return null
}

function AnimationPanel() {
  const [effects, setEffects] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [speed, setSpeed] = useState(128)
  const [intensity, setIntensity] = useState(128)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    Promise.all([getEffects(), getLightState()])
      .then(([available, state]) => {
        setEffects(available)
        setActiveId(state.effectId ?? null)
        setSpeed(state.effectSpeed ?? 128)
        setIntensity(state.effectIntensity ?? 128)
        setStatus('ready')
      })
      .catch(() => setStatus('offline'))
  }, [])

  const cards = useMemo(() => curated.map((item) => findEffect(effects, item)).filter(Boolean), [effects])

  const apply = async (effectId, patch = {}) => {
    const next = await setEffect({ effectId, speed: patch.speed ?? speed, intensity: patch.intensity ?? intensity })
    setActiveId(next.effectId ?? effectId)
    if (typeof next.effectSpeed === 'number') setSpeed(next.effectSpeed)
    if (typeof next.effectIntensity === 'number') setIntensity(next.effectIntensity)
  }

  if (status === 'offline') return null

  return (
    <section className="animation-section">
      <div className="section-heading animation-heading">
        <div><p className="eyebrow">ANIMATIONS</p><h3>Make it move</h3></div>
        <Sparkles size={19} />
      </div>

      {status === 'loading' ? <div className="animation-loading">Loading WLED effects…</div> : <>
        <div className="animation-grid">
          {cards.map((item) => {
            const Icon = item.icon
            const active = activeId === item.effectId
            return (
              <button key={item.key} className={`animation-card ${active ? 'selected' : ''}`} onClick={() => apply(item.effectId)}>
                <span className="animation-preview" style={{ '--a': item.colors[0], '--b': item.colors[1] }}><i /><i /><i /><Icon size={20} /></span>
                <span className="animation-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
                {active && <span className="selected-dot" />}
              </button>
            )
          })}
        </div>

        {activeId !== null && <div className="animation-tuning">
          <label><span>Speed <strong>{Math.round(speed / 2.55)}%</strong></span><input type="range" min="0" max="255" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} onPointerUp={() => apply(activeId, { speed })} onKeyUp={() => apply(activeId, { speed })} /></label>
          <label><span>Intensity <strong>{Math.round(intensity / 2.55)}%</strong></span><input type="range" min="0" max="255" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} onPointerUp={() => apply(activeId, { intensity })} onKeyUp={() => apply(activeId, { intensity })} /></label>
        </div>}
      </>}
    </section>
  )
}

export default function AnimationPortal() {
  const [target, setTarget] = useState(null)

  useEffect(() => {
    const find = () => setTarget(document.querySelector('.dashboard'))
    find()
    if (document.querySelector('.dashboard')) return
    const observer = new MutationObserver(find)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  if (!target) return null
  return createPortal(<AnimationPanel />, target)
}
