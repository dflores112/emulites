import Phaser from 'phaser'
import { TILE_H, TILE_W } from './IsoGrid'
import {
  BASE_BODY_RGB,
  HAT_PAD,
  OUTFITS,
  type HatId,
  type Outfit,
  type OutfitId,
} from '../data/outfits'
import type { ItemId } from '../data/catalog'
import { TOWERS, type TowerSpec } from '../data/city'
import {
  PALETTE,
  css,
  drawConifer,
  drawIsoHouseShell,
  drawShrub,
  fillDiamond,
  speckleDiamond,
} from './art'

export const PLAYER_DISPLAY_SCALE = 4

function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  }
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function register(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement) {
  if (scene.textures.exists(key)) {
    scene.textures.remove(key)
  }
  scene.textures.addCanvas(key, canvas)
}

export function generateTextures(scene: Phaser.Scene): void {
  // Soft terrain: oversized diamonds, no outlines (kills grid look)
  const softTile = (key: string, base: number, mid: number, speck?: number) => {
    const pad = 8
    const c = makeCanvas(TILE_W + pad, TILE_H + pad)
    const ctx = c.getContext('2d')!
    const cx = (TILE_W + pad) / 2
    const cy = (TILE_H + pad) / 2
    // Big enough that neighbors fully cover seams
    fillDiamond(ctx, cx, cy, TILE_W + 6, TILE_H + 6, css(base))
    fillDiamond(ctx, cx, cy - 1, TILE_W - 2, TILE_H, css(mid))
    if (speck !== undefined) {
      ctx.fillStyle = css(speck)
      ctx.fillRect(cx - 8, cy - 2, 2, 2)
      ctx.fillRect(cx + 6, cy + 2, 2, 2)
      ctx.fillRect(cx + 2, cy - 5, 2, 2)
    }
    register(scene, key, c)
  }

  // Speckled tiles: chunky two-tone noise is what reads as pixel ground cover.
  const speckTile = (
    key: string,
    base: number,
    light: number,
    dark: number,
    seed: number,
  ) => {
    const pad = 8
    const c = makeCanvas(TILE_W + pad, TILE_H + pad)
    const ctx = c.getContext('2d')!
    speckleDiamond(
      ctx,
      (TILE_W + pad) / 2,
      (TILE_H + pad) / 2,
      TILE_W + 6,
      TILE_H + 6,
      base,
      light,
      dark,
      seed,
    )
    register(scene, key, c)
  }

  softTile('asphalt', 0x3a3f45, 0x43484f, 0x33373c)
  softTile('sidewalk', 0x9c9c98, 0xacaca8, 0x8e8e8a)
  speckTile('grass', PALETTE.grassBase, PALETTE.grassLight, PALETTE.grassDark, 1)
  speckTile('grass2', PALETTE.grass2Base, PALETTE.grass2Light, PALETTE.grass2Dark, 7)
  speckTile('path', PALETTE.dirtBase, PALETTE.dirtLight, PALETTE.dirtDark, 3)
  softTile('sand', 0xd8c894, 0xe6d8a8)
  softTile('plaza', 0xb8b0a0, 0xc8c0b0, 0xa09888)

  // Water — soft, no hard edge
  {
    const pad = 8
    const c = makeCanvas(TILE_W + pad, TILE_H + pad)
    const ctx = c.getContext('2d')!
    const cx = (TILE_W + pad) / 2
    const cy = (TILE_H + pad) / 2
    fillDiamond(ctx, cx, cy, TILE_W + 6, TILE_H + 6, css(0x2a6894))
    fillDiamond(ctx, cx, cy - 1, TILE_W - 4, TILE_H - 2, css(0x3f8fc2))
    ctx.strokeStyle = css(0xa8d8f0)
    ctx.globalAlpha = 0.45
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy)
    ctx.quadraticCurveTo(cx - 2, cy - 5, cx + 10, cy + 1)
    ctx.stroke()
    ctx.globalAlpha = 1
    register(scene, 'water', c)
  }

  // Tree — stepped conifer
  {
    const c = makeCanvas(56, 72)
    const ctx = c.getContext('2d')!
    drawConifer(ctx, 28, 72)
    register(scene, 'tree', c)
  }

  // Bush
  {
    const c = makeCanvas(40, 28)
    const ctx = c.getContext('2d')!
    drawShrub(ctx, 20, 28, 26, 18)
    register(scene, 'bush', c)
  }

  // Floor — wood planks, soft edge
  {
    const c = makeCanvas(TILE_W + 2, TILE_H + 2)
    const ctx = c.getContext('2d')!
    const cx = (TILE_W + 2) / 2
    const cy = (TILE_H + 2) / 2
    fillDiamond(ctx, cx, cy, TILE_W, TILE_H, css(0xc4a06a))
    fillDiamond(ctx, cx, cy - 1, TILE_W - 8, TILE_H - 6, css(0xd4b47a))
    ctx.strokeStyle = css(0xa88850)
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(cx - 12, cy - 3)
    ctx.lineTo(cx + 12, cy + 4)
    ctx.moveTo(cx - 4, cy - 7)
    ctx.lineTo(cx + 4, cy + 7)
    ctx.stroke()
    ctx.globalAlpha = 1
    register(scene, 'floor', c)
  }

  // Cottage wall — warm plaster + window
  {
    const wallH = 48
    const c = makeCanvas(TILE_W, TILE_H + wallH)
    const ctx = c.getContext('2d')!
    const topY = 10
    drawIsoHouseShell(ctx, TILE_W, TILE_H, wallH, topY)
    // window on left face
    ctx.fillStyle = css(PALETTE.trim)
    ctx.fillRect(11, topY + 17, 12, 12)
    ctx.fillStyle = css(PALETTE.windowPane)
    ctx.fillRect(12, topY + 18, 10, 10)
    ctx.fillStyle = css(PALETTE.trim)
    ctx.fillRect(16, topY + 18, 2, 10)
    ctx.fillRect(12, topY + 22, 10, 2)
    register(scene, 'wall', c)
  }

  // Door — framed wood with arch trim
  {
    const wallH = 48
    const c = makeCanvas(TILE_W, TILE_H + wallH)
    const ctx = c.getContext('2d')!
    const topY = 10
    drawIsoHouseShell(ctx, TILE_W, TILE_H, wallH, topY)
    // door panel
    const dx = TILE_W / 2 - 9
    const dy = topY + 14
    ctx.fillStyle = css(PALETTE.trimDark)
    ctx.fillRect(dx - 1, dy - 1, 20, wallH - 18)
    ctx.fillStyle = css(PALETTE.trim)
    ctx.fillRect(dx, dy, 18, wallH - 20)
    ctx.fillStyle = css(0x6a4424)
    ctx.fillRect(dx + 2, dy + 4, 6, 14)
    ctx.fillRect(dx + 10, dy + 4, 6, 14)
    ctx.fillRect(dx + 2, dy + 22, 6, 12)
    ctx.fillRect(dx + 10, dy + 22, 6, 12)
    // knob
    ctx.fillStyle = css(0xe8c860)
    ctx.beginPath()
    ctx.arc(dx + 14, dy + 22, 2, 0, Math.PI * 2)
    ctx.fill()
    register(scene, 'door', c)
  }

  // Table
  {
    const h = 28
    const c = makeCanvas(TILE_W, TILE_H + h)
    const ctx = c.getContext('2d')!
    const topY = h / 2 + 2
    fillDiamond(ctx, TILE_W / 2, topY, TILE_W - 16, TILE_H - 8, css(0xb88848))
    fillDiamond(ctx, TILE_W / 2, topY - 1, TILE_W - 22, TILE_H - 12, css(0xc89858))
    ctx.fillStyle = css(0x8a6838)
    ctx.fillRect(TILE_W / 2 - 10, topY + 6, 4, h - 4)
    ctx.fillRect(TILE_W / 2 + 6, topY + 6, 4, h - 4)
    register(scene, 'table', c)
  }

  // Chair
  {
    const h = 24
    const c = makeCanvas(40, TILE_H + h)
    const ctx = c.getContext('2d')!
    const cx = 20
    const topY = h / 2
    fillDiamond(ctx, cx, topY + 8, 28, 14, css(0xa87840))
    ctx.fillStyle = css(0x8a5830)
    ctx.fillRect(cx - 10, topY - 4, 20, 10)
    ctx.fillRect(cx - 8, topY + 12, 3, 12)
    ctx.fillRect(cx + 5, topY + 12, 3, 12)
    register(scene, 'chair', c)
  }

  // Church stone wall + stained glass + dark slate roof
  {
    const wallH = 56
    const c = makeCanvas(TILE_W, TILE_H + wallH)
    const ctx = c.getContext('2d')!
    const topY = 8
    ctx.beginPath()
    ctx.moveTo(2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 6)
    ctx.lineTo(2, topY + wallH - 6)
    ctx.closePath()
    ctx.fillStyle = css(0xc8c4bc)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(TILE_W - 2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 6)
    ctx.lineTo(TILE_W - 2, topY + wallH - 6)
    ctx.closePath()
    ctx.fillStyle = css(0xa8a49c)
    ctx.fill()
    fillDiamond(ctx, TILE_W / 2, topY, TILE_W - 4, TILE_H - 2, css(0x4a4a58))
    fillDiamond(ctx, TILE_W / 2, topY - 1, TILE_W - 14, TILE_H - 8, css(0x5a5a6a))
    // stained glass
    ctx.fillStyle = css(0x5a30a0)
    ctx.fillRect(11, topY + 16, 5, 14)
    ctx.fillStyle = css(0x3080c0)
    ctx.fillRect(16, topY + 16, 5, 14)
    ctx.fillStyle = css(0xc04060)
    ctx.fillRect(11, topY + 30, 10, 4)
    register(scene, 'churchWall', c)
  }

  // Church steeple / tower
  {
    const c = makeCanvas(48, 96)
    const ctx = c.getContext('2d')!
    // tower body
    ctx.fillStyle = css(0xc8c4bc)
    ctx.fillRect(12, 36, 24, 52)
    ctx.fillStyle = css(0xa8a49c)
    ctx.fillRect(28, 36, 8, 52)
    // pointed roof
    ctx.beginPath()
    ctx.moveTo(24, 4)
    ctx.lineTo(40, 36)
    ctx.lineTo(8, 36)
    ctx.closePath()
    ctx.fillStyle = css(0x4a4a58)
    ctx.fill()
    ctx.fillStyle = css(0x5a5a6a)
    ctx.beginPath()
    ctx.moveTo(24, 4)
    ctx.lineTo(40, 36)
    ctx.lineTo(24, 36)
    ctx.closePath()
    ctx.fill()
    // window
    ctx.fillStyle = css(0xe8d060)
    ctx.fillRect(20, 48, 8, 12)
    ctx.strokeStyle = css(0x333)
    ctx.strokeRect(20, 48, 8, 12)
    // cross
    ctx.fillStyle = css(0xf0e8d0)
    ctx.fillRect(22, 8, 4, 14)
    ctx.fillRect(18, 12, 12, 4)
    register(scene, 'steeple', c)
  }

  // Barn wall — weathered red wood
  {
    const wallH = 48
    const c = makeCanvas(TILE_W, TILE_H + wallH)
    const ctx = c.getContext('2d')!
    const topY = 10
    ctx.beginPath()
    ctx.moveTo(2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 8)
    ctx.lineTo(2, topY + wallH - 8)
    ctx.closePath()
    ctx.fillStyle = css(0xb04838)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(TILE_W - 2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 8)
    ctx.lineTo(TILE_W - 2, topY + wallH - 8)
    ctx.closePath()
    ctx.fillStyle = css(0x903828)
    ctx.fill()
    fillDiamond(ctx, TILE_W / 2, topY, TILE_W - 4, TILE_H - 2, css(0x6a4828))
    fillDiamond(ctx, TILE_W / 2, topY - 1, TILE_W - 14, TILE_H - 8, css(0x7a5838))
    // planks
    ctx.strokeStyle = css(0x702818)
    ctx.beginPath()
    ctx.moveTo(8, topY + 18)
    ctx.lineTo(28, topY + 40)
    ctx.moveTo(8, topY + 30)
    ctx.lineTo(28, topY + 52)
    ctx.stroke()
    register(scene, 'barnWall', c)
  }

  // Crop / farm plot
  {
    const c = makeCanvas(TILE_W + 4, TILE_H + 4)
    const ctx = c.getContext('2d')!
    const cx = (TILE_W + 4) / 2
    const cy = (TILE_H + 4) / 2
    fillDiamond(ctx, cx, cy, TILE_W + 2, TILE_H + 2, css(0x6a4a28))
    fillDiamond(ctx, cx, cy - 1, TILE_W - 6, TILE_H - 4, css(0x7a5a32))
    ctx.fillStyle = css(0x5aad40)
    for (let i = 0; i < 5; i++) {
      const ox = -10 + i * 5
      ctx.fillRect(cx + ox, cy - 6, 2, 8)
      ctx.fillStyle = css(0xe8c848)
      ctx.fillRect(cx + ox - 1, cy - 8, 4, 3)
      ctx.fillStyle = css(0x5aad40)
    }
    register(scene, 'crop', c)
  }

  // Fence post section
  {
    const c = makeCanvas(40, 36)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x8a6838)
    ctx.fillRect(8, 8, 4, 24)
    ctx.fillRect(28, 8, 4, 24)
    ctx.fillRect(8, 12, 24, 3)
    ctx.fillRect(8, 22, 24, 3)
    ctx.fillStyle = css(0xa88850)
    ctx.fillRect(8, 12, 24, 1)
    register(scene, 'fence', c)
  }

  // Water well
  {
    const c = makeCanvas(48, 56)
    const ctx = c.getContext('2d')!
    // base ring
    ctx.fillStyle = css(0x8a8680)
    ctx.beginPath()
    ctx.ellipse(24, 40, 16, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0x6a6860)
    ctx.beginPath()
    ctx.ellipse(24, 40, 10, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    // water
    ctx.fillStyle = css(0x3a8ec0)
    ctx.beginPath()
    ctx.ellipse(24, 40, 7, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    // posts + roof
    ctx.fillStyle = css(0x6a4828)
    ctx.fillRect(10, 14, 4, 26)
    ctx.fillRect(34, 14, 4, 26)
    ctx.beginPath()
    ctx.moveTo(24, 4)
    ctx.lineTo(42, 18)
    ctx.lineTo(6, 18)
    ctx.closePath()
    ctx.fillStyle = css(PALETTE.roof)
    ctx.fill()
    // bucket
    ctx.fillStyle = css(0x8a5a30)
    ctx.fillRect(20, 24, 8, 8)
    ctx.strokeStyle = css(0x333)
    ctx.strokeRect(20, 24, 8, 8)
    register(scene, 'well', c)
  }

  // Market stall
  {
    const c = makeCanvas(56, 52)
    const ctx = c.getContext('2d')!
    // canopy
    ctx.fillStyle = css(0xd04040)
    ctx.fillRect(4, 6, 48, 14)
    ctx.fillStyle = css(0xf0f0f0)
    for (let i = 0; i < 4; i++) ctx.fillRect(8 + i * 12, 6, 6, 14)
    // counter
    ctx.fillStyle = css(0xb88848)
    ctx.fillRect(8, 24, 40, 12)
    ctx.fillStyle = css(0x8a6838)
    ctx.fillRect(10, 36, 4, 12)
    ctx.fillRect(42, 36, 4, 12)
    // goods
    ctx.fillStyle = css(0xe8c040)
    ctx.beginPath()
    ctx.arc(18, 28, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0x50a040)
    ctx.beginPath()
    ctx.arc(28, 27, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0xc04060)
    ctx.beginPath()
    ctx.arc(38, 28, 4, 0, Math.PI * 2)
    ctx.fill()
    register(scene, 'stall', c)
  }

  // Bed
  {
    const c = makeCanvas(52, 40)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x8a6838)
    ctx.fillRect(6, 18, 40, 16)
    ctx.fillStyle = css(0xd8e8f0)
    ctx.fillRect(8, 12, 36, 14)
    ctx.fillStyle = css(0xf0f0f8)
    ctx.fillRect(8, 12, 12, 14)
    ctx.fillStyle = css(0x5080c0)
    ctx.fillRect(22, 14, 20, 8)
    ctx.fillStyle = css(0x6a4828)
    ctx.fillRect(6, 30, 4, 8)
    ctx.fillRect(42, 30, 4, 8)
    register(scene, 'bed', c)
  }

  // Chest
  {
    const c = makeCanvas(36, 32)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0xb88830)
    ctx.fillRect(4, 10, 28, 18)
    ctx.fillStyle = css(0x8a6820)
    ctx.fillRect(4, 10, 28, 6)
    ctx.fillStyle = css(0xe8c860)
    ctx.fillRect(16, 16, 4, 4)
    ctx.strokeStyle = css(0x5a4010)
    ctx.strokeRect(4, 10, 28, 18)
    register(scene, 'chest', c)
  }

  // Barrel
  {
    const c = makeCanvas(28, 34)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x8a5a30)
    ctx.beginPath()
    ctx.ellipse(14, 26, 11, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(3, 10, 22, 16)
    ctx.beginPath()
    ctx.ellipse(14, 10, 11, 6, 0, 0, Math.PI * 2)
    ctx.fillStyle = css(0xa87840)
    ctx.fill()
    ctx.strokeStyle = css(0x5a3820)
    ctx.beginPath()
    ctx.moveTo(3, 16)
    ctx.lineTo(25, 16)
    ctx.moveTo(3, 22)
    ctx.lineTo(25, 22)
    ctx.stroke()
    register(scene, 'barrel', c)
  }

  // Lamp post
  {
    const c = makeCanvas(24, 48)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x4a4a50)
    ctx.fillRect(10, 16, 4, 28)
    ctx.fillStyle = css(0x3a3a40)
    ctx.fillRect(6, 12, 12, 8)
    ctx.fillStyle = css(0xffe080)
    ctx.fillRect(8, 14, 8, 5)
    ctx.fillStyle = css(0xfff0b0)
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(12, 16, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    register(scene, 'lamp', c)
  }

  // Flower
  {
    const c = makeCanvas(20, 24)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x3d8a48)
    ctx.fillRect(9, 12, 2, 10)
    const petals = [0xe84870, 0xe8c040, 0x6080e8, 0xe86040]
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2
      ctx.fillStyle = css(petals[i]!)
      ctx.beginPath()
      ctx.arc(10 + Math.cos(a) * 4, 10 + Math.sin(a) * 4, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.fillStyle = css(0xfff060)
    ctx.beginPath()
    ctx.arc(10, 10, 2.5, 0, Math.PI * 2)
    ctx.fill()
    register(scene, 'flower', c)
  }

  // Rock
  {
    const c = makeCanvas(32, 22)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x8a8884)
    ctx.beginPath()
    ctx.moveTo(4, 16)
    ctx.lineTo(8, 6)
    ctx.lineTo(20, 4)
    ctx.lineTo(28, 10)
    ctx.lineTo(26, 18)
    ctx.lineTo(6, 18)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0xa8a69e)
    ctx.beginPath()
    ctx.moveTo(10, 8)
    ctx.lineTo(18, 6)
    ctx.lineTo(22, 12)
    ctx.lineTo(12, 12)
    ctx.closePath()
    ctx.fill()
    register(scene, 'rock', c)
  }

  // Ghost marker (kept subtle)
  {
    const c = makeCanvas(TILE_W, TILE_H)
    const ctx = c.getContext('2d')!
    ctx.globalAlpha = 0.35
    fillDiamond(ctx, TILE_W / 2, TILE_H / 2, TILE_W - 6, TILE_H - 4, css(0xffffff))
    register(scene, 'ghost', c)
  }

  // --- Animals ---
  // Chicken
  {
    const c = makeCanvas(16, 14)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0xf0f0f0)
    ctx.fillRect(4, 5, 8, 6)
    ctx.fillStyle = css(0xfff8e8)
    ctx.fillRect(9, 3, 5, 5)
    ctx.fillStyle = css(0xe84830)
    ctx.fillRect(13, 4, 2, 2)
    ctx.fillRect(10, 2, 3, 1)
    ctx.fillStyle = css(0x222)
    ctx.fillRect(12, 4, 1, 1)
    ctx.fillStyle = css(0xe8a020)
    ctx.fillRect(5, 11, 2, 2)
    ctx.fillRect(9, 11, 2, 2)
    register(scene, 'animal-chicken', c)
  }

  // Rabbit
  {
    const c = makeCanvas(14, 16)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0xe8d8c8)
    ctx.fillRect(5, 1, 2, 5)
    ctx.fillRect(8, 1, 2, 5)
    ctx.fillStyle = css(0xf0e0d0)
    ctx.fillRect(3, 6, 8, 6)
    ctx.fillRect(8, 5, 5, 4)
    ctx.fillStyle = css(0x222)
    ctx.fillRect(11, 6, 1, 1)
    ctx.fillStyle = css(0xe8a0b0)
    ctx.fillRect(12, 7, 1, 1)
    ctx.fillStyle = css(0xd8c8b8)
    ctx.fillRect(4, 12, 2, 2)
    ctx.fillRect(8, 12, 2, 2)
    register(scene, 'animal-rabbit', c)
  }

  // Frog
  {
    const c = makeCanvas(14, 10)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x4cae48)
    ctx.fillRect(2, 3, 10, 5)
    ctx.fillStyle = css(0x6ad060)
    ctx.fillRect(3, 2, 8, 3)
    ctx.fillStyle = css(0xf0f0a0)
    ctx.fillRect(3, 2, 3, 3)
    ctx.fillRect(8, 2, 3, 3)
    ctx.fillStyle = css(0x222)
    ctx.fillRect(4, 3, 1, 1)
    ctx.fillRect(9, 3, 1, 1)
    ctx.fillStyle = css(0x3a8e38)
    ctx.fillRect(1, 6, 3, 2)
    ctx.fillRect(10, 6, 3, 2)
    register(scene, 'animal-frog', c)
  }

  generateCityTextures(scene)
  generatePlayerTextures(scene)
}

