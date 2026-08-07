const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

const mockState = {
  on: true,
  brightness: 72,
  color: '#8b5cf6',
  scene: 'gaming',
  live: false,
  connected: false,
  effectId: 0,
  effectSpeed: 128,
  effectIntensity: 128,
  paletteId: 0,
}

const mockEffects = ['Solid', 'Aurora', 'Colorwaves', 'Pacifica', 'Fire 2012', 'Pride 2015', 'Flow', 'Rainbow', 'Twinklefox']
const mockPalettes = ['Default', 'Party', 'Cloud', 'Lava', 'Ocean', 'Forest', 'Rainbow', 'Sunset', 'Aurora', 'Icefire', 'Retro Clown']
const apiBase = import.meta.env.VITE_WLED_API_BASE?.replace(/\/$/, '')

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  return [0, 2, 4].map((offset) => Number.parseInt(clean.slice(offset, offset + 2), 16))
}

function rgbToHex([r = 139, g = 92, b = 246]) {
  return `#${[r, g, b].map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`
}

async function request(path, options) {
  const response = await fetch(`${apiBase}${path}`, options)
  if (!response.ok) throw new Error(`WLED request failed (${response.status})`)
  return response.json()
}

export async function getEffects() {
  if (!apiBase) {
    await wait()
    return [...mockEffects]
  }
  return request('/json/eff')
}

export async function getPalettes() {
  if (!apiBase) {
    await wait()
    return [...mockPalettes]
  }
  return request('/json/pal')
}

export async function getLightState() {
  if (!apiBase) {
    await wait()
    return { ...mockState }
  }

  const state = await request('/json/state')
  const segment = state.seg?.[0] ?? {}
  const color = segment.col?.[0] ?? [139, 92, 246]
  return {
    on: state.on,
    brightness: Math.round((state.bri / 255) * 100),
    color: rgbToHex(color),
    scene: null,
    live: Boolean(state.live),
    connected: true,
    effectId: segment.fx ?? 0,
    effectSpeed: segment.sx ?? 128,
    effectIntensity: segment.ix ?? 128,
    paletteId: segment.pal ?? 0,
  }
}

export async function updateLightState(patch) {
  if (!apiBase) {
    Object.assign(mockState, patch)
    await wait(70)
    return { ...mockState }
  }

  const payload = {}
  if ('on' in patch) payload.on = patch.on
  if ('brightness' in patch) payload.bri = Math.round((patch.brightness / 100) * 255)
  if ('color' in patch) payload.seg = [{ col: [hexToRgb(patch.color)] }]

  await request('/json/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return getLightState()
}

export async function setEffect({ effectId, speed = 128, intensity = 128, paletteId }) {
  if (!apiBase) {
    Object.assign(mockState, {
      effectId,
      effectSpeed: speed,
      effectIntensity: intensity,
      ...(typeof paletteId === 'number' ? { paletteId } : {}),
      on: true,
    })
    await wait(70)
    return { ...mockState }
  }

  const segment = { fx: effectId, sx: speed, ix: intensity }
  if (typeof paletteId === 'number') segment.pal = paletteId

  await request('/json/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on: true, seg: [segment] }),
  })

  return getLightState()
}

export async function setPalette(paletteId) {
  if (!apiBase) {
    Object.assign(mockState, { paletteId, on: true })
    await wait(70)
    return { ...mockState }
  }

  await request('/json/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ on: true, seg: [{ pal: paletteId }] }),
  })

  return getLightState()
}
