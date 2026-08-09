import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Zap, Waves, Flame, Orbit, CloudMoon, Shuffle } from 'lucide-react'
import { getEffects, getLightState, getPalettes, setEffect, setPalette } from './wled.js'
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

const curatedPalettes = [
  { names: ['Party'], title: 'Arcade', colors: ['#ff2bd6', '#7755ff', '#00e5ff', '#ffe45e'] },
  { names: ['Sunset'], title: 'Afterglow', colors: ['#ff4d6d', '#ff8a3d', '#ffd166', '#6d2cff'] },
  { names: ['Ocean'], title: 'Deep Sea', colors: ['#001d3d', '#0077b6', '#00b4d8', '#90e0ef'] },
  { names: ['Aurora'], title: 'Northern Lights', colors: ['#17f1a1', '#31b7ff', '#7c3aed', '#e879f9'] },
  { names: ['Icefire', 'Icefire 2'], title: 'Icefire', colors: ['#54d6ff', '#eaf8ff', '#ff6b35', '#ff1744'] },
  { names: ['Lava'], title: 'Magma', colors: ['#160000', '#7f1d1d', '#ef4444', '#ffb000'] },
  { names: ['Forest'], title: 'Night Forest', colors: ['#071b12', '#0f5132', '#2fbf71', '#c6ff7d'] },
  { names: ['Rainbow'], title: 'Prism', colors: ['#ff3b30', '#ffcc00', '#34c759', '#0a84ff', '#bf5af2'] },
]

const recipes = [
  { title: 'Cyberstorm', detail: 'Fast neon overload', effect: ['Colorwaves'], palette: ['Party'], speed: 225, intensity: 215, colors: ['#ff2bd6','#00e5ff'] },
  { title: 'Nebula', detail: 'Slow space ribbons', effect: ['Aurora'], palette: ['Aurora'], speed: 72, intensity: 145, colors: ['#7c3aed','#17f1a1'] },
  { title: 'Afterburn', detail: 'Hot aggressive flame', effect: ['Fire 2012','Fire Flicker'], palette: ['Lava'], speed: 178, intensity: 235, colors: ['#ff2d00','#ffb000'] },
  { title: 'The Abyss', detail: 'Deep ocean drift', effect: ['Pacifica'], palette: ['Ocean'], speed: 76, intensity: 180, colors: ['#001d3d','#00b4d8'] },
  { title: 'Ghostlight', detail: 'Cold scattered stars', effect: ['Twinklefox','Twinklecat','Twinkle'], palette: ['Icefire','Icefire 2'], speed: 62, intensity: 138, colors: ['#dff7ff','#6f7cff'] },
  { title: 'Warp Drive', detail: 'Maximum forward motion', effect: ['Flow'], palette: ['Rainbow'], speed: 242, intensity: 198, colors: ['#0a84ff','#bf5af2'] },
]

function findByNames(list, names) {
  for (const name of names) {
    const index = list.findIndex((value) => value.toLowerCase() === name.toLowerCase())
    if (index >= 0) return { index, name: list[index] }
  }
  return null
}

