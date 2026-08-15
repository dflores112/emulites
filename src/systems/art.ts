/**
 * Shared palette and pixel-art drawing helpers.
 *
 * Deliberately free of Phaser imports so the same drawing code can run headless
 * (see scripts/preview-art.mjs) and be eyeballed without launching the game.
 */

export const PALETTE = {
  grassBase: 0x46a021,
  grassLight: 0x50ad28,
  grassDark: 0x3f941d,

  grass2Base: 0x43991f,
  grass2Light: 0x4da527,
  grass2Dark: 0x3b8c1a,

  dirtBase: 0xa8763c,
  dirtLight: 0xbc8b4c,
  dirtDark: 0x8c5f2c,

  needle: 0x1f6b2a,
  needleLight: 0x2e8536,
  needleDark: 0x11491c,
  trunk: 0x6b4423,
  trunkDark: 0x4d2f16,

  wall: 0xe6d2ac,
  wallShade: 0xd0b98e,
  wallLine: 0x8a6c46,

  roof: 0xb03a2c,
  roofLight: 0xc75043,
  roofDark: 0x8a2620,

  trim: 0x7a5533,
  trimDark: 0x53381f,
  windowPane: 0x4a3117,
  windowLit: 0xe8b84c,

  plate: 0xd32a2a,
  plateInk: 0xfff4e4,
} as const

export function css(hex: number): string {
  return `rgb(${(hex >> 16) & 0xff},${(hex >> 8) & 0xff},${hex & 0xff})`
}

/** `#rrggbb`, for the DOM/Phaser text styles that want a hex string. */
export function cssHex(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}

/** Red banner nameplate shared by the player and NPCs. */
export const NAMEPLATE_STYLE = {
  fontFamily: 'Courier New, monospace',
  fontSize: '11px',
  color: cssHex(PALETTE.plateInk),
  backgroundColor: cssHex(PALETTE.plate),
  padding: { x: 3, y: 1 },
} as const

/** Stable pseudorandom in [0,1) so generated art looks identical every run. */
export function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function fillDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.beginPath()
  ctx.moveTo(cx, cy - h / 2)
  ctx.lineTo(cx + w / 2, cy)
  ctx.lineTo(cx, cy + h / 2)
  ctx.lineTo(cx - w / 2, cy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

/**
 * Terrain tile with chunky two-tone speckle. The mottling is what reads as
 * "pixel grass" from a distance instead of a flat colour field.
 */
export function speckleDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  base: number,
  light: number,
  dark: number,
  seed = 0,
  block = 2,
): void {
  fillDiamond(ctx, cx, cy, w, h, css(base))

  const hw = w / 2
  const hh = h / 2
  for (let py = -hh; py < hh; py += block) {
    for (let px = -hw; px < hw; px += block) {
      // Keep speckles off the very edge so neighbouring tiles still blend.
      if (Math.abs(px) / hw + Math.abs(py) / hh > 0.9) continue
      const n = hash2(px + seed * 37.13, py + seed * 91.7)
      if (n < 0.16) ctx.fillStyle = css(light)
      else if (n < 0.28) ctx.fillStyle = css(dark)
      else continue
      ctx.fillRect(cx + px, cy + py, block, block)
    }
  }
}

/**
 * The two visible wall faces plus a shingled roof, shared by every cottage-style
 * texture so walls and doors always match.
 */
export function drawIsoHouseShell(
  ctx: CanvasRenderingContext2D,
  tileW: number,
  tileH: number,
  wallH: number,
  topY: number,
  wall = PALETTE.wall,
  wallShade = PALETTE.wallShade,
  roof = PALETTE.roof,
  roofLight = PALETTE.roofLight,
): void {
  const midX = tileW / 2
  const footY = topY + wallH - 8

  ctx.beginPath()
  ctx.moveTo(2, topY)
  ctx.lineTo(midX, topY + tileH / 2)
  ctx.lineTo(midX, topY + tileH / 2 + wallH - 8)
  ctx.lineTo(2, footY)
  ctx.closePath()
  ctx.fillStyle = css(wall)
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(tileW - 2, topY)
  ctx.lineTo(midX, topY + tileH / 2)
  ctx.lineTo(midX, topY + tileH / 2 + wallH - 8)
  ctx.lineTo(tileW - 2, footY)
  ctx.closePath()
  ctx.fillStyle = css(wallShade)
  ctx.fill()

  // Full-tile roof so neighbouring roof sprites meet without a pale seam.
  fillDiamond(ctx, midX, topY, tileW, tileH, css(roof))
  fillDiamond(ctx, midX, topY - 1, tileW - 10, tileH - 6, css(roofLight))

  // Shingle rows: thin dark bands clipped to the roof diamond.
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(midX, topY - tileH / 2)
  ctx.lineTo(midX + tileW / 2, topY)
  ctx.lineTo(midX, topY + tileH / 2)
  ctx.lineTo(midX - tileW / 2, topY)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = css(PALETTE.roofDark)
  ctx.globalAlpha = 0.35
  for (let y = topY - tileH / 2; y < topY + tileH / 2; y += 4) {
    ctx.fillRect(0, Math.round(y), tileW, 1)
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/**
 * Layered conifer: three tiers over a short trunk, drawn as outlined vector
 * shapes so edges stay clean when the canvas is scaled up.
 */
export function drawConifer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  scale = 1,
): void {
  const px = (n: number) => n * scale
  const trunkW = Math.max(2, px(6))
  const trunkH = Math.max(4, px(12))

  ctx.fillStyle = css(PALETTE.trunk)
  ctx.fillRect(cx - trunkW / 2, baseY - trunkH, trunkW, trunkH)
  ctx.fillStyle = css(PALETTE.trunkDark)
  ctx.fillRect(cx, baseY - trunkH, trunkW / 2, trunkH)

  const tiers: [number, number, number][] = [
    [px(20), px(22), baseY - trunkH - px(20)],
    [px(15), px(18), baseY - trunkH - px(34)],
    [px(10), px(14), baseY - trunkH - px(46)],
  ]

  ctx.lineJoin = 'round'
  for (const [halfWidth, height, top] of tiers) {
    const tier = (hw: number, hgt: number, offsetX: number) => {
      ctx.beginPath()
      ctx.moveTo(cx + offsetX, top)
      ctx.lineTo(cx + offsetX + hw, top + hgt)
      ctx.lineTo(cx + offsetX - hw, top + hgt)
      ctx.closePath()
    }

    tier(halfWidth, height, 0)
    ctx.fillStyle = css(PALETTE.needle)
    ctx.fill()
    ctx.strokeStyle = css(PALETTE.needleDark)
    ctx.lineWidth = Math.max(1, px(1.5))
    ctx.stroke()

    // Highlight down the lit side.
    ctx.save()
    tier(halfWidth, height, 0)
    ctx.clip()
    tier(halfWidth * 0.5, height * 0.92, -halfWidth * 0.34)
    ctx.fillStyle = css(PALETTE.needleLight)
    ctx.fill()
    ctx.restore()
  }
}

/** Rounded shrub: outlined ellipse with a highlight on the lit side. */
export function drawShrub(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
): void {
  const rx = w / 2
  const ry = h / 2
  const cy = baseY - ry

  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(PALETTE.needle)
  ctx.fill()
  ctx.strokeStyle = css(PALETTE.needleDark)
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.beginPath()
  ctx.ellipse(cx - rx * 0.22, cy - ry * 0.3, rx * 0.5, ry * 0.45, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(PALETTE.needleLight)
  ctx.fill()
}