const HW = TILE_W / 2
const HH = TILE_H / 2

type Pt = { x: number; y: number }

function hash3(a: number, b: number, c: number): number {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

function poly(ctx: CanvasRenderingContext2D, pts: Pt[], color: number): void {
  ctx.beginPath()
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y)
  ctx.closePath()
  ctx.fillStyle = css(color)
  ctx.fill()
}

/**
 * Corner points of an isometric box whose ground-level front corner is (sx, sy).
 * `w` runs along +x (screen right-down), `d` along +y (screen left-down).
 */
function boxPoints(sx: number, sy: number, w: number, d: number, hpx: number) {
  const roofS: Pt = { x: sx, y: sy - hpx }
  return {
    roofS,
    roofN: { x: sx + (d - w) * HW, y: roofS.y - HH * (w + d) } as Pt,
    roofE: { x: sx + HW * d, y: roofS.y - HH * d } as Pt,
    roofW: { x: sx - HW * w, y: roofS.y - HH * w } as Pt,
    baseS: { x: sx, y: sy } as Pt,
    baseE: { x: sx + HW * d, y: sy - HH * d } as Pt,
    baseW: { x: sx - HW * w, y: sy - HH * w } as Pt,
  }
}

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  w: number,
  d: number,
  hpx: number,
  top: number,
  left: number,
  right: number,
) {
  const p = boxPoints(sx, sy, w, d, hpx)
  poly(ctx, [p.roofE, p.roofS, p.baseS, p.baseE], right)
  poly(ctx, [p.roofW, p.roofS, p.baseS, p.baseW], left)
  poly(ctx, [p.roofN, p.roofE, p.roofS, p.roofW], top)
  return p
}

