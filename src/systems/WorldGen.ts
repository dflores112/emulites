import type Phaser from 'phaser'
import {
  depthFor,
  gridToScreen,
  inBounds,
  MAP_SIZE,
  TILE_H,
} from './IsoGrid'
import type { BuildSystem } from './BuildSystem'

export type TerrainKind = 'grass' | 'grass2' | 'path' | 'water' | 'sand' | 'plaza'

type PropSprite = Phaser.GameObjects.Image & { gridX?: number; gridY?: number }

/** Static world scenery: terrain, water, trees, starter buildings. */
export class WorldGen {
  private scene: Phaser.Scene
  private terrain: TerrainKind[][] = []
  private trees = new Set<string>()
  private blockers = new Set<string>()
  private props: PropSprite[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  key(x: number, y: number): string {
    return `${x},${y}`
  }

  getTerrain(x: number, y: number): TerrainKind {
    return this.terrain[y]?.[x] ?? 'grass'
  }

  hasTree(x: number, y: number): boolean {
    return this.trees.has(this.key(x, y))
  }

  isWater(x: number, y: number): boolean {
    return this.getTerrain(x, y) === 'water'
  }

  isBlockedTerrain(x: number, y: number): boolean {
    return this.isWater(x, y) || this.hasTree(x, y) || this.blockers.has(this.key(x, y))
  }

  generate(build: BuildSystem): void {
    this.terrain = []
    for (let y = 0; y < MAP_SIZE; y++) {
      const row: TerrainKind[] = []
      for (let x = 0; x < MAP_SIZE; x++) {
        row.push((x * 5 + y * 11) % 17 === 0 ? 'grass2' : 'grass')
      }
      this.terrain.push(row)
    }

    // Lakes scattered across the big map
    const ponds: [number, number, number, number][] = [
      [8, 12, 7, 7],
      [30, 6, 6, 6],
      [55, 10, 8, 7],
      [70, 28, 6, 6],
      [12, 40, 7, 8],
      [40, 38, 9, 8],
      [62, 48, 6, 6],
      [20, 62, 7, 7],
      [48, 68, 8, 7],
      [72, 70, 6, 6],
      [5, 72, 5, 5],
    ]
    for (const [ox, oy, w, h] of ponds) this.paintWaterPond(ox, oy, w, h)

    // Long winding paths linking villages
    this.paintPath(this.linePath(10, 18, 42, 42))
    this.paintPath(this.linePath(42, 42, 68, 20))
    this.paintPath(this.linePath(42, 42, 22, 66))
    this.paintPath(this.linePath(42, 42, 70, 65))
    this.paintPath(this.linePath(18, 22, 18, 45))
    this.paintPath(this.linePath(60, 18, 60, 40))

    this.drawTerrain()
    this.plantTrees()
    this.seedTownCenter(build)
    this.seedOutlyingVillages(build)
  }

  private linePath(x0: number, y0: number, x1: number, y1: number): [number, number][] {
    const cells: [number, number][] = []
    let x = x0
    let y = y0
    cells.push([x, y])
    while (x !== x1 || y !== y1) {
      if (x < x1) x++
      else if (x > x1) x--
      else if (y < y1) y++
      else if (y > y1) y--
      // slight meander
      if ((x + y) % 7 === 0 && y !== y1) {
        if (y < y1) y++
        else if (y > y1) y--
      }
      cells.push([x, y])
      if (cells.length > MAP_SIZE * 3) break
    }
    return cells
  }

  private paintWaterPond(ox: number, oy: number, w: number, h: number): void {
    for (let y = oy; y < oy + h; y++) {
      for (let x = ox; x < ox + w; x++) {
        if (!inBounds(x, y)) continue
        const nx = (x - ox + 0.5) / w - 0.5
        const ny = (y - oy + 0.5) / h - 0.5
        if (nx * nx + ny * ny < 0.28) {
          this.terrain[y]![x] = 'water'
        } else if (nx * nx + ny * ny < 0.4) {
          this.terrain[y]![x] = 'sand'
        }
      }
    }
  }

  private paintPath(cells: [number, number][]): void {
    for (const [x, y] of cells) {
      if (!inBounds(x, y)) continue
      if (this.terrain[y]![x] === 'water') continue
      this.terrain[y]![x] = 'path'
      // thicken path a bit
      if (inBounds(x + 1, y) && this.terrain[y]![x + 1] !== 'water') {
        this.terrain[y]![x + 1] = 'path'
      }
    }
  }

  private drawTerrain(): void {
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const kind = this.terrain[y]![x]!
        const tex =
          kind === 'grass2'
            ? 'grass2'
            : kind === 'path'
              ? 'path'
              : kind === 'water'
                ? 'water'
                : kind === 'sand'
                  ? 'sand'
                  : kind === 'plaza'
                    ? 'plaza'
                    : 'grass'
        const s = gridToScreen(x, y)
        const spr = this.scene.add
          .image(s.x, s.y, tex)
          .setOrigin(0.5, 0.5)
          .setScale(1.06)
          .setDepth(depthFor(x, y, 0))
        if (kind === 'water') {
          spr.setData('water', true)
          this.props.push(spr as PropSprite)
        }
      }
    }
  }

  private plantTrees(): void {
    // Scatter trees with a sparse hash so the big map feels wooded
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const h = (x * 374761393 + y * 668265263) >>> 0
        if (h % 37 !== 0) continue
        if (this.isWater(x, y) || this.getTerrain(x, y) === 'path') continue
        // Keep village centers clearer
        if (this.nearVillage(x, y)) continue
        this.placeTree(x, y)
      }
    }
  }

  private nearVillage(x: number, y: number): boolean {
    const hubs: [number, number, number][] = [
      [42, 42, 14], // town center — keep wide clear
      [18, 22, 6],
      [65, 18, 6],
      [22, 65, 6],
      [68, 62, 6],
    ]
    for (const [hx, hy, r] of hubs) {
      if (Math.abs(x - hx) < r && Math.abs(y - hy) < r) return true
    }
    return false
  }

  private placeTree(x: number, y: number): void {
    if (this.trees.has(this.key(x, y))) return
    this.trees.add(this.key(x, y))
    const s = gridToScreen(x, y)
    const tree = this.scene.add.image(s.x, s.y + TILE_H / 2, 'tree') as PropSprite
    tree.setOrigin(0.5, 1)
    tree.setDepth(depthFor(x, y, 6))
    tree.gridX = x
    tree.gridY = y
    this.props.push(tree)

    if ((x + y) % 4 === 0) {
      const bx = x + 1
      const by = y
      if (
        inBounds(bx, by) &&
        !this.isWater(bx, by) &&
        this.getTerrain(bx, by) !== 'path' &&
        !this.trees.has(this.key(bx, by))
      ) {
        const bs = gridToScreen(bx, by)
        const bush = this.scene.add.image(bs.x, bs.y + TILE_H / 2, 'bush') as PropSprite
        bush.setOrigin(0.5, 1)
        bush.setDepth(depthFor(bx, by, 4))
        this.props.push(bush)
      }
    }
  }

  private seedTownCenter(build: BuildSystem): void {
    // Stone plaza
    for (let y = 38; y <= 50; y++) {
      for (let x = 36; x <= 50; x++) {
        if (!inBounds(x, y)) continue
        if (this.isWater(x, y)) continue
        this.terrain[y]![x] = 'plaza'
      }
    }
    // Re-draw plaza tiles over grass (images already placed — add plaza sprites on top as floor layer)
    for (let y = 38; y <= 50; y++) {
      for (let x = 36; x <= 50; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        const s = gridToScreen(x, y)
        this.scene.add
          .image(s.x, s.y, 'plaza')
          .setOrigin(0.5, 0.5)
          .setScale(1.06)
          .setDepth(depthFor(x, y, 0.5))
      }
    }

    // Paths into the plaza
    this.overlayPath([
      ...this.linePath(36, 44, 30, 44),
      ...this.linePath(50, 44, 56, 44),
      ...this.linePath(43, 38, 43, 32),
      ...this.linePath(43, 50, 43, 56),
    ])

    // Water well in the square
    this.placeProp(43, 44, 'well', true, 1)

    // Big town hall (north side of plaza)
    this.styledBuilding(build, 38, 33, 8, 5, true, 'wall')
    // Church with steeple (east)
    this.styledBuilding(build, 51, 36, 6, 5, false, 'churchWall')
    this.placeProp(53, 36, 'steeple', true, 1)
    // Inn / tavern (west)
    this.styledBuilding(build, 30, 40, 6, 4, true, 'wall')
    // Market row (south edge of plaza)
    this.placeProp(39, 49, 'stall', true)
    this.placeProp(42, 50, 'stall', true)
    this.placeProp(46, 49, 'stall', true)
    // Shop
    this.styledBuilding(build, 48, 48, 4, 3, true, 'wall')

    // Farm district (southwest of town)
    this.paintFarm(28, 46, 7, 6)
    this.styledBuilding(build, 26, 44, 5, 4, false, 'barnWall')
    // Fence ring around farm
    for (let x = 28; x <= 34; x++) {
      this.placeProp(x, 45, 'fence', true)
      this.placeProp(x, 52, 'fence', true)
    }
    for (let y = 46; y <= 51; y++) {
      this.placeProp(27, y, 'fence', true)
      this.placeProp(35, y, 'fence', true)
    }

    // Outdoor plaza furniture
    build.place(40, 42, 'table', true)
    build.place(39, 42, 'chair', true)
    build.place(41, 42, 'chair', true)
    build.place(46, 42, 'table', true)
    build.place(45, 42, 'chair', true)
    build.place(47, 42, 'chair', true)
  }

  private seedOutlyingVillages(build: BuildSystem): void {
    this.rectBuilding(build, 15, 18, 4, 3, true)
    this.rectBuilding(build, 20, 20, 3, 3, false)
    this.rectBuilding(build, 62, 15, 4, 3, true)
    this.rectBuilding(build, 67, 17, 3, 3, true)
    this.rectBuilding(build, 18, 62, 4, 3, true)
    this.rectBuilding(build, 23, 65, 3, 3, false)
    this.rectBuilding(build, 65, 60, 5, 4, true)
    this.rectBuilding(build, 70, 64, 3, 3, false)
    build.place(17, 22, 'chair', true)
    build.place(64, 19, 'table', true)
  }

  private overlayPath(cells: [number, number][]): void {
    for (const [x, y] of cells) {
      if (!inBounds(x, y) || this.isWater(x, y)) continue
      this.terrain[y]![x] = 'path'
      const s = gridToScreen(x, y)
      this.scene.add
        .image(s.x, s.y, 'path')
        .setOrigin(0.5, 0.5)
        .setScale(1.06)
        .setDepth(depthFor(x, y, 0.4))
    }
  }

  private paintFarm(ox: number, oy: number, w: number, h: number): void {
    for (let y = oy; y < oy + h; y++) {
      for (let x = ox; x < ox + w; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        const s = gridToScreen(x, y)
        this.scene.add
          .image(s.x, s.y, 'crop')
          .setOrigin(0.5, 0.5)
          .setScale(1.04)
          .setDepth(depthFor(x, y, 1))
      }
    }
  }

  private placeProp(
    x: number,
    y: number,
    tex: string,
    blocks: boolean,
    originBias = 0,
  ): void {
    if (!inBounds(x, y)) return
    const s = gridToScreen(x, y)
    const spr = this.scene.add.image(s.x, s.y + TILE_H / 2 - originBias, tex) as PropSprite
    spr.setOrigin(0.5, 1)
    spr.setDepth(depthFor(x, y, 6))
    spr.gridX = x
    spr.gridY = y
    this.props.push(spr)
    if (blocks) this.blockers.add(this.key(x, y))
  }

  private styledBuilding(
    build: BuildSystem,
    ox: number,
    oy: number,
    w: number,
    h: number,
    furnish: boolean,
    wallTex: 'wall' | 'churchWall' | 'barnWall',
  ): void {
    for (let y = oy; y < oy + h; y++) {
      for (let x = ox; x < ox + w; x++) {
        if (!inBounds(x, y) || this.isWater(x, y) || this.hasTree(x, y)) continue
        build.place(x, y, 'floor', true)
        const edge = x === ox || y === oy || x === ox + w - 1 || y === oy + h - 1
        const door = x === ox + Math.floor(w / 2) && y === oy + h - 1
        if (door) {
          build.place(x, y, 'door', true)
        } else if (edge) {
          if (wallTex === 'wall') {
            build.place(x, y, 'wall', true)
          } else {
            // Scenery wall variant (still blocks)
            this.placeProp(x, y, wallTex, true)
          }
        }
      }
    }
    if (furnish) {
      const ix = ox + 1
      const iy = oy + 1
      if (inBounds(ix, iy) && !this.hasTree(ix, iy)) {
        build.place(ix, iy, 'table', true)
        if (inBounds(ix + 1, iy)) build.place(ix + 1, iy, 'chair', true)
      }
    }
  }

  private rectBuilding(
    build: BuildSystem,
    ox: number,
    oy: number,
    w: number,
    h: number,
    furnish: boolean,
  ): void {
    for (let y = oy; y < oy + h; y++) {
      for (let x = ox; x < ox + w; x++) {
        if (!inBounds(x, y) || this.isWater(x, y) || this.hasTree(x, y)) continue
        build.place(x, y, 'floor', true)
        const edge = x === ox || y === oy || x === ox + w - 1 || y === oy + h - 1
        const door = x === ox + Math.floor(w / 2) && y === oy + h - 1
        if (door) {
          build.place(x, y, 'door', true)
        } else if (edge) {
          build.place(x, y, 'wall', true)
        }
      }
    }
    if (furnish) {
      const ix = ox + 1
      const iy = oy + 1
      if (inBounds(ix, iy) && !this.hasTree(ix, iy)) {
        build.place(ix, iy, 'table', true)
        if (inBounds(ix + 1, iy)) build.place(ix + 1, iy, 'chair', true)
      }
    }
  }

  tick(time: number): void {
    const pulse = 0.88 + Math.sin(time / 400) * 0.07
    for (const p of this.props) {
      if (p.getData('water')) {
        p.setAlpha(pulse)
      }
    }
  }
}
