<p align="center">
  <img src="public/favicon.png" alt="Emulites" width="72" height="72" />
</p>

<h1 align="center">Emulites</h1>

<p align="center">
  <strong>A tiny isometric pixel world you build in the browser.</strong>
</p>

<p align="center">
  Name your Emulite · pick an outfit · shape a town · save your world
</p>

<p align="center">
  <a href="https://github.com/dflores112/emulites">GitHub</a>
  ·
  Phaser 3
  ·
  Vite + TypeScript
</p>

---

## Why Emulites

Emulites is a cozy browser builder: an isometric map with a plaza, farm, church, market stalls, wandering NPCs, and little animals. You enter as your own Emulite, place tiles from a hotbar, and your character + builds stick around in local save.

No accounts. No install beyond Node. Open it, play, build.

---

## Quick start

```bash
git clone https://github.com/dflores112/emulites.git
cd emulites
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://127.0.0.1:5173`).

| Script | Purpose |
| --- | --- |
| `npm run dev` | Local development |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Preview the production build |

Ships with a Netlify config (`netlify.toml`) that builds with Node 22 and publishes `dist`.

---

## Features

| | |
| --- | --- |
| **Create** | Name your Emulite and choose from **12 outfits** — denim, crimson, moss, violet, plus caps, beanies, top hat, crown, wizard, flower, and bandana |
| **World** | Large isometric map: grass, paths, plaza, water, trees, farms, barn, church steeple, wells, market stalls |
| **Town life** | Named NPCs in mixed outfits, chickens / rabbits / frogs, and a side-panel town chat |
| **Build** | Hotbar placeables — floors, walls, doors, furniture, crops, fences, scenery — with ghost preview |
| **Camera** | Scroll zoom, drag-to-pan, recenter |
| **Save** | Autosave character + placed tiles in `localStorage`; continue on reload |
| **About** | Top announcement banner → About page with a **copyable contract address** |

---

## Controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` / arrows | Move |
| Mouse wheel | Zoom |
| `C` | Recenter on you |
| Hotbar / keys on icons | Select placeable |
| Left click | Place |
| Right click | Remove |
| `H` or **Drag** mode | Pan the map |
| **New Game** (bottom left) | Wipe save → Enter World screen |

---

## Project structure

```
src/
  data/        Outfits, build catalog, About + contract copy
  scenes/      Create scene · World scene
  systems/     Iso grid, world gen, build, NPCs, animals, save, textures
  ui/          Create UI, HUD, chat, announce/About, styles
public/        Pixel sprite assets + favicon
```

Tune the banner text and Emulite contract address in:

```
src/data/site.ts
```

---

## Stack

- **[Phaser](https://phaser.io/) 3.88.2** — isometric world, sprites, input
- **[Vite](https://vitejs.dev/)** + **TypeScript** — fast local loop and Netlify-ready build
- **DOM UI** — create screen, HUD, chat, and About overlay

---

## Contributing / deploying

1. Fork or clone
2. `npm install` → `npm run dev`
3. Ship with `npm run build` (or connect the repo to Netlify)

Ideas welcome: more outfits, new placeables, better NPC routines, multiplayer later.

---

<p align="center">
  <sub>Built for little worlds.</sub>
</p>