/** Window grid on one facade, walking from `anchor` along `dir` (per tile). */
function drawFacade(
  ctx: CanvasRenderingContext2D,
  anchor: Pt,
  dir: Pt,
  spanTiles: number,
  hpx: number,
  spec: TowerSpec,
  seed: number,
): void {
  const cols = spec.cols ?? 2
  const rowH = spec.rowH ?? 22
  const winW = 0.22
  const gap = (1 - cols * winW) / (cols + 1)
  const winH = Math.max(6, Math.min(13, rowH - 8))
  const bottomPad = 18

  for (let tile = 0; tile < spanTiles; tile++) {
    for (let ci = 0; ci < cols; ci++) {
      const a = tile + gap * (ci + 1) + winW * ci
      const bx = anchor.x + dir.x * a
      const by = anchor.y + dir.y * a
      const dx = dir.x * winW
      const dy = dir.y * winW
      for (let y = 10; y + winH <= hpx - bottomPad; y += rowH) {
        const lit = hash3(seed + tile, ci, y) % 100 < 24
        poly(
          ctx,
          [
            { x: bx, y: by + y },
            { x: bx + dx, y: by + dy + y },
            { x: bx + dx, y: by + dy + y + winH },
            { x: bx, y: by + y + winH },
          ],
          lit ? spec.glassLit : spec.glass,
        )
      }
    }
  }
}

