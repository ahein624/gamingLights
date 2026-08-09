import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { getOpenRgbStatus, startOpenRgb, stopOpenRgb } from './openrgb.js'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const dataDir = path.join(rootDir, 'data')
const presetsFile = path.join(dataDir, 'user-presets.json')
const port = Number(process.env.PORT || 3000)
const updateKey = process.env.UPDATE_KEY || ''
const wledHost = (process.env.WLED_HOST || 'http://192.168.68.166').replace(/\/$/, '')
const app = express()

app.use(express.json({ limit: '1mb' }))

const starterPresets = [
  { id: 'boss-fight', name: 'Boss Fight', effectName: 'Colorwaves', paletteName: 'Party', speed: 205, intensity: 210, brightness: 90 },
  { id: 'late-night', name: 'Late Night', effectName: 'Aurora', paletteName: 'Sunset', speed: 72, intensity: 105, brightness: 38 },
  { id: 'deep-space', name: 'Deep Space', effectName: 'Twinklefox', paletteName: 'Aurora', speed: 88, intensity: 155, brightness: 48 },
  { id: 'hyperdrive', name: 'Hyperdrive', effectName: 'Flow', paletteName: 'Rainbow', speed: 230, intensity: 190, brightness: 100 },
]

async function git(args) {
  const { stdout } = await execFileAsync('git', args, { cwd: rootDir })
  return stdout.trim()
}

async function updateStatus() {
  await git(['fetch', '--quiet', 'origin', 'main'])
  const current = await git(['rev-parse', 'HEAD'])
  const latest = await git(['rev-parse', 'origin/main'])
  const branch = await git(['rev-parse', '--abbrev-ref', 'HEAD'])
  let commitsBehind = 0
  if (current !== latest) commitsBehind = Number(await git(['rev-list', '--count', `${current}..${latest}`]) || 0)
  return { current, latest, branch, updateAvailable: current !== latest, commitsBehind }
}

