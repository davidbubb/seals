# 🦭 Seal Fishing Game

A browser-based 2D fishing game built with HTML5 Canvas. Control a seal swimming around a fixed ocean arena and catch as many fish as you can before the timer runs out!

## How to Play

Open `index.html` in any modern browser — no build step or server required.

Use the **← ↑ → ↓** arrow keys to swim your seal around the screen and catch fish before the 2-minute timer runs out.

## Features

### Gameplay
- **Player** — Seal (🦭) moves with arrow keys, stays within game bounds, and flips to face the direction of travel
- **5 fish types** spawn from random edges, bounce off walls with a wobble animation; weighted random selection skews spawns toward common low-value fish
- **AABB collision detection** — catching a fish removes it, adds points, and triggers a particle burst
- **Countdown timer** — defaults to 2 minutes; colour shifts yellow → red as time runs low (pulsing in the final 10 seconds)
- **High score** — persisted to `localStorage` across sessions
- **Catch log** — rolling list of recent catches displayed beneath the canvas

### Fish Types

| Type | Size | Points | Rarity |
|---|---|---|---|
| 🐟 Minnow | Small | 1 | Very common |
| 🐠 Clownfish | Medium-small | 2 | Common |
| 🐡 Pufferfish | Medium | 3 | Uncommon |
| 🦐 Prawn | Medium-large | 5 | Rare |
| 🐙 Octopus | Large | 10 | Very rare |

### Customisation (Settings Panel)
- **Game duration** — configurable from 10 to 600 seconds
- **Custom sprites** — upload your own PNG/JPG image for the seal and each of the 5 fish types individually; emoji sprites are used as the default fallback

### Screens
- **Start screen** — fish swim in the background while idle
- **End screen** — score summary with "New High Score!" detection
- **Settings panel** — accessible at any time; pauses the game timer while open

## Files

| File | Description |
|---|---|
| `index.html` | Game layout, HUD, overlays and styles |
| `game.js` | All game logic — constants, state, input, spawning, physics, rendering, settings |