function drawWaterTower(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.fillStyle = css(0x4a3a2a)
  ctx.fillRect(cx - 7, cy - 6, 2, 8)
  ctx.fillRect(cx + 5, cy - 6, 2, 8)
  ctx.fillStyle = css(0x7a5636)
  ctx.fillRect(cx - 8, cy - 20, 16, 14)
  ctx.fillStyle = css(0x8f6740)
  ctx.fillRect(cx - 8, cy - 20, 8, 14)
  ctx.beginPath()
  ctx.moveTo(cx, cy - 28)
  ctx.lineTo(cx + 9, cy - 20)
  ctx.lineTo(cx - 9, cy - 20)
  ctx.closePath()
  ctx.fillStyle = css(0x5b4028)
  ctx.fill()
}

function towerTexture(scene: Phaser.Scene, spec: TowerSpec): void {
  const stories = spec.stories ?? []
  let padTop = 14
  for (const s of stories) padTop += s.hpx + 2 * HH * s.inset
  if (spec.antenna) padTop += spec.antenna
  if (spec.waterTower) padTop += 30

  const cw = HW * (spec.w + spec.d)
  const ch = Math.ceil(padTop + HH * (spec.w + spec.d) + spec.hpx)
  const c = makeCanvas(cw, ch)
  const ctx = c.getContext('2d')!

  const sx = HW * spec.w
  let sy = ch
  let w = spec.w
  let d = spec.d
  let hpx = spec.hpx

  for (let level = 0; level <= stories.length; level++) {
    const p = drawIsoBox(ctx, sx, sy, w, d, hpx, spec.roof, spec.wall, spec.wallShade)
    drawFacade(ctx, p.roofE, { x: -HW, y: HH }, d, hpx, spec, level * 31 + 7)
    drawFacade(ctx, p.roofW, { x: HW, y: HH }, w, hpx, spec, level * 47 + 3)

    // Parapet cap so the roof reads as a hard edge
    ctx.strokeStyle = css(spec.roof)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(p.roofW.x, p.roofW.y)
    ctx.lineTo(p.roofS.x, p.roofS.y)
    ctx.lineTo(p.roofE.x, p.roofE.y)
    ctx.stroke()

    if (spec.band !== undefined) {
      poly(
        ctx,
        [
          { x: p.roofW.x, y: p.roofW.y + 6 },
          { x: p.roofS.x, y: p.roofS.y + 6 },
          { x: p.roofE.x, y: p.roofE.y + 6 },
          { x: p.roofE.x, y: p.roofE.y + 10 },
          { x: p.roofS.x, y: p.roofS.y + 10 },
          { x: p.roofW.x, y: p.roofW.y + 10 },
        ],
        spec.band,
      )
    }

    if (level === 0) {
      // Street-level entrance on the sunny facade
      const doorA = Math.max(0.3, w / 2 - 0.15)
      const bx = p.roofW.x + HW * doorA
      const by = p.roofW.y + HH * doorA
      poly(
        ctx,
        [
          { x: bx, y: by + hpx - 16 },
          { x: bx + HW * 0.32, y: by + HH * 0.32 + hpx - 16 },
          { x: bx + HW * 0.32, y: by + HH * 0.32 + hpx },
          { x: bx, y: by + hpx },
        ],
        0x1e2228,
      )
    }

    if (level < stories.length) {
      const st = stories[level]!
      sy = sy - hpx - 2 * HH * st.inset
      w = Math.max(0.6, w - 2 * st.inset)
      d = Math.max(0.6, d - 2 * st.inset)
      hpx = st.hpx
    } else {
      const topCx = p.roofS.x + HW * (d - w) * 0.5
      const topCy = p.roofS.y - HH * (w + d) * 0.5
      if (spec.waterTower) drawWaterTower(ctx, topCx, topCy)
      if (spec.antenna) {
        ctx.fillStyle = css(0xb9bec4)
        ctx.fillRect(topCx - 1.5, topCy - spec.antenna, 3, spec.antenna)
        ctx.fillStyle = css(0xff5a4a)
        ctx.fillRect(topCx - 2, topCy - spec.antenna - 3, 4, 3)
      }
    }
  }

  register(scene, `tower-${spec.id}`, c)
}

