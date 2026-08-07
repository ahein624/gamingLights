import express from 'express'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT || 3000)
const updateKey = process.env.UPDATE_KEY || ''
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

  return {
    current,
    latest,
    branch,
    updateAvailable: current !== latest,
    commitsBehind,
  }
}

app.get('/api/update/status', async (_req, res) => {
  try {
    res.json(await updateStatus())
  } catch (error) {
    res.status(500).json({ error: 'Unable to check for updates', detail: error.message })
  }
})

app.post('/api/update/apply', async (req, res) => {
  if (!updateKey) {
    return res.status(503).json({ error: 'Self-update is not configured on this server.' })
  }

  if (req.get('x-update-key') !== updateKey) {
    return res.status(401).json({ error: 'Invalid update key.' })
  }

  try {
    const before = await updateStatus()
    if (!before.updateAvailable) return res.json({ updated: false, ...before })
    if (before.branch !== 'main') {
      return res.status(409).json({ error: 'Deployed checkout must be on the main branch before self-update can run.' })
    }

    await git(['merge', '--ff-only', 'origin/main'])
    await execFileAsync('npm', ['install', '--no-audit', '--no-fund'], { cwd: rootDir })
    await execFileAsync('npm', ['run', 'build'], { cwd: rootDir })

    const after = await updateStatus()
    res.json({ updated: true, restartPending: true, ...after })

    // systemd should run this service with Restart=always.
    setTimeout(() => process.exit(0), 1200)
  } catch (error) {
    res.status(500).json({ error: 'Update failed', detail: error.message })
  }
})

app.use(express.static(distDir))
app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')))

app.listen(port, '0.0.0.0', () => {
  console.log(`Gaming Lights listening on http://0.0.0.0:${port}`)
})
