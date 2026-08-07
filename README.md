# Gaming Lights

A mobile-first React control surface for a WLED-powered gaming setup.

WLED remains the lighting engine; this app is the human-friendly frontend for power, brightness, colors, scenes, PC-reactive gaming modes, settings, and self-update.

## Architecture

```text
Browser
  -> Gaming Lights LXC (React + Express)
      -> WLED 192.168.68.166
      -> OpenRGB on gaming PC
           -> E1.31 realtime stream -> WLED
```

The LXC never captures the gaming PC screen. OpenRGB and its Effects Plugin stay on the PC, where Ambilight/audio capture belong. The web app remotely selects those modes and reports connection state.

## Local development

```bash
npm install
npm run dev
```

## Production

Copy `.env.example` to the environment used by the systemd service, then:

```bash
npm install
npm run build
npm start
```

## WLED

Production defaults to:

```text
WLED_HOST=http://192.168.68.166
```

The frontend talks to the same-origin `/api/wled` proxy rather than directly to the ESP32.

## OpenRGB Game Sync

1. Install OpenRGB on the gaming PC.
2. Enable the OpenRGB SDK server. The default SDK port is `6742`.
3. Install the OpenRGB Effects Plugin and configure Ambilight/audio effects as desired.
4. Configure an E1.31 device in OpenRGB that targets WLED at `192.168.68.166` and matches the strip's addressable zone count.
5. Install/configure the OpenRGB HTTP Hook plugin and expose these actions on the LAN listener (default used by this app: port `6743`):
   - `/gaming/start`
   - `/gaming/stop`
   - `/gaming/ambilight`
   - `/gaming/audio`
6. Reserve the gaming PC's IP address and set it as `OPENRGB_HOST` in the LXC environment.

The backend exposes:

```text
GET  /api/openrgb/status
POST /api/openrgb/start   { "mode": "ambilight" | "audio" | "gaming" }
POST /api/openrgb/stop
```

## Current scope

- Responsive gaming-light dashboard
- WLED power, brightness, and color controls
- Color picker and curated scenes
- Animated/customizable background
- Noise-awareness settings
- WLED server-side proxy
- OpenRGB health and remote-effect API
- Software update controls
- Proxmox/systemd deployment

## Next

- Connect the Game Sync UI to the new OpenRGB API
- Detect WLED realtime/live state
- Map UI scenes to WLED presets
- Add multiple lighting zones
- Move noise awareness to the ESP32 onboard microphone when the exact board/microphone interface is confirmed