function carTexture(scene: Phaser.Scene, key: string, body: number, shade: number): void {
  const w = 1.15
  const d = 0.55
  const hpx = 11
  const cw = 2 * Math.ceil(HW * Math.max(w, d)) + 8
  const ch = Math.ceil(HH * (w + d) + hpx + 14)
  const c = makeCanvas(cw, ch)
  const ctx = c.getContext('2d')!
  const sx = cw / 2
  const sy = ch - 2

  // wheels first so they peek under the body
  ctx.fillStyle = css(0x1b1e22)
  ctx.beginPath()
  ctx.ellipse(sx - HW * 0.75, sy - HH * 0.75, 3.2, 2.2, 0, 0, Math.PI * 2)
  ctx.ellipse(sx + HW * 0.4, sy - HH * 0.1, 3.2, 2.2, 0, 0, Math.PI * 2)
  ctx.fill()

  const p = drawIsoBox(ctx, sx, sy - 2, w, d, hpx, body, body, shade)
  // cabin
  drawIsoBox(
    ctx,
    sx - HW * 0.12,
    p.roofS.y - 1,
    w * 0.55,
    d * 0.8,
    8,
    body,
    0x9fd8ea,
    0x74b4cc,
  )
  ctx.fillStyle = css(0xfff2c0)
  ctx.fillRect(sx + HW * 0.52, sy - HH * 0.6 - 8, 3, 2)
  register(scene, key, c)
}

