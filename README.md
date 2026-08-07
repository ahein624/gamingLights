# Gaming Lights

A mobile-first React control surface for a WLED-powered gaming setup.

WLED remains the lighting engine; this app is the human-friendly frontend for power, brightness, colors, scenes, and PC-reactive gaming modes.

## Local development

```bash
npm install
npm run dev
```

## Configuration

Copy `.env.example` to `.env`.

```bash
VITE_WLED_API_BASE=
```

Leave the value blank to use the built-in mock controller. Later, point this at the local proxy/API rather than exposing the WLED controller directly to the browser.

## Current scope

- Mobile-first dark gaming dashboard
- Power and brightness controls
- Quick colors
- Curated lighting scenes
- Game Sync UI state
- Mock WLED controller for development
- Responsive desktop layout

## Planned

- Express proxy for WLED JSON API
- Live WLED state and WebSocket updates
- OpenRGB/game-sync detection
- Preset mapping
- Multiple lighting zones
- Proxmox deployment configuration
