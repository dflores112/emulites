import type Phaser from 'phaser'
import { CATALOG, type ItemId } from '../data/catalog'

export type HotbarIcons = Partial<Record<ItemId | 'drag', string>>

/** Pull generated Phaser textures into data-URLs for the HTML hotbar. */
export function hotbarIconsFromScene(scene: Phaser.Scene): HotbarIcons {
  const icons: HotbarIcons = {}
  for (const item of CATALOG) {
    icons[item.id] = textureToDataUrl(scene, item.id) ?? ''
  }
  icons.drag = dragIconDataUrl()
  return icons
}

function textureToDataUrl(scene: Phaser.Scene, key: string): string | null {
  if (!scene.textures.exists(key)) return null
  const tex = scene.textures.get(key)
  const src = tex.getSourceImage() as HTMLCanvasElement | HTMLImageElement
  const w = 'width' in src ? src.width : 64
  const h = 'height' in src ? src.height : 48
  const c = document.createElement('canvas')
  // Fit into a square preview
  const size = 48
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, size, size)
  const scale = Math.min(size / w, size / h) * 0.92
  const dw = w * scale
  const dh = h * scale
  ctx.drawImage(src, (size - dw) / 2, (size - dh) / 2, dw, dh)
  return c.toDataURL('image/png')
}

function dragIconDataUrl(): string {
  const c = document.createElement('canvas')
  c.width = 48
  c.height = 48
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  // soft pad
  ctx.fillStyle = '#e8f6f0'
  ctx.fillRect(4, 4, 40, 40)
  ctx.strokeStyle = '#2a241c'
  ctx.lineWidth = 2
  ctx.strokeRect(4, 4, 40, 40)
  // hand / grab glyph
  ctx.fillStyle = '#2f6f5e'
  ctx.fillRect(18, 14, 12, 16)
  ctx.fillRect(14, 18, 4, 10)
  ctx.fillRect(30, 18, 4, 10)
  ctx.fillRect(16, 28, 16, 6)
  // arrows
  ctx.fillStyle = '#1c1814'
  ctx.fillRect(22, 8, 4, 4)
  ctx.fillRect(22, 36, 4, 4)
  ctx.fillRect(8, 22, 4, 4)
  ctx.fillRect(36, 22, 4, 4)
  return c.toDataURL('image/png')
}