/** Streets, lane paint and the skyline stock. */
export function generateCityTextures(scene: Phaser.Scene): void {
  // Lane dashes (overlaid on asphalt)
  const laneDash = (key: string, dir: Pt) => {
    const c = makeCanvas(TILE_W, TILE_H)
    const ctx = c.getContext('2d')!
    const cx = TILE_W / 2
    const cy = TILE_H / 2
    ctx.strokeStyle = css(0xe8d24a)
    ctx.lineWidth = 3
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(cx - dir.x * 0.3, cy - dir.y * 0.3)
    ctx.lineTo(cx + dir.x * 0.3, cy + dir.y * 0.3)
    ctx.stroke()
    register(scene, key, c)
  }
  laneDash('laneX', { x: TILE_W, y: TILE_H })
  laneDash('laneY', { x: -TILE_W, y: TILE_H })

  // Crosswalk
  {
    const pad = 8
    const c = makeCanvas(TILE_W + pad, TILE_H + pad)
    const ctx = c.getContext('2d')!
    const cx = (TILE_W + pad) / 2
    const cy = (TILE_H + pad) / 2
    fillDiamond(ctx, cx, cy, TILE_W + 6, TILE_H + 6, css(0x3a3f45))
    fillDiamond(ctx, cx, cy - 1, TILE_W - 2, TILE_H, css(0x43484f))
    ctx.strokeStyle = css(0xe8e6dc)
    ctx.lineWidth = 4
    ctx.globalAlpha = 0.85
    for (const o of [-0.3, -0.1, 0.1, 0.3]) {
      ctx.beginPath()
      ctx.moveTo(cx - HW * 0.42 - HW * o, cy - HH * 0.42 + HH * o)
      ctx.lineTo(cx + HW * 0.42 - HW * o, cy + HH * 0.42 + HH * o)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    register(scene, 'crosswalk', c)
  }

  for (const spec of TOWERS) towerTexture(scene, spec)

  carTexture(scene, 'car-taxi', 0xf0c02c, 0xc99a18)
  carTexture(scene, 'car-red', 0xc0463c, 0x94322a)
  carTexture(scene, 'car-blue', 0x3e6fa8, 0x2c5182)
  generateThemeParkTextures(scene)
}

function rideCanvas(key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  const c = makeCanvas(w, h)
  const ctx = c.getContext('2d')!
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  draw(ctx)
  register(activeTextureScene!, key, c)
}

let activeTextureScene: Phaser.Scene | null = null

function coasterTrack(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  rail = 0xe4493f,
  tie = 0xffcf4a,
): void {
  ctx.strokeStyle = css(0x4a3328)
  ctx.lineWidth = 12
  ctx.stroke(path)
  ctx.strokeStyle = css(rail)
  ctx.lineWidth = 7
  ctx.stroke(path)
  ctx.strokeStyle = css(tie)
  ctx.lineWidth = 2
  ctx.setLineDash([3, 9])
  ctx.stroke(path)
  ctx.setLineDash([])
}

/** Large, readable ride sprites used by the two destination parks. */
function generateThemeParkTextures(scene: Phaser.Scene): void {
  activeTextureScene = scene

  rideCanvas('ride-coaster-loop', 270, 230, (ctx) => {
    // Steel supports
    ctx.strokeStyle = css(0x74808a)
    ctx.lineWidth = 5
    for (const x of [38, 78, 132, 188, 230]) {
      ctx.beginPath()
      ctx.moveTo(x, 216)
      ctx.lineTo(135, 42 + Math.abs(135 - x) * 0.25)
      ctx.stroke()
    }
    const p = new Path2D()
    p.moveTo(12, 202)
    p.bezierCurveTo(52, 202, 52, 174, 76, 168)
    p.bezierCurveTo(70, 30, 202, 22, 196, 160)
    p.bezierCurveTo(218, 174, 232, 190, 258, 195)
    coasterTrack(ctx, p)
    // Train
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = css(i === 1 ? 0x2f6fbd : 0xffd14a)
      ctx.fillRect(28 + i * 14, 188 - i * 3, 12, 8)
      ctx.fillStyle = css(0x20252a)
      ctx.fillRect(31 + i * 14, 196 - i * 3, 3, 3)
      ctx.fillRect(37 + i * 14, 196 - i * 3, 3, 3)
    }
  })

  rideCanvas('ride-coaster-hill', 330, 220, (ctx) => {
    ctx.strokeStyle = css(0x78848c)
    ctx.lineWidth = 4
    for (const x of [30, 62, 98, 136, 176, 216, 258, 300]) {
      ctx.beginPath()
      ctx.moveTo(x, 210)
      ctx.lineTo(x, 70 + Math.abs(165 - x) * 0.65)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(x - 11, 210)
      ctx.lineTo(x + 11, 210)
      ctx.stroke()
    }
    const p = new Path2D()
    p.moveTo(8, 194)
    p.bezierCurveTo(70, 180, 102, 30, 160, 30)
    p.bezierCurveTo(207, 32, 222, 165, 260, 172)
    p.bezierCurveTo(283, 177, 300, 126, 324, 120)
    coasterTrack(ctx, p, 0x7d4fd6, 0xffd04a)
  })

  rideCanvas('ride-ferris', 210, 230, (ctx) => {
    ctx.strokeStyle = css(0x59656f)
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.moveTo(105, 96)
    ctx.lineTo(66, 218)
    ctx.moveTo(105, 96)
    ctx.lineTo(144, 218)
    ctx.stroke()
    ctx.strokeStyle = css(0x45a8c9)
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(105, 92, 72, 0, Math.PI * 2)
    ctx.stroke()
    ctx.lineWidth = 3
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const x = 105 + Math.cos(a) * 72
      const y = 92 + Math.sin(a) * 72
      ctx.beginPath()
      ctx.moveTo(105, 92)
      ctx.lineTo(x, y)
      ctx.stroke()
      ctx.fillStyle = css([0xf25f5c, 0xffcf4a, 0x55b86a, 0x7655d8][i % 4]!)
      ctx.fillRect(x - 7, y - 2, 14, 10)
      ctx.strokeStyle = css(0x303840)
      ctx.strokeRect(x - 7, y - 2, 14, 10)
      ctx.strokeStyle = css(0x45a8c9)
    }
    ctx.fillStyle = css(0xffcf4a)
    ctx.beginPath()
    ctx.arc(105, 92, 11, 0, Math.PI * 2)
    ctx.fill()
  })

  rideCanvas('ride-drop', 110, 265, (ctx) => {
    ctx.fillStyle = css(0x66727d)
    ctx.fillRect(50, 20, 10, 224)
    ctx.fillStyle = css(0x8b98a3)
    ctx.fillRect(54, 20, 3, 224)
    ctx.fillStyle = css(0xe64e48)
    ctx.fillRect(23, 72, 64, 16)
    ctx.fillStyle = css(0x252b30)
    for (let x = 28; x < 84; x += 9) ctx.fillRect(x, 77, 5, 6)
    ctx.beginPath()
    ctx.moveTo(55, 4)
    ctx.lineTo(68, 22)
    ctx.lineTo(42, 22)
    ctx.closePath()
    ctx.fillStyle = css(0xffcf4a)
    ctx.fill()
    ctx.fillStyle = css(0x4a5158)
    ctx.fillRect(33, 242, 44, 9)
  })

  rideCanvas('ride-coaster-station', 220, 120, (ctx) => {
    const p = drawIsoBox(ctx, 110, 116, 2.7, 2.7, 48, 0xf2c64b, 0xd95645, 0xb93d36)
    ctx.fillStyle = css(0x26313a)
    ctx.fillRect(p.roofW.x + 46, p.roofW.y + 48, 28, 28)
    ctx.strokeStyle = css(0xf4e9cb)
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(p.roofW.x, p.roofW.y)
    ctx.lineTo(p.roofS.x, p.roofS.y)
    ctx.lineTo(p.roofE.x, p.roofE.y)
    ctx.stroke()
  })

  rideCanvas('ride-water-tower', 280, 270, (ctx) => {
    // Tower and stairs
    ctx.strokeStyle = css(0x61717a)
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.moveTo(140, 34)
    ctx.lineTo(110, 252)
    ctx.moveTo(140, 34)
    ctx.lineTo(170, 252)
    ctx.stroke()
    for (let y = 62; y < 228; y += 24) {
      ctx.beginPath()
      ctx.moveTo(116, y)
      ctx.lineTo(164, y)
      ctx.stroke()
    }
    ctx.fillStyle = css(0xf5d24a)
    ctx.fillRect(105, 22, 70, 22)
    // Three winding chutes
    const colors = [0x26a9e0, 0xf05c55, 0xffc83d]
    for (let i = 0; i < 3; i++) {
      const p = new Path2D()
      p.moveTo(118 + i * 22, 42)
      p.bezierCurveTo(42 + i * 14, 72, 232 - i * 10, 104, 76 + i * 18, 142)
      p.bezierCurveTo(22 + i * 18, 170, 234 - i * 22, 196, 72 + i * 58, 238)
      ctx.strokeStyle = css(0x1f566d)
      ctx.lineWidth = 18
      ctx.stroke(p)
      ctx.strokeStyle = css(colors[i]!)
      ctx.lineWidth = 12
      ctx.stroke(p)
      ctx.strokeStyle = css(0xbfefff)
      ctx.lineWidth = 2
      ctx.stroke(p)
    }
  })

  rideCanvas('ride-water-racer', 290, 190, (ctx) => {
    ctx.strokeStyle = css(0x657580)
    ctx.lineWidth = 5
    for (const x of [45, 95, 145, 195, 245]) {
      ctx.beginPath()
      ctx.moveTo(x, 184)
      ctx.lineTo(x, 35 + Math.abs(145 - x) * 0.35)
      ctx.stroke()
    }
    const colors = [0x2bbbe8, 0xf0525a, 0xf5cf3c, 0x55b96a]
    for (let i = 0; i < 4; i++) {
      const p = new Path2D()
      p.moveTo(36 + i * 9, 44 + i * 2)
      p.bezierCurveTo(92, 60 + i * 12, 188, 145 - i * 5, 262 - i * 9, 176)
      ctx.strokeStyle = css(0x24556a)
      ctx.lineWidth = 12
      ctx.stroke(p)
      ctx.strokeStyle = css(colors[i]!)
      ctx.lineWidth = 8
      ctx.stroke(p)
    }
    ctx.fillStyle = css(0xf5d24a)
    ctx.fillRect(22, 28, 58, 22)
  })

  rideCanvas('ride-splash', 180, 180, (ctx) => {
    ctx.fillStyle = css(0x725033)
    ctx.fillRect(84, 42, 9, 124)
    ctx.fillStyle = css(0xf05c55)
    ctx.fillRect(36, 68, 105, 9)
    ctx.fillStyle = css(0x2ea9d2)
    ctx.beginPath()
    ctx.arc(52, 62, 18, Math.PI, 0)
    ctx.lineTo(70, 62)
    ctx.lineTo(34, 62)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = css(0x65d4f0)
    ctx.lineWidth = 5
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.moveTo(49 + i * 3, 76)
      ctx.bezierCurveTo(42 + i * 8, 100, 22 + i * 25, 118, 25 + i * 30, 150)
      ctx.stroke()
    }
    ctx.fillStyle = css(0xf5d24a)
    ctx.fillRect(58, 126, 65, 10)
    ctx.fillStyle = css(0x53b96a)
    ctx.fillRect(106, 72, 9, 84)
  })

  rideCanvas('ride-park-gate', 220, 125, (ctx) => {
    drawIsoBox(ctx, 63, 120, 1, 1, 48, 0xf5d04a, 0xd64a42, 0xb53a34)
    drawIsoBox(ctx, 157, 120, 1, 1, 48, 0xf5d04a, 0xd64a42, 0xb53a34)
    ctx.strokeStyle = css(0xf5d04a)
    ctx.lineWidth = 12
    ctx.beginPath()
    ctx.arc(110, 83, 48, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = css(0x24313b)
    ctx.font = 'bold 13px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('THRILL CITY', 110, 82)
  })

  rideCanvas('ride-water-gate', 220, 125, (ctx) => {
    drawIsoBox(ctx, 63, 120, 1, 1, 43, 0x8be2ee, 0x2ca9cc, 0x2389ad)
    drawIsoBox(ctx, 157, 120, 1, 1, 43, 0x8be2ee, 0x2ca9cc, 0x2389ad)
    ctx.strokeStyle = css(0xf5d04a)
    ctx.lineWidth = 11
    ctx.beginPath()
    ctx.arc(110, 82, 48, Math.PI, 0)
    ctx.stroke()
    ctx.fillStyle = css(0x164b63)
    ctx.font = 'bold 13px Courier New'
    ctx.textAlign = 'center'
    ctx.fillText('SPLASH BAY', 110, 82)
  })

  activeTextureScene = null
}

