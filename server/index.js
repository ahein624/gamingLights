import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getOpenRgbStatus, startOpenRgb, stopOpenRgb } from './openrgb.js'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT || 3000)
const updateKey = process.env.UPDATE_KEY || ''
const wledHost = (process.env.WLED_HOST || 'http://192.168.68.166').replace(/\/$/, '')
const app = express()

app.use(express.json())

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

  if (current !== latest) {
    const count = await git(['rev-list', '--count', `${current}..${latest}`])
    commitsBehind = Number(count || 0)
  }

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
  try {
    res.json(await wledRequest('/json/state', { method: 'POST', body: JSON.stringify(req.body) }))
  } catch (error) {
    res.status(502).json({ error: 'Unable to update WLED', detail: error.message })
  }
})

app.get('/api/wled/json/eff', async (_req, res) => {
  try { res.json(await wledRequest('/json/eff')) }
  catch (error) { res.status(502).json({ error: 'Unable to read WLED effects', detail: error.message }) }
})

app.get('/api/wled/json/pal', async (_req, res) => {
  try { res.json(await wledRequest('/json/pal')) }
  catch (error) { res.status(502).json({ error: 'Unable to read WLED palettes', detail: error.message }) }
})

app.get('/api/openrgb/status', async (_req, res) => {
  try { res.json(await getOpenRgbStatus()) }
  catch (error) { res.status(500).json({ error: 'Unable to check OpenRGB', detail: error.message }) }
})

app.post('/api/openrgb/start', async (req, res) => {
  try {
    const mode = ['gaming', 'ambilight', 'audio'].includes(req.body?.mode) ? req.body.mode : 'ambilight'
    res.json(await startOpenRgb(mode))
  } catch (error) {
    res.status(502).json({ error: 'Unable to start OpenRGB sync', detail: error.message })
  }
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
  } catch (error) {
    res.status(500).json({ error: 'Update failed', detail: error.message })
  }
})

app.use(express.static(distDir))
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.listen(port, '0.0.0.0', () => {
  console.log(`Gaming Lights listening on http://0.0.0.0:${port}`)
  console.log(`WLED target: ${wledHost}`)
})
