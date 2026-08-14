import Phaser from 'phaser'
import {
  depthFor,
  gridToScreen,
  inBounds,
  MAP_SIZE,
  snapGrid,
  TILE_H,
  TILE_W,
} from './IsoGrid'
import type { WorldGen } from './WorldGen'
import type { BuildSystem } from './BuildSystem'

export type AnimalKind = 'chicken' | 'rabbit' | 'frog'

type Animal = {
  kind: AnimalKind
  x: number
  y: number
  dirX: number
  dirY: number
  wait: number
  sprite: Phaser.GameObjects.Image
}

const KINDS: AnimalKind[] = ['chicken', 'rabbit', 'frog']
const SCALE = 2.5
const SPEED = 38

export class AnimalSystem {
  private scene: Phaser.Scene
  private world: WorldGen
  private build: BuildSystem
  private animals: Animal[] = []

  constructor(scene: Phaser.Scene, world: WorldGen, build: BuildSystem) {
    this.scene = scene
    this.world = world
    this.build = build
  }

  spawn(count = 10): void {
    let guard = 0
    while (this.animals.length < count && guard++ < 300) {
      const gx = 1 + Math.floor(Math.random() * (MAP_SIZE - 2))
      const gy = 1 + Math.floor(Math.random() * (MAP_SIZE - 2))
      if (!this.walkable(gx + 0.5, gy + 0.5)) continue

      const kind = KINDS[Math.floor(Math.random() * KINDS.length)]!
      const s = gridToScreen(gx + 0.5, gy + 0.5)
      const sprite = this.scene.add
        .image(s.x, s.y + TILE_H / 2, `animal-${kind}`)
        .setOrigin(0.5, 1)
        .setScale(SCALE)
        .setDepth(depthFor(gx, gy, 7))

      this.animals.push({
        kind,
        x: gx + 0.5,
        y: gy + 0.5,
        dirX: 0,
        dirY: 0,
        wait: 200 + Math.random() * 900,
        sprite,
      })
    }
  }

  update(delta: number): void {
    for (const a of this.animals) {
      a.wait -= delta
      if (a.wait <= 0) {
        if (Math.random() < 0.4) {
          a.dirX = 0
          a.dirY = 0
          a.wait = 400 + Math.random() * 1200
        } else {
          const dirs = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
            [1, 1],
            [-1, -1],
          ]
          const d = dirs[Math.floor(Math.random() * dirs.length)]!
          a.dirX = d[0]!
          a.dirY = d[1]!
          a.wait = 500 + Math.random() * 1400
        }
      }

      if (a.dirX !== 0 || a.dirY !== 0) {
        const len = Math.hypot(a.dirX, a.dirY) || 1
        const step = ((SPEED * delta) / 1000 / (TILE_W / 2)) * 0.5
        const nx = a.x + (a.dirX / len) * step
        const ny = a.y + (a.dirY / len) * step
        if (this.walkable(nx, a.y)) a.x = nx
        else a.dirX *= -1
        if (this.walkable(a.x, ny)) a.y = ny
        else a.dirY *= -1
        a.x = Phaser.Math.Clamp(a.x, 0.3, MAP_SIZE - 0.3)
        a.y = Phaser.Math.Clamp(a.y, 0.3, MAP_SIZE - 0.3)
      }

      const s = gridToScreen(a.x, a.y)
      a.sprite.setPosition(s.x, s.y + TILE_H / 2)
      a.sprite.setDepth(depthFor(a.x, a.y, 7))
      // Flip facing
      if (a.dirX !== 0) a.sprite.setFlipX(a.dirX < 0)
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