/** Build outfit variants by recoloring the base Emulite person sprite body. */
export function generatePlayerTextures(scene: Phaser.Scene): Record<OutfitId, string> {
  const previews: Partial<Record<OutfitId, string>> = {}
  const source = scene.textures.get('emulite-person').getSourceImage() as
    | HTMLImageElement
    | HTMLCanvasElement

  const base = makeCanvas(source.width, source.height)
  const baseCtx = base.getContext('2d')!
  baseCtx.imageSmoothingEnabled = false
  baseCtx.drawImage(source, 0, 0)
  const src = baseCtx.getImageData(0, 0, base.width, base.height)

  for (const outfit of OUTFITS) {
    const c = makeCanvas(base.width, base.height + HAT_PAD)
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    const img = ctx.createImageData(base.width, base.height)
    const body = hexToRgb(outfit.body)

    for (let i = 0; i < src.data.length; i += 4) {
      const r = src.data[i]!
      const g = src.data[i + 1]!
      const b = src.data[i + 2]!
      const a = src.data[i + 3]!
      img.data[i + 3] = a
      if (a < 10) continue

      if (isOutfitBodyPixel(r, g, b)) {
        // Preserve a touch of shading from the source
        const shade = (r + g + b) / (BASE_BODY_RGB.r + BASE_BODY_RGB.g + BASE_BODY_RGB.b)
        img.data[i] = clampByte(body.r * shade)
        img.data[i + 1] = clampByte(body.g * shade)
        img.data[i + 2] = clampByte(body.b * shade)
      } else {
        img.data[i] = r
        img.data[i + 1] = g
        img.data[i + 2] = b
      }
    }

    ctx.putImageData(img, 0, HAT_PAD)
    drawHat(ctx, outfit, HAT_PAD)
    register(scene, `player-${outfit.id}`, c)
    // Characters are true pixel art blown up 4x, so keep them crisp even though
    // the rest of the world renders with smooth filtering.
    scene.textures.get(`player-${outfit.id}`).setFilter(Phaser.Textures.FilterMode.NEAREST)
    previews[outfit.id] = c.toDataURL('image/png')
  }

  return previews as Record<OutfitId, string>
}

