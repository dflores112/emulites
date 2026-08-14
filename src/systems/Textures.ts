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

export const PLAYER_DISPLAY_SCALE = 4

function hexToRgb(hex: number): { r: number; g: number; b: number } {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
  }
}

function fillDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  color: string,
) {
  ctx.beginPath()
  ctx.moveTo(cx, cy - h / 2)
  ctx.lineTo(cx + w / 2, cy)
  ctx.lineTo(cx, cy + h / 2)
  ctx.lineTo(cx - w / 2, cy)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
}

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function css(hex: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${r},${g},${b})`
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

  softTile('grass', 0x5faa52, 0x68b55c, 0x569a48)
  softTile('grass2', 0x5ca64f, 0x66b259, 0x5aad50)
  softTile('path', 0xb89a62, 0xc8ae72, 0x9a7e4a)
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

  // Tree
  {
    const c = makeCanvas(56, 72)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = css(0x6b4a2a)
    ctx.fillRect(24, 46, 8, 18)
    ctx.fillStyle = css(0x55381e)
    ctx.fillRect(28, 46, 4, 18)
    const drawCanopy = (cx: number, cy: number, r: number, color: number) => {
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = css(color)
      ctx.fill()
    }
    drawCanopy(28, 34, 18, 0x2f6b38)
    drawCanopy(20, 30, 12, 0x3d8a48)
    drawCanopy(36, 28, 13, 0x3d8a48)
    drawCanopy(28, 22, 11, 0x4ea85a)
    register(scene, 'tree', c)
  }

  // Bush
  {
    const c = makeCanvas(40, 28)
    const ctx = c.getContext('2d')!
    ctx.beginPath()
    ctx.arc(14, 16, 10, 0, Math.PI * 2)
    ctx.arc(26, 15, 11, 0, Math.PI * 2)
    ctx.arc(20, 12, 9, 0, Math.PI * 2)
    ctx.fillStyle = css(0x3d8a48)
    ctx.fill()
    ctx.fillStyle = css(0x57b064)
    ctx.beginPath()
    ctx.arc(18, 11, 5, 0, Math.PI * 2)
    ctx.fill()
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
    // left face
    ctx.beginPath()
    ctx.moveTo(2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 8)
    ctx.lineTo(2, topY + wallH - 8)
    ctx.closePath()
    ctx.fillStyle = css(0xe8d4b0)
    ctx.fill()
    // right face
    ctx.beginPath()
    ctx.moveTo(TILE_W - 2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 8)
    ctx.lineTo(TILE_W - 2, topY + wallH - 8)
    ctx.closePath()
    ctx.fillStyle = css(0xd4be96)
    ctx.fill()
    // roof top diamond
    fillDiamond(ctx, TILE_W / 2, topY, TILE_W - 4, TILE_H - 2, css(0xb05040))
    fillDiamond(ctx, TILE_W / 2, topY - 1, TILE_W - 14, TILE_H - 8, css(0xc86048))
    // window on left face
    ctx.fillStyle = css(0x6ec8e8)
    ctx.fillRect(12, topY + 18, 10, 10)
    ctx.strokeStyle = css(0x6a4a28)
    ctx.lineWidth = 1
    ctx.strokeRect(12, topY + 18, 10, 10)
    ctx.beginPath()
    ctx.moveTo(17, topY + 18)
    ctx.lineTo(17, topY + 28)
    ctx.moveTo(12, topY + 23)
    ctx.lineTo(22, topY + 23)
    ctx.stroke()
    register(scene, 'wall', c)
  }

  // Door — framed wood with arch trim
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
    ctx.fillStyle = css(0xe8d4b0)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(TILE_W - 2, topY)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2)
    ctx.lineTo(TILE_W / 2, topY + TILE_H / 2 + wallH - 8)
    ctx.lineTo(TILE_W - 2, topY + wallH - 8)
    ctx.closePath()
    ctx.fillStyle = css(0xd4be96)
    ctx.fill()
    fillDiamond(ctx, TILE_W / 2, topY, TILE_W - 4, TILE_H - 2, css(0xb05040))
    fillDiamond(ctx, TILE_W / 2, topY - 1, TILE_W - 14, TILE_H - 8, css(0xc86048))
    // door panel
    const dx = TILE_W / 2 - 9
    const dy = topY + 14
    ctx.fillStyle = css(0x5a3820)
    ctx.fillRect(dx - 1, dy - 1, 20, wallH - 18)
    ctx.fillStyle = css(0x8a5a30)
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
    ctx.fillStyle = css(0xb05040)
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

  generatePlayerTextures(scene)
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