function AnimationPanel() {
  const [effects, setEffects] = useState([])
  const [palettes, setPalettes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [activePalette, setActivePalette] = useState(0)
  const [speed, setSpeed] = useState(128)
  const [intensity, setIntensity] = useState(128)
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([getEffects(), getPalettes(), getLightState()])
      .then(([availableEffects, availablePalettes, state]) => {
        setEffects(availableEffects); setPalettes(availablePalettes)
        setActiveId(state.effectId ?? null); setActivePalette(state.paletteId ?? 0)
        setSpeed(state.effectSpeed ?? 128); setIntensity(state.effectIntensity ?? 128); setStatus('ready')
      }).catch(() => setStatus('offline'))
  }, [])

  const cards = useMemo(() => curated.map((item) => { const match=findByNames(effects,item.names); return match ? {...item,effectId:match.index,effectName:match.name}:null }).filter(Boolean), [effects])
  const paletteCards = useMemo(() => curatedPalettes.map((item) => { const match=findByNames(palettes,item.names); return match ? {...item,paletteId:match.index,paletteName:match.name}:null }).filter(Boolean), [palettes])
  const recipeCards = useMemo(() => recipes.map((recipe) => { const effect=findByNames(effects,recipe.effect); const palette=findByNames(palettes,recipe.palette); return effect ? {...recipe,effectId:effect.index,paletteId:palette?.index ?? 0}:null }).filter(Boolean), [effects,palettes])

  const apply = async (effectId, patch = {}) => {
    setBusy(true)
    try {
      const next = await setEffect({ effectId, speed: patch.speed ?? speed, intensity: patch.intensity ?? intensity, paletteId: patch.paletteId ?? activePalette })
      setActiveId(next.effectId ?? effectId); setActivePalette(next.paletteId ?? patch.paletteId ?? activePalette)
      if (typeof next.effectSpeed === 'number') setSpeed(next.effectSpeed)
      if (typeof next.effectIntensity === 'number') setIntensity(next.effectIntensity)
    } finally { setBusy(false) }
  }

  const choosePalette = async (paletteId) => { setBusy(true); try { const next=await setPalette(paletteId); setActivePalette(next.paletteId ?? paletteId) } finally { setBusy(false) } }
  const applyRecipe = async (recipe) => { setSpeed(recipe.speed); setIntensity(recipe.intensity); await apply(recipe.effectId,{speed:recipe.speed,intensity:recipe.intensity,paletteId:recipe.paletteId}) }
  const surpriseMe = async () => {
    if (!cards.length) return
    const effect=cards[Math.floor(Math.random()*cards.length)], palette=paletteCards.length?paletteCards[Math.floor(Math.random()*paletteCards.length)]:null
    const randomSpeed=70+Math.floor(Math.random()*150), randomIntensity=90+Math.floor(Math.random()*150)
    setSpeed(randomSpeed); setIntensity(randomIntensity)
    await apply(effect.effectId,{speed:randomSpeed,intensity:randomIntensity,paletteId:palette?.paletteId ?? activePalette})
  }

  if (status === 'offline') return null

  return <section className="animation-section">
    <div className="section-heading animation-heading"><div><p className="eyebrow">ANIMATIONS</p><h3>Make it move</h3></div><button className="surprise-button" onClick={surpriseMe} disabled={busy||status!=='ready'}><Shuffle size={15}/> Surprise me</button></div>
    {status==='loading'?<div className="animation-loading">Loading WLED effects…</div>:<>
      {!!recipeCards.length && <div className="recipe-block"><div className="palette-title"><span>FEATURED COMBOS</span><small>One tap. No tuning required.</small></div><div className="recipe-row">{recipeCards.map((recipe)=><button key={recipe.title} disabled={busy} className="recipe-card" onClick={()=>applyRecipe(recipe)} style={{'--recipe-a':recipe.colors[0],'--recipe-b':recipe.colors[1]}}><span className="recipe-art"><i/><i/></span><strong>{recipe.title}</strong><small>{recipe.detail}</small></button>)}</div></div>}
      <div className="animation-grid">{cards.map((item)=>{const Icon=item.icon,active=activeId===item.effectId;return <button key={item.key} disabled={busy} className={`animation-card ${active?'selected':''}`} onClick={()=>apply(item.effectId)}><span className="animation-preview" style={{'--a':item.colors[0],'--b':item.colors[1]}}><i/><i/><i/><Icon size={20}/></span><span className="animation-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>{active&&<span className="selected-dot"/>}</button>})}</div>
      {!!paletteCards.length && <div className="palette-block"><div className="palette-title"><span>COLOR MOOD</span><small>Pair any animation with a palette</small></div><div className="palette-row">{paletteCards.map((palette)=>{const active=activePalette===palette.paletteId;return <button key={palette.title} disabled={busy} className={`palette-chip ${active?'selected':''}`} onClick={()=>choosePalette(palette.paletteId)}><span className="palette-swatch" style={{background:`linear-gradient(90deg, ${palette.colors.join(', ')})`}}/><strong>{palette.title}</strong></button>})}</div></div>}
      {activeId!==null&&<div className="animation-tuning"><label><span>Speed <strong>{Math.round(speed/2.55)}%</strong></span><input type="range" min="0" max="255" value={speed} onChange={(e)=>setSpeed(Number(e.target.value))} onPointerUp={()=>apply(activeId,{speed})} onKeyUp={()=>apply(activeId,{speed})}/></label><label><span>Intensity <strong>{Math.round(intensity/2.55)}%</strong></span><input type="range" min="0" max="255" value={intensity} onChange={(e)=>setIntensity(Number(e.target.value))} onPointerUp={()=>apply(activeId,{intensity})} onKeyUp={()=>apply(activeId,{intensity})}/></label></div>}
    </>}
  </section>
}

export default function AnimationPortal() {
  const [target,setTarget]=useState(null)
  useEffect(()=>{const find=()=>setTarget(document.querySelector('.dashboard'));find();if(document.querySelector('.dashboard'))return;const observer=new MutationObserver(find);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[])
  return target?createPortal(<AnimationPanel/>,target):null
}
