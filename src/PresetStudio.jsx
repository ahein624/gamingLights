import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, SlidersHorizontal, Sparkles, Trash2, Copy, Play, Plus } from 'lucide-react'
import { getEffects, getPalettes, getLightState, setEffect, updateLightState } from './wled.js'
import './preset-studio.css'

const defaults = { name: 'New preset', effectId: 0, paletteId: 0, speed: 128, intensity: 128, brightness: 72, color: '#8b5cf6' }

async function json(url, options) {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}

function resolveId(list, id, name) {
  if (Number.isFinite(Number(id)) && list[Number(id)]) return Number(id)
  if (name) {
    const found = list.findIndex((item) => item.toLowerCase() === String(name).toLowerCase())
    if (found >= 0) return found
  }
  return 0
}

function PresetStudio() {
  const [effects, setEffects] = useState([])
  const [palettes, setPalettes] = useState([])
  const [presets, setPresets] = useState([])
  const [draft, setDraft] = useState(defaults)
  const [editingId, setEditingId] = useState(null)
  const [livePreview, setLivePreview] = useState(true)
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  const reloadPresets = () => json('/api/presets').then(setPresets)

  useEffect(() => {
    Promise.all([getEffects(), getPalettes(), getLightState(), json('/api/presets')])
      .then(([fx, pal, state, saved]) => {
        setEffects(fx); setPalettes(pal); setPresets(saved)
        setDraft({
          name: 'New preset', effectId: state.effectId ?? 0, paletteId: state.paletteId ?? 0,
          speed: state.effectSpeed ?? 128, intensity: state.effectIntensity ?? 128,
          brightness: state.brightness ?? 72, color: state.color ?? '#8b5cf6',
        })
        setStatus('ready')
      })
      .catch((error) => { setStatus('error'); setMessage(error.message) })
  }, [])

  const effectName = effects[draft.effectId] || 'Solid'
  const paletteName = palettes[draft.paletteId] || 'Default'
  const percent = (value) => Math.round(value / 2.55)

  const applyDraft = async (next = draft) => {
    await setEffect({ effectId: Number(next.effectId), paletteId: Number(next.paletteId), speed: Number(next.speed), intensity: Number(next.intensity) })
    await updateLightState({ brightness: Number(next.brightness), color: next.color, on: true })
  }

  const change = (patch, preview = true) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    if (livePreview && preview) applyDraft(next).catch(() => setMessage('Could not preview on WLED.'))
  }

  const loadPreset = async (preset, apply = false) => {
    const next = {
      ...defaults, ...preset,
      effectId: resolveId(effects, preset.effectId, preset.effectName),
      paletteId: resolveId(palettes, preset.paletteId, preset.paletteName),
    }
    setEditingId(preset.id)
    setDraft(next)
    if (apply) await applyDraft(next)
  }

  const save = async (asNew = false) => {
    const body = { ...draft, effectName, paletteName }
    const method = editingId && !asNew ? 'PUT' : 'POST'
    const url = editingId && !asNew ? `/api/presets/${editingId}` : '/api/presets'
    const saved = await json(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setEditingId(saved.id)
    setDraft((current) => ({ ...current, ...saved }))
    await reloadPresets()
    setMessage(method === 'PUT' ? 'Preset updated.' : 'Preset saved.')
  }

  const remove = async () => {
    if (!editingId) return
    await json(`/api/presets/${editingId}`, { method: 'DELETE' })
    setEditingId(null); setDraft({ ...defaults }); await reloadPresets(); setMessage('Preset deleted.')
  }

  const newPreset = () => { setEditingId(null); setDraft((current) => ({ ...current, name: 'New preset' })); setMessage('') }

  const presetCards = useMemo(() => presets.map((preset) => ({ ...preset, effectId: resolveId(effects, preset.effectId, preset.effectName), paletteId: resolveId(palettes, preset.paletteId, preset.paletteName) })), [presets, effects, palettes])

  if (status === 'error') return null

  return <section className="preset-studio">
    <div className="section-heading preset-heading"><div><p className="eyebrow">PRESETS</p><h3>Build your own mode</h3></div><SlidersHorizontal size={19}/></div>

    {status === 'loading' ? <div className="preset-loading">Loading preset studio…</div> : <>
      <div className="preset-rail">
        {presetCards.map((preset) => <button key={preset.id} className={`preset-pill ${editingId === preset.id ? 'selected' : ''}`} onClick={() => loadPreset(preset, true)}>
          <span className="preset-glow" style={{ '--preset-color': preset.color || '#8b5cf6' }}><Play size={14}/></span>
          <span><strong>{preset.name}</strong><small>{effects[preset.effectId] || preset.effectName || 'Solid'} · {palettes[preset.paletteId] || preset.paletteName || 'Default'}</small></span>
        </button>)}
        <button className="preset-pill new" onClick={newPreset}><span className="preset-glow"><Plus size={15}/></span><span><strong>New preset</strong><small>Start from current look</small></span></button>
      </div>

      <div className="preset-configurator">
        <div className="preset-config-top">
          <label className="preset-name"><span>Name</span><input value={draft.name} onChange={(e)=>change({name:e.target.value}, false)} placeholder="Boss Fight" /></label>
          <label className="live-preview"><span>Live preview</span><input type="checkbox" checked={livePreview} onChange={(e)=>setLivePreview(e.target.checked)} /></label>
        </div>

        <div className="preset-select-grid">
          <label><span>Animation</span><select value={draft.effectId} onChange={(e)=>change({effectId:Number(e.target.value)})}>{effects.map((name,id)=><option key={`${id}-${name}`} value={id}>{name}</option>)}</select></label>
          <label><span>Palette</span><select value={draft.paletteId} onChange={(e)=>change({paletteId:Number(e.target.value)})}>{palettes.map((name,id)=><option key={`${id}-${name}`} value={id}>{name}</option>)}</select></label>
        </div>

        <div className="preset-sliders">
          <label><span>Speed <strong>{percent(draft.speed)}%</strong></span><input type="range" min="0" max="255" value={draft.speed} onChange={(e)=>change({speed:Number(e.target.value)})}/></label>
          <label><span>Intensity <strong>{percent(draft.intensity)}%</strong></span><input type="range" min="0" max="255" value={draft.intensity} onChange={(e)=>change({intensity:Number(e.target.value)})}/></label>
          <label><span>Brightness <strong>{draft.brightness}%</strong></span><input type="range" min="1" max="100" value={draft.brightness} onChange={(e)=>change({brightness:Number(e.target.value)})}/></label>
          <label className="preset-color"><span>Base color <strong>{draft.color.toUpperCase()}</strong></span><div><input type="color" value={draft.color} onChange={(e)=>change({color:e.target.value})}/><i style={{background:draft.color}} /></div></label>
        </div>

        <div className="preset-preview-stage" style={{'--preview-color':draft.color}}><i/><i/><i/><div><Sparkles size={20}/><strong>{draft.name || 'Untitled preset'}</strong><span>{effectName} · {paletteName}</span></div></div>

        <div className="preset-actions">
          <button onClick={()=>applyDraft().catch(()=>setMessage('Could not apply preset.'))}><Play size={15}/>Apply</button>
          <button className="primary" onClick={()=>save(false)}><Save size={15}/>{editingId ? 'Update preset' : 'Save preset'}</button>
          {editingId && <button onClick={()=>save(true)}><Copy size={15}/>Save copy</button>}
          {editingId && <button className="danger" onClick={remove}><Trash2 size={15}/>Delete</button>}
        </div>
        {message && <small className="preset-message">{message}</small>}
      </div>
    </>}
  </section>
}

export default function PresetStudioPortal() {
  const [target,setTarget]=useState(null)
  useEffect(()=>{const find=()=>setTarget(document.querySelector('.dashboard'));find();if(document.querySelector('.dashboard'))return;const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[])
  return target ? createPortal(<PresetStudio/>,target) : null
}