async function wledRequest(pathname, options = {}) {
  const response = await fetch(`${wledHost}${pathname}`, {
    ...options,
    signal: AbortSignal.timeout(3500),
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  if (!response.ok) throw new Error(`WLED returned ${response.status}`)
  return response.json()
}

async function readPresets() {
  await mkdir(dataDir, { recursive: true })
  try {
    return JSON.parse(await readFile(presetsFile, 'utf8'))
  } catch {
    await writeFile(presetsFile, JSON.stringify(starterPresets, null, 2))
    return starterPresets
  }
}

async function savePresets(presets) {
  await mkdir(dataDir, { recursive: true })
  await writeFile(presetsFile, JSON.stringify(presets, null, 2))
}

function cleanPreset(input, current = {}) {
  const number = (value, fallback, min = 0, max = 255) => Math.max(min, Math.min(max, Number.isFinite(Number(value)) ? Number(value) : fallback))
  return {
    ...current,
    id: current.id || input.id || randomUUID(),
    name: String(input.name || current.name || 'Untitled preset').slice(0, 48),
    effectId: Number.isFinite(Number(input.effectId)) ? Number(input.effectId) : current.effectId,
    effectName: String(input.effectName || current.effectName || ''),
    paletteId: Number.isFinite(Number(input.paletteId)) ? Number(input.paletteId) : current.paletteId,
    paletteName: String(input.paletteName || current.paletteName || ''),
    speed: number(input.speed, current.speed ?? 128),
    intensity: number(input.intensity, current.intensity ?? 128),
    brightness: number(input.brightness, current.brightness ?? 72, 1, 100),
    color: /^#[0-9a-f]{6}$/i.test(input.color || '') ? input.color : (current.color || '#8b5cf6'),
  }
}

app.get('/api/health', async (_req, res) => {
  const [openrgb, wled] = await Promise.all([
    getOpenRgbStatus().catch(() => ({ configured: false, online: false })),
    wledRequest('/json/info').then(() => true).catch(() => false),
  ])
  res.json({ ok: true, wled: { host: wledHost, online: wled }, openrgb })
})

app.get('/api/wled/json/state', async (_req, res) => {
  try { res.json(await wledRequest('/json/state')) }
  catch (error) { res.status(502).json({ error: 'Unable to reach WLED', detail: error.message }) }
})
app.post('/api/wled/json/state', async (req, res) => {
  try { res.json(await wledRequest('/json/state', { method: 'POST', body: JSON.stringify(req.body) })) }
  catch (error) { res.status(502).json({ error: 'Unable to update WLED', detail: error.message }) }
})
app.get('/api/wled/json/eff', async (_req, res) => {
  try { res.json(await wledRequest('/json/eff')) }
  catch (error) { res.status(502).json({ error: 'Unable to read WLED effects', detail: error.message }) }
})
app.get('/api/wled/json/pal', async (_req, res) => {
  try { res.json(await wledRequest('/json/pal')) }
  catch (error) { res.status(502).json({ error: 'Unable to read WLED palettes', detail: error.message }) }
})

app.get('/api/presets', async (_req, res) => {
  try { res.json(await readPresets()) }
  catch (error) { res.status(500).json({ error: 'Unable to read presets', detail: error.message }) }
})
app.post('/api/presets', async (req, res) => {
  try {
    const presets = await readPresets()
    const preset = cleanPreset(req.body || {})
    presets.push(preset)
    await savePresets(presets)
    res.status(201).json(preset)
  } catch (error) { res.status(500).json({ error: 'Unable to save preset', detail: error.message }) }
})
app.put('/api/presets/:id', async (req, res) => {
  try {
    const presets = await readPresets()
    const index = presets.findIndex((preset) => preset.id === req.params.id)
    if (index < 0) return res.status(404).json({ error: 'Preset not found' })
    presets[index] = cleanPreset(req.body || {}, presets[index])
    await savePresets(presets)
    res.json(presets[index])
  } catch (error) { res.status(500).json({ error: 'Unable to update preset', detail: error.message }) }
})
app.delete('/api/presets/:id', async (req, res) => {
  try {
    const presets = await readPresets()
    const next = presets.filter((preset) => preset.id !== req.params.id)
    await savePresets(next)
    res.json({ deleted: next.length !== presets.length })
  } catch (error) { res.status(500).json({ error: 'Unable to delete preset', detail: error.message }) }
})

app.get('/api/openrgb/status', async (_req, res) => {
  try { res.json(await getOpenRgbStatus()) }
  catch (error) { res.status(500).json({ error: 'Unable to check OpenRGB', detail: error.message }) }
})
app.post('/api/openrgb/start', async (req, res) => {
  try {
    const mode = ['gaming', 'ambilight', 'audio'].includes(req.body?.mode) ? req.body.mode : 'ambilight'
    res.json(await startOpenRgb(mode))
  } catch (error) { res.status(502).json({ error: 'Unable to start OpenRGB sync', detail: error.message }) }
})
app.post('/api/openrgb/stop', async (_req, res) => {
  try { res.json(await stopOpenRgb()) }
  catch (error) { res.status(502).json({ error: 'Unable to stop OpenRGB sync', detail: error.message }) }
})

app.get('/api/update/status', async (_req, res) => {
  try { res.json(await updateStatus()) }
  catch (error) { res.status(500).json({ error: 'Unable to check for updates', detail: error.message }) }
})
app.post('/api/update/apply', async (req, res) => {
  if (!updateKey) return res.status(503).json({ error: 'Self-update is not configured on this server.' })
  if (req.get('x-update-key') !== updateKey) return res.status(401).json({ error: 'Invalid update key.' })
  try {
    const before = await updateStatus()
    if (!before.updateAvailable) return res.json({ updated: false, ...before })
    if (before.branch !== 'main') return res.status(409).json({ error: 'Deployed checkout must be on the main branch before self-update can run.' })
    await git(['merge', '--ff-only', 'origin/main'])
    await execFileAsync('npm', ['install', '--no-audit', '--no-fund'], { cwd: rootDir })
    await execFileAsync('npm', ['run', 'build'], { cwd: rootDir })
    const after = await updateStatus()
    res.json({ updated: true, restartPending: true, ...after })
    setTimeout(() => process.exit(0), 1200)
  } catch (error) { res.status(500).json({ error: 'Update failed', detail: error.message }) }
})

app.use(express.static(distDir))
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')))
app.listen(port, '0.0.0.0', () => {
  console.log(`Gaming Lights listening on http://0.0.0.0:${port}`)
  console.log(`WLED target: ${wledHost}`)
})
