import Phaser from 'phaser'
import { OUTFITS, type OutfitId } from '../data/outfits'
import {
  depthFor,
  gridToScreen,
  inBounds,
  MAP_SIZE,
  snapGrid,
  TILE_H,
  TILE_W,
} from './IsoGrid'
import { PLAYER_DISPLAY_SCALE } from './Textures'
import type { WorldGen } from './WorldGen'
import type { BuildSystem } from './BuildSystem'

const NPC_NAMES = [
  'Mira',
  'Jon',
  'Kez',
  'Nori',
  'Ash',
  'Pip',
  'Ren',
  'Sol',
  'Tavi',
  'Uma',
  'Wren',
  'Zed',
  'Luma',
  'Ori',
  'Vex',
]

type Npc = {
  name: string
  outfitId: OutfitId
  x: number
  y: number
  dirX: number
  dirY: number
  wait: number
  sprite: Phaser.GameObjects.Image
  tag: Phaser.GameObjects.Text
}

export class NpcSystem {
  private scene: Phaser.Scene
  private world: WorldGen
  private build: BuildSystem
  private npcs: Npc[] = []
  private speed = 55

  constructor(scene: Phaser.Scene, world: WorldGen, build: BuildSystem) {
    this.scene = scene
    this.world = world
    this.build = build
  }

  spawn(count = 7): void {
    const used = new Set<string>()
    let guard = 0
    while (this.npcs.length < count && guard++ < 200) {
      const gx = 1 + Math.floor(Math.random() * (MAP_SIZE - 2))
      const gy = 1 + Math.floor(Math.random() * (MAP_SIZE - 2))
      const k = `${gx},${gy}`
      if (used.has(k) || !this.walkable(gx + 0.5, gy + 0.5)) continue
      used.add(k)

      const name = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)]!
      const outfitId = OUTFITS[Math.floor(Math.random() * OUTFITS.length)]!.id
      const s = gridToScreen(gx + 0.5, gy + 0.5)
      const sprite = this.scene.add
        .image(s.x, s.y + TILE_H / 2, `player-${outfitId}`)
        .setOrigin(0.5, 1)
        .setScale(PLAYER_DISPLAY_SCALE)
        .setDepth(depthFor(gx, gy, 8))

      const tag = this.scene.add
        .text(sprite.x, sprite.y - sprite.displayHeight - 4, name, {
          fontFamily: 'Courier New, monospace',
          fontSize: '11px',
          color: '#e8f0ff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5, 1)
        .setDepth(10002)

      this.npcs.push({
        name,
        outfitId,
        x: gx + 0.5,
        y: gy + 0.5,
        dirX: 0,
        dirY: 0,
        wait: 400 + Math.random() * 1200,
        sprite,
        tag,
      })
    }
  }

  update(delta: number): void {
    for (const npc of this.npcs) {
      npc.wait -= delta
      if (npc.wait <= 0) {
        if (Math.random() < 0.35) {
          npc.dirX = 0
          npc.dirY = 0
          npc.wait = 600 + Math.random() * 1400
        } else {
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, 1],
            [1, -1],
            [-1, -1],
          ]
          const d = dirs[Math.floor(Math.random() * dirs.length)]!
          npc.dirX = d[0]!
          npc.dirY = d[1]!
          npc.wait = 800 + Math.random() * 1800
        }
      }

      if (npc.dirX !== 0 || npc.dirY !== 0) {
        const len = Math.hypot(npc.dirX, npc.dirY) || 1
        const step = ((this.speed * delta) / 1000 / (TILE_W / 2)) * 0.5
        const nx = npc.x + (npc.dirX / len) * step
        const ny = npc.y + (npc.dirY / len) * step
        if (this.walkable(nx, npc.y)) npc.x = nx
        else npc.dirX *= -1
        if (this.walkable(npc.x, ny)) npc.y = ny
        else npc.dirY *= -1
        npc.x = Phaser.Math.Clamp(npc.x, 0.3, MAP_SIZE - 0.3)
        npc.y = Phaser.Math.Clamp(npc.y, 0.3, MAP_SIZE - 0.3)
      }

      const s = gridToScreen(npc.x, npc.y)
      npc.sprite.setPosition(s.x, s.y + TILE_H / 2)
      npc.sprite.setDepth(depthFor(npc.x, npc.y, 8))
      npc.tag.setPosition(npc.sprite.x, npc.sprite.y - npc.sprite.displayHeight - 4)
      npc.tag.setDepth(10002)
    }
  }

  private walkable(x: number, y: number): boolean {
    const g = snapGrid(x, y)
    if (!inBounds(g.x, g.y)) return false
    if (this.world.isBlockedTerrain(g.x, g.y)) return false
    if (this.build.isBlocked(g.x, g.y)) return false
    return true
  }
}
