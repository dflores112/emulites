# Emulites

A little isometric pixel world you build in the browser.

Name your Emulite, pick an outfit (hats included), wander a generated town, place floors and furniture, and keep your world saved locally.

**Live repo:** [github.com/dflores112/emulites](https://github.com/dflores112/emulites)

---

## Play

```bash
npm install
npm run dev
```

Open the local URL Vite prints (usually `http://127.0.0.1:5173`).

| Command | What it does |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Typecheck + production build → `dist/` |
| `npm run preview` | Serve the production build |

Deploy-ready for Netlify (`netlify.toml` → `npm run build`, publish `dist`).

---

## What you can do

- **Create** — pick a name and one of 12 outfits (caps, beanies, crown, wizard hat, and more)
- **Explore** — grass, paths, plaza, water, farms, church, market stalls, animals, and named NPCs
- **Build** — hotbar placeables (floors, walls, doors, furniture, crops, trees…)
- **Chat** — town chat on the side of the map
- **Save** — character + placed tiles autosave in `localStorage`
- **About** — top banner opens About, with a copyable Emulite contract address

---

## Controls

| Input | Action |
| --- | --- |
| `WASD` / arrows | Move |
| Scroll | Zoom |
| `C` | Recenter camera |
| Hotbar / number keys | Select placeable |
| Click | Place |
| Right-click | Remove |
| `H` / Drag | Pan the map |
| New Game (bottom left) | Clear save and return to Enter World |

---

## Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [Phaser](https://phaser.io/) `3.88.2`
- Plain DOM UI for create screen, HUD, chat, and About

---

## Project layout

```
src/
  data/       outfits, build catalog, About / contract copy
  scenes/     Create + World
  systems/    iso grid, world gen, build, NPCs, animals, save, textures
  ui/         create screen, HUD, chat, announce / About, styles
public/       pixel sprite + favicon
```

Contract address and banner text live in `src/data/site.ts`.

---

## License

Private project for now — all rights reserved unless noted otherwise.
