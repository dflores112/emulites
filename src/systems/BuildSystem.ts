import type Phaser from 'phaser'
import { CATALOG, getCatalogItem, isCatalogId, type ItemId } from '../data/catalog'
import type { PlacedTile } from './SaveSystem'
import {
  depthFor,
  gridToScreen,
  inBounds,
  screenToGrid,
  snapGrid,
  TILE_H,
} from './IsoGrid'
import { textureKeyForItem } from './Textures'

type TileSprite = Phaser.GameObjects.Image & {
  gridX?: number
  gridY?: number
  itemId?: ItemId
}

export class BuildSystem {
  private scene: Phaser.Scene
  private floors = new Map<string, TileSprite>()
  private objects = new Map<string, TileSprite>()
  private selected: ItemId = 'floor'
  private ghost: Phaser.GameObjects.Image
  private enabled = true

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.ghost = scene.add
      .image(0, 0, 'ghost')
      .setDepth(10000)
      .setAlpha(0.5)
      .setVisible(false)
  }

  getSelected(): ItemId {
    return this.selected
  }

  setSelected(id: ItemId): void {
    this.selected = id
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) this.ghost.setVisible(false)
  }

  key(x: number, y: number): string {
    return `${x},${y}`
  }

  loadTiles(tiles: PlacedTile[]): void {
    for (const t of tiles) {
      if (!isCatalogId(t.itemId)) continue
      this.place(t.x, t.y, t.itemId, false)
    }
  }

  clearAll(): void {
    for (const spr of this.floors.values()) spr.destroy()
    for (const spr of this.objects.values()) spr.destroy()
    this.floors.clear()
    this.objects.clear()
  }

  exportTiles(): PlacedTile[] {
    const out: PlacedTile[] = []
    for (const spr of this.floors.values()) {
      if (spr.gridX !== undefined && spr.gridY !== undefined && spr.itemId) {
        out.push({ x: spr.gridX, y: spr.gridY, itemId: spr.itemId })
      }
    }
    for (const spr of this.objects.values()) {
      if (spr.gridX !== undefined && spr.gridY !== undefined && spr.itemId) {
        out.push({ x: spr.gridX, y: spr.gridY, itemId: spr.itemId })
      }
    }
    return out
  }

  isBlocked(gx: number, gy: number): boolean {
    const obj = this.objects.get(this.key(gx, gy))
    if (!obj?.itemId) return false
    return getCatalogItem(obj.itemId).blocks
  }

  updateGhost(worldX: number, worldY: number): void {
    if (!this.enabled) {
      this.ghost.setVisible(false)
      return
    }
    const raw = screenToGrid(worldX, worldY)
    const g = snapGrid(raw.x, raw.y)
    if (!inBounds(g.x, g.y)) {
      this.ghost.setVisible(false)
      return
    }
    const item = getCatalogItem(this.selected)
    const screen = gridToScreen(g.x, g.y)
    const tex = textureKeyForItem(this.selected)
    this.ghost.setTexture(tex)
    if (item.layer === 'object') {
      this.ghost.setOrigin(0.5, 1)
      this.ghost.setPosition(screen.x, screen.y + TILE_H / 2)
    } else {
      this.ghost.setOrigin(0.5, 0.5)
      this.ghost.setPosition(screen.x, screen.y)
    }
    this.ghost.setDepth(depthFor(g.x, g.y, 9))
    this.ghost.setVisible(true)
    this.ghost.clearTint()
    this.ghost.setAlpha(0.55)
  }

  tryPlaceAt(worldX: number, worldY: number): boolean {
    if (!this.enabled) return false
    const raw = screenToGrid(worldX, worldY)
    const g = snapGrid(raw.x, raw.y)
    if (!inBounds(g.x, g.y)) return false
    return this.place(g.x, g.y, this.selected, true)
  }

  tryRemoveAt(worldX: number, worldY: number): boolean {
    const raw = screenToGrid(worldX, worldY)
    const g = snapGrid(raw.x, raw.y)
    if (!inBounds(g.x, g.y)) return false
    return this.remove(g.x, g.y)
  }

  place(gx: number, gy: number, itemId: ItemId, replace: boolean): boolean {
    const item = getCatalogItem(itemId)
    const k = this.key(gx, gy)
    const map = item.layer === 'floor' ? this.floors : this.objects
    if (map.has(k)) {
      if (!replace) return false
      map.get(k)!.destroy()
      map.delete(k)
    }

    const screen = gridToScreen(gx, gy)
    const spr = this.scene.add.image(screen.x, screen.y, textureKeyForItem(itemId)) as TileSprite
    if (item.layer === 'object') {
      spr.setOrigin(0.5, 1)
      spr.y = screen.y + TILE_H / 2
      spr.setDepth(depthFor(gx, gy, 5))
    } else {
      spr.setOrigin(0.5, 0.5)
      spr.setDepth(depthFor(gx, gy, 1))
    }
    spr.gridX = gx
    spr.gridY = gy
    spr.itemId = itemId
    map.set(k, spr)
    return true
  }

  remove(gx: number, gy: number): boolean {
    const k = this.key(gx, gy)
    // Prefer removing object first, then floor
    if (this.objects.has(k)) {
      this.objects.get(k)!.destroy()
      this.objects.delete(k)
      return true
    }
    if (this.floors.has(k)) {
      this.floors.get(k)!.destroy()
      this.floors.delete(k)
      return true
    }
    return false
  }

  bindHotkeys(keyboard: Phaser.Input.Keyboard.KeyboardPlugin): void {
    for (const item of CATALOG) {
      keyboard.on(`keydown-${item.hotkey}`, () => {
        this.setSelected(item.id)
        this.scene.events.emit('build-selected', item.id)
      })
    }
  }
}
