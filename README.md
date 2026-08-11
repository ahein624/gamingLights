# Gaming Lights

A mobile-first React control surface for a WLED-powered gaming setup.

WLED remains the lighting engine; this app is the human-friendly frontend for power, brightness, colors, animations, presets, PC-reactive gaming modes, settings, and self-update.

## Architecture

```text
Browser / iOS Home Screen App
  -> Gaming Lights LXC (React + Express)
      -> WLED 192.168.68.252
      -> Shared preset storage on the LXC
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

## iOS / PWA

Gaming Lights includes a web app manifest, standalone iOS metadata, safe-area support, a service worker, and touch-oriented controls. On iPhone/iPad, open the site in Safari and use **Share -> Add to Home Screen**. The installed app opens without normal Safari chrome and respects the device safe areas.

The service worker caches only the application shell. API/WLED/OpenRGB requests remain live and are never served from the offline cache.

## WLED

Production defaults to:

```text
WLED_HOST=http://192.168.68.252
```

The frontend talks to the same-origin `/api/wled` proxy rather than directly to the ESP32. The UI polls WLED so physical-button changes and web changes remain synchronized.

### Elite 4D physical button

The final hardware uses a **normally-open momentary illuminated pushbutton** as a WLED control input, not a 24 V master power switch. The Elite 4D therefore remains powered and reachable even when the LEDs are off.

```text
Elite 4D IO13  -> momentary button NO contact
Elite 4D GND   -> momentary button COM contact
```

Do **not** connect 24 V to IO13. The illuminated ring is a separate circuit and must be wired according to the button's voltage rating.

## Animations and presets

The animation UI discovers the effects and palettes available on the installed WLED build instead of relying on fixed effect numbers. It includes curated effects, curated color moods, one-tap featured combinations, speed/intensity controls, and a random **Surprise Me** generator.

The Preset Studio provides full fine tuning for:

- Animation/effect
- Palette
- Speed
- Intensity
- Brightness
- Base color
- Preset name
- Live preview

Saved presets are stored on the Gaming Lights LXC at `data/user-presets.json` and are shared across phones, computers, and other clients. The file is ignored by Git, so self-updates do not overwrite user presets.

Starter presets are created automatically on first use: Boss Fight, Late Night, Deep Space, and Hyperdrive.

## OpenRGB Game Sync

1. Install OpenRGB on the gaming PC.
2. Enable the OpenRGB SDK server on port `6742`.
3. Install the OpenRGB Effects Plugin and configure Ambilight/audio effects as desired.
4. Configure an E1.31 device in OpenRGB that targets WLED at `192.168.68.252` and matches the strip's addressable zone count.
5. Install/configure the OpenRGB HTTP Hook plugin and expose these actions on the LAN listener (default used by this app: port `6743`):
   - `/gaming/start`
   - `/gaming/stop`
   - `/gaming/ambilight`
   - `/gaming/audio`
6. Reserve the gaming PC's IP address and set it as `OPENRGB_HOST` in the LXC environment.

## Software update key

The server still validates updates against `UPDATE_KEY` from the LXC environment. The Settings UI can optionally remember the entered key in that browser's local storage so it does not need to be typed for every update. Use the remember option only on trusted devices. The key is never committed to the repository.

## Current scope

- Responsive gaming-light dashboard
- iOS/PWA home-screen support and safe-area layout
- WLED state synchronization with physical GPIO13 button changes
- WLED power, brightness, color, effects, palettes, speed, and intensity controls
- Curated animation recipes and Surprise Me
- Shared server-side Preset Studio
- Color picker and curated scenes
- Animated/customizable background
- Noise-awareness settings
- WLED server-side proxy
- OpenRGB health and remote-effect API
- Remembered update credential option
- Proxmox/systemd deployment

## Next

- Detect WLED realtime/live state more deeply while OpenRGB is streaming
- Add multiple lighting zones
- Add optional preset ordering/favorites
- Move noise awareness to the ESP32 onboard microphone when the exact board/microphone interface is confirmed
