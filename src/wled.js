const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms))

const mockState = {
  on: true,
  brightness: 72,
  color: '#8b5cf6',
  scene: 'gaming',
  live: false,
  connected: true,
}

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

export async function getLightState() {
  if (!apiBase) {
    await wait()
    return { ...mockState }
  }

  const state = await request('/json/state')
  const color = state.seg?.[0]?.col?.[0] ?? [139, 92, 246]
  return {
    on: state.on,
    brightness: Math.round((state.bri / 255) * 100),
    color: rgbToHex(color),
    scene: null,
    live: Boolean(state.live),
    connected: true,
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
