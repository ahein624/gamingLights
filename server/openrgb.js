import net from 'node:net'

const host = process.env.OPENRGB_HOST || ''
const sdkPort = Number(process.env.OPENRGB_PORT || 6742)
const hookPort = Number(process.env.OPENRGB_HOOK_PORT || 6743)
const hookProtocol = process.env.OPENRGB_HOOK_PROTOCOL || 'http'
const startPath = process.env.OPENRGB_START_PATH || '/gaming/start'
const stopPath = process.env.OPENRGB_STOP_PATH || '/gaming/stop'
const ambilightPath = process.env.OPENRGB_AMBILIGHT_PATH || '/gaming/ambilight'
const audioPath = process.env.OPENRGB_AUDIO_PATH || '/gaming/audio'

let requestedMode = 'off'

function tcpProbe(timeout = 1200) {
  return new Promise((resolve) => {
    if (!host) return resolve(false)

    const socket = net.createConnection({ host, port: sdkPort })
    let settled = false

    const finish = (value) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(value)
    }

    socket.setTimeout(timeout)
    socket.once('connect', () => finish(true))
    socket.once('timeout', () => finish(false))
    socket.once('error', () => finish(false))
  })
}

async function callHook(pathname) {
  if (!host) throw new Error('OPENRGB_HOST is not configured')
  const url = `${hookProtocol}://${host}:${hookPort}${pathname}`
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(4000) })
  if (!response.ok) throw new Error(`OpenRGB hook returned ${response.status}`)
  return true
}

export async function getOpenRgbStatus() {
  const online = await tcpProbe()
  return {
    configured: Boolean(host),
    online,
    host: host || null,
    sdkPort,
    hookPort,
    requestedMode,
  }
}

export async function startOpenRgb(mode = 'ambilight') {
  const pathByMode = {
    gaming: startPath,
    ambilight: ambilightPath,
    audio: audioPath,
  }

  const pathname = pathByMode[mode] || startPath
  await callHook(pathname)
  requestedMode = mode
  return getOpenRgbStatus()
}

export async function stopOpenRgb() {
  await callHook(stopPath)
  requestedMode = 'off'
  return getOpenRgbStatus()
}