function drawHat(ctx: CanvasRenderingContext2D, outfit: Outfit, pad: number): void {
  if (outfit.hat === 'none') return
  const main = outfit.hatColor ?? outfit.accent
  const accent = outfit.hatAccent ?? outfit.detail
  const y0 = pad

  const px = (x: number, y: number, color: number) => {
    ctx.fillStyle = css(color)
    ctx.fillRect(x, y, 1, 1)
  }
  const rect = (x: number, y: number, w: number, h: number, color: number) => {
    ctx.fillStyle = css(color)
    ctx.fillRect(x, y, w, h)
  }

  switch (outfit.hat as HatId) {
    case 'cap': {
      // Bill + crown sitting on the flat head
      rect(2, y0 + 1, 7, 2, main)
      rect(1, y0 + 2, 9, 1, main)
      rect(8, y0 + 3, 3, 1, accent)
      px(3, y0 + 1, accent)
      break
    }
    case 'beanie': {
      rect(2, y0 + 0, 7, 1, accent)
      rect(1, y0 + 1, 9, 2, main)
      rect(2, y0 + 3, 7, 1, main)
      px(5, y0 + 0, 0xffffff)
      break
    }
    case 'top': {
      rect(3, y0 - 1, 5, 3, main)
      rect(1, y0 + 2, 9, 1, main)
      rect(2, y0 + 3, 7, 1, accent)
      rect(4, y0 + 0, 3, 1, accent)
      break
    }
    case 'crown': {
      px(2, y0 + 2, main)
      px(4, y0 + 1, main)
      px(5, y0 + 0, main)
      px(6, y0 + 1, main)
      px(8, y0 + 2, main)
      rect(2, y0 + 3, 7, 1, main)
      px(3, y0 + 3, accent)
      px(5, y0 + 3, accent)
      px(7, y0 + 3, accent)
      break
    }
    case 'wizard': {
      px(5, y0 - 2, main)
      rect(4, y0 - 1, 3, 1, main)
      rect(3, y0 + 0, 5, 1, main)
      rect(2, y0 + 1, 7, 1, main)
      rect(1, y0 + 2, 9, 1, main)
      rect(2, y0 + 3, 7, 1, accent)
      px(5, y0 + 0, accent)
      break
    }
    case 'flower': {
      px(4, y0 + 1, accent)
      px(6, y0 + 1, accent)
      px(5, y0 + 0, main)
      px(5, y0 + 2, main)
      px(3, y0 + 2, main)
      px(7, y0 + 2, main)
      px(5, y0 + 1, 0xfff060)
      break
    }
    case 'bandana': {
      rect(1, y0 + 2, 9, 2, main)
      px(2, y0 + 2, accent)
      px(5, y0 + 2, accent)
      px(8, y0 + 2, accent)
      // tails
      px(0, y0 + 3, main)
      px(0, y0 + 4, main)
      px(1, y0 + 4, accent)
      break
    }
    default:
      break
  }
}

function isOutfitBodyPixel(r: number, g: number, b: number): boolean {
  // Source denim body ~ (84,141,161); ignore skin yellow, black outline, gray shadow
  const dr = r - BASE_BODY_RGB.r
  const dg = g - BASE_BODY_RGB.g
  const db = b - BASE_BODY_RGB.b
  const dist = Math.sqrt(dr * dr + dg * dg + db * db)
  if (dist < 55) return true
  // Broader blue-teal body catch after downsample quantization
  return b > r + 20 && g > r + 10 && b > 100 && r < 130
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

export function textureKeyForItem(id: ItemId): string {
  return id
}
