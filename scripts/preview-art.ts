/**
 * Renders the generated pixel art to a PNG contact sheet so the look can be
 * reviewed without booting the game. Run with: npm run art:preview
 *
 * Panels are drawn at true 1:1, which is what the game shows at zoom 1. Judging
 * pixel art at a magnified scale hides aliasing, so keep this honest.
 */
import { createCanvas } from '@napi-rs/canvas'
import { writeFileSync } from 'node:fs'
import {
  PALETTE,
  css,
  cssHex,
  drawConifer,
  drawIsoHouseShell,
  drawShrub,
  speckleDiamond,
} from '../src/systems/art.ts'

const TILE_W = 64
const TILE_H = 32
const OUT = 'docs/art-preview.png'

const PANEL_W = 512
const PANEL_H = 260

type Panel = { label: string; block: number; smooth: boolean }

/**
 * Both panels show the same art blown up 2x, the way a Retina display presents
 * the canvas. Nearest is what the game does today; smooth is the proposal.
 */
const PANELS: Panel[] = [
  { label: 'nearest 2x (current, blocky)', block: 1, smooth: false },
  { label: 'smooth 2x (proposed)', block: 2, smooth: true },
]

const canvas = createCanvas(PANEL_W * PANELS.length, PANEL_H)
const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D

ctx.fillStyle = '#20242b'
ctx.fillRect(0, 0, canvas.width, canvas.height)

/** Draws one native-resolution scene filling a PANEL_W/2 x PANEL_H/2 area. */
function drawSceneInto(ctx: CanvasRenderingContext2D, block: number): void {
  // Overdraw the grid so grass covers the whole panel and clips at the edges.
  for (let gy = -2; gy < 10; gy++) {
    for (let gx = -2; gx < 10; gx++) {
      const cx = 128 + (gx - gy) * (TILE_W / 2)
      const cy = -30 + (gx + gy) * (TILE_H / 2)
      const alt = (gx * 5 + gy * 11) % 17 === 0
      speckleDiamond(
        ctx,
        cx,
        cy,
        TILE_W + 6,
        TILE_H + 6,
        alt ? PALETTE.grass2Base : PALETTE.grassBase,
        alt ? PALETTE.grass2Light : PALETTE.grassLight,
        alt ? PALETTE.grass2Dark : PALETTE.grassDark,
        gx * 3 + gy * 7,
        block,
      )
    }
  }

  // A 2x2 cottage, drawn back-to-front like the world does.
  for (const [hx, hy] of [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ] as [number, number][]) {
    const wallH = 48
    const cx = 168 + (hx - hy) * (TILE_W / 2)
    const cy = 26 + (hx + hy) * (TILE_H / 2)
    ctx.save()
    ctx.translate(cx - TILE_W / 2, cy)
    drawIsoHouseShell(ctx, TILE_W, TILE_H, wallH, 10)
    ctx.fillStyle = css(PALETTE.trim)
    ctx.fillRect(11, 27, 12, 12)
    ctx.fillStyle = css(PALETTE.windowPane)
    ctx.fillRect(12, 28, 10, 10)
    ctx.restore()
  }

  drawConifer(ctx, 34, 104)
  drawConifer(ctx, 68, 122, 0.8)
  drawConifer(ctx, 100, 104)
  drawShrub(ctx, 128, 112, 22, 14)

  const plateText = 'Emulite'
  ctx.font = '11px monospace'
  const tw = Math.ceil(ctx.measureText(plateText).width)
  ctx.fillStyle = cssHex(PALETTE.plate)
  ctx.fillRect(30, 24, tw + 6, 14)
  ctx.fillStyle = cssHex(PALETTE.plateInk)
  ctx.fillText(plateText, 33, 34)
}

PANELS.forEach((panel, i) => {
  // Draw at native size, then blit at 2x with the panel's filtering so the
  // comparison matches what the browser does when it scales the canvas.
  const half = createCanvas(PANEL_W / 2, PANEL_H / 2)
  const hctx = half.getContext('2d') as unknown as CanvasRenderingContext2D
  hctx.fillStyle = '#20242b'
  hctx.fillRect(0, 0, PANEL_W / 2, PANEL_H / 2)
  drawSceneInto(hctx, panel.block)

  const ox = i * PANEL_W
  ctx.imageSmoothingEnabled = panel.smooth
  ctx.drawImage(half as unknown as CanvasImageSource, ox, 0, PANEL_W, PANEL_H)

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#11141a'
  ctx.fillRect(ox + 6, 6, 200, 18)
  ctx.fillStyle = '#e8eef7'
  ctx.font = '12px monospace'
  ctx.fillText(panel.label, ox + 10, 19)
})

writeFileSync(OUT, canvas.toBuffer('image/png'))
console.log(`wrote ${OUT} (${canvas.width}x${canvas.height}, 1:1)`)
