import type Phaser from 'phaser'
import {
  depthFor,
  gridToScreen,
  inBounds,
  MAP_SIZE,
  TILE_H,
} from './IsoGrid'
import type { BuildSystem } from './BuildSystem'
import {
  CITIES,
  CITY_BLOCK,
  CITY_MARGIN,
  CITY_STREET,
  citySize,
  CORE_POOL,
  MID_POOL,
  TOWER_BY_ID,
  type CitySpec,
  type TowerSpec,
} from '../data/city'

export type TerrainKind = 'grass' | 'grass2' | 'path' | 'water' | 'sand' | 'plaza'

type PropSprite = Phaser.GameObjects.Image & { gridX?: number; gridY?: number }

/** District hubs kept clear of wild trees: [cx, cy, radius]. */
const CLEAR_HUBS: [number, number, number][] = [
  [164, 31, 24], // Thrill City roller-coaster park
  [164, 164, 24], // Splash Bay water park
  [22, 22, 19], // Emulite City skyline
  [112, 17, 19], // Northport
  [122, 120, 19], // Southbay
  [17, 115, 14], // Westend
  [74, 74, 22], // capital
  [74, 52, 12], // north residences
  [96, 74, 12], // east market
  [52, 86, 14], // southwest farms
  [48, 58, 12], // west harbor
  [98, 52, 11], // northeast manor
  [98, 98, 10], // southeast fishing
  [48, 98, 10], // south orchard
  [52, 40, 9], // northwest lodge
  [110, 74, 8], // east workshops
  [74, 110, 9], // south gate village
  [30, 74, 8], // west outpost
]

/** Static world scenery: terrain, water, trees, fully built districts. */
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

    const ponds: [number, number, number, number][] = [
      [8, 46, 8, 7],
      [40, 12, 8, 7],
      [70, 8, 9, 8],
      [82, 10, 8, 7],
      [120, 30, 9, 8],
      [12, 55, 8, 8],
      [36, 48, 11, 10], // harbor lake
      [110, 48, 7, 7],
      [130, 60, 8, 7],
      [16, 90, 7, 7],
      [60, 120, 9, 8],
      [86, 120, 9, 8],
      [120, 88, 8, 7],
      [88, 88, 6, 6],
      [34, 128, 7, 6],
      [154, 72, 10, 9],
      [174, 98, 9, 8],
      [108, 166, 10, 8],
      [66, 172, 9, 8],
    ]
    for (const [ox, oy, w, h] of ponds) this.paintWaterPond(ox, oy, w, h)

    // Road network linking districts
    const roads: [number, number, number, number][] = [
      [74, 74, 74, 40],
      [74, 74, 74, 118],
      [74, 74, 28, 74],
      [74, 74, 120, 74],
      [74, 74, 48, 58],
      [74, 74, 52, 90],
      [74, 74, 98, 52],
      [74, 74, 100, 100],
      [74, 52, 52, 40],
      [96, 74, 110, 74],
      [52, 86, 48, 98],
      [98, 98, 74, 110],
      [48, 58, 36, 52],
      // highways out to the cities
      [22, 40, 42, 56],
      [40, 12, 96, 14],
      [112, 30, 98, 46],
      [120, 102, 114, 84],
      [17, 102, 28, 80],
      // destination park roads
      [128, 18, 148, 30],
      [138, 120, 148, 152],
    ]
    for (const [x0, y0, x1, y1] of roads) {
      this.paintPath(this.linePath(x0, y0, x1, y1))
    }

    this.drawTerrain()
    this.plantTrees()
    this.seedCapital(build)
    this.seedResidences(build)
    this.seedEastMarket(build)
    this.seedFarms(build)
    this.seedHarbor(build)
    this.seedManor(build)
    this.seedFishingVillage(build)
    this.seedOrchard(build)
    this.seedForestLodge(build)
    this.seedWorkshops(build)
    this.seedSouthGate(build)
    this.seedWestOutpost(build)
    for (const city of CITIES) this.seedCity(city)
    this.seedRollerCoasterPark()
    this.seedWaterPark()
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
      if ((x + y) % 7 === 0 && y !== y1) {
        if (y < y1) y++
        else if (y > y1) y--
      }
      cells.push([x, y])
      if (cells.length > MAP_SIZE * 4) break
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
    for (let y = 0; y < MAP_SIZE; y++) {
      for (let x = 0; x < MAP_SIZE; x++) {
        const h = (x * 374761393 + y * 668265263) >>> 0
        if (h % 41 !== 0) continue
        if (this.isWater(x, y) || this.getTerrain(x, y) === 'path') continue
        if (this.nearVillage(x, y)) continue
        this.placeTree(x, y)
      }
    }
  }

  private nearVillage(x: number, y: number): boolean {
    for (const [hx, hy, r] of CLEAR_HUBS) {
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

  // --- Districts ---

  private seedCapital(build: BuildSystem): void {
    this.paintPlaza(64, 64, 86, 86)
    this.overlayPath([
      ...this.linePath(64, 74, 56, 74),
      ...this.linePath(86, 74, 94, 74),
      ...this.linePath(74, 64, 74, 56),
      ...this.linePath(74, 86, 74, 94),
    ])

    this.placeProp(74, 74, 'well', true, 1)
    this.placeProp(70, 70, 'lamp', true)
    this.placeProp(78, 70, 'lamp', true)
    this.placeProp(70, 78, 'lamp', true)
    this.placeProp(78, 78, 'lamp', true)

    // Town hall (north)
    this.styledBuilding(build, 68, 58, 10, 6, true, 'wall')
    build.place(70, 60, 'table', true)
    build.place(71, 60, 'chair', true)
    build.place(72, 60, 'chair', true)
    build.place(74, 61, 'chest', true)

    // Church + steeple + yard (east of plaza)
    this.styledBuilding(build, 87, 66, 7, 6, false, 'churchWall')
    this.placeProp(90, 66, 'steeple', true, 1)
    this.placeProp(88, 73, 'flower', false)
    this.placeProp(91, 73, 'flower', false)
    this.placeProp(93, 72, 'flower', false)
    // Small cemetery
    this.placeProp(94, 68, 'rock', true)
    this.placeProp(95, 70, 'rock', true)
    this.placeProp(96, 69, 'flower', false)

    // Inn / tavern (west)
    this.styledBuilding(build, 56, 68, 7, 5, true, 'wall')
    build.place(58, 70, 'table', true)
    build.place(57, 70, 'chair', true)
    build.place(59, 70, 'chair', true)
    build.place(58, 71, 'barrel', true)
    build.place(60, 71, 'bed', true)

    // Market row (south plaza)
    for (const x of [67, 70, 73, 76, 79, 82]) {
      this.placeProp(x, 84, 'stall', true)
    }
    this.styledBuilding(build, 80, 86, 5, 4, true, 'wall')
    build.place(81, 87, 'chest', true)
    build.place(82, 88, 'barrel', true)

    // Guard posts at plaza corners
    this.rectBuilding(build, 65, 65, 3, 3, false)
    this.rectBuilding(build, 83, 65, 3, 3, false)
    this.placeProp(66, 67, 'lamp', true)
    this.placeProp(84, 67, 'lamp', true)

    // Plaza seating
    build.place(70, 72, 'table', true)
    build.place(69, 72, 'chair', true)
    build.place(71, 72, 'chair', true)
    build.place(78, 72, 'table', true)
    build.place(77, 72, 'chair', true)
    build.place(79, 72, 'chair', true)
    build.place(72, 78, 'table', true)
    build.place(71, 78, 'chair', true)
    build.place(73, 78, 'chair', true)
  }

  private seedResidences(build: BuildSystem): void {
    this.paintPlaza(66, 44, 84, 56)
    const homes: [number, number, number, number, boolean][] = [
      [66, 44, 4, 4, true],
      [72, 44, 4, 4, true],
      [78, 44, 5, 4, true],
      [66, 50, 4, 4, true],
      [72, 50, 5, 4, true],
      [79, 50, 4, 4, true],
    ]
    for (const [x, y, w, h, f] of homes) {
      this.rectBuilding(build, x, y, w, h, f)
      build.place(x + 1, y + 1, 'bed', true)
      if (inBounds(x + 2, y + 1)) build.place(x + 2, y + 1, 'chest', true)
    }
    this.placeProp(70, 48, 'lamp', true)
    this.placeProp(76, 48, 'lamp', true)
    this.placeProp(68, 55, 'flower', false)
    this.placeProp(75, 55, 'flower', false)
    this.placeProp(82, 54, 'flower', false)
    this.fenceRect(65, 43, 85, 57)
  }

  private seedEastMarket(build: BuildSystem): void {
    this.paintPlaza(90, 66, 108, 84)
    const stalls: [number, number][] = [
      [92, 70],
      [95, 70],
      [98, 70],
      [101, 70],
      [104, 70],
      [92, 74],
      [95, 74],
      [98, 74],
      [101, 74],
      [104, 74],
      [92, 78],
      [96, 78],
      [100, 78],
      [104, 78],
    ]
    for (const [x, y] of stalls) this.placeProp(x, y, 'stall', true)

    this.styledBuilding(build, 100, 80, 6, 4, true, 'wall')
    build.place(101, 81, 'table', true)
    build.place(102, 81, 'chair', true)
    build.place(103, 82, 'barrel', true)
    build.place(104, 82, 'chest', true)

    this.placeProp(94, 68, 'lamp', true)
    this.placeProp(102, 68, 'lamp', true)
    this.placeProp(94, 82, 'lamp', true)
    this.placeProp(106, 76, 'barrel', true)
    this.placeProp(107, 78, 'barrel', true)
  }

  private seedFarms(build: BuildSystem): void {
    this.paintFarm(44, 82, 10, 8)
    this.paintFarm(56, 84, 8, 7)
    this.styledBuilding(build, 42, 78, 6, 5, false, 'barnWall')
    this.styledBuilding(build, 54, 78, 5, 4, false, 'barnWall')
    this.rectBuilding(build, 48, 90, 4, 3, true)
    build.place(49, 91, 'bed', true)

    this.fenceRect(43, 81, 54, 91)
    this.fenceRect(55, 83, 64, 92)
    this.placeProp(50, 80, 'well', true, 1)
    this.placeProp(46, 86, 'barrel', true)
    this.placeProp(58, 86, 'barrel', true)
    this.placeProp(60, 88, 'lamp', true)
  }

  private seedHarbor(build: BuildSystem): void {
    // Sand pier / boardwalk along the harbor lake
    for (let y = 50; y <= 62; y++) {
      for (let x = 42; x <= 50; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        this.terrain[y]![x] = 'sand'
        const s = gridToScreen(x, y)
        this.scene.add
          .image(s.x, s.y, 'sand')
          .setOrigin(0.5, 0.5)
          .setScale(1.06)
          .setDepth(depthFor(x, y, 0.5))
      }
    }
    this.overlayPath(this.linePath(50, 58, 64, 68))

    this.rectBuilding(build, 44, 54, 5, 4, true)
    this.rectBuilding(build, 50, 56, 4, 3, true)
    build.place(45, 55, 'bed', true)
    build.place(51, 57, 'chest', true)

    this.placeProp(46, 58, 'stall', true)
    this.placeProp(49, 60, 'stall', true)
    this.placeProp(47, 61, 'barrel', true)
    this.placeProp(48, 61, 'barrel', true)
    this.placeProp(45, 60, 'lamp', true)
    this.placeProp(51, 54, 'lamp', true)
    this.placeProp(43, 56, 'rock', true)
  }

  private seedManor(build: BuildSystem): void {
    this.paintPlaza(92, 44, 108, 58)
    this.styledBuilding(build, 94, 46, 10, 7, true, 'wall')
    build.place(96, 48, 'table', true)
    build.place(97, 48, 'chair', true)
    build.place(98, 48, 'chair', true)
    build.place(100, 49, 'bed', true)
    build.place(101, 49, 'chest', true)
    build.place(96, 50, 'barrel', true)

    // Garden wings
    this.placeProp(93, 52, 'flower', false)
    this.placeProp(93, 54, 'flower', false)
    this.placeProp(105, 52, 'flower', false)
    this.placeProp(106, 54, 'flower', false)
    this.placeProp(98, 55, 'flower', false)
    this.placeProp(100, 55, 'bush', false)
    this.placeProp(95, 45, 'lamp', true)
    this.placeProp(103, 45, 'lamp', true)
    this.fenceRect(91, 43, 109, 59)

    // Guest cottage
    this.rectBuilding(build, 104, 52, 4, 4, true)
    build.place(105, 53, 'bed', true)
  }

  private seedFishingVillage(build: BuildSystem): void {
    this.paintPlaza(92, 92, 108, 108)
    this.rectBuilding(build, 94, 94, 4, 3, true)
    this.rectBuilding(build, 100, 94, 4, 4, true)
    this.rectBuilding(build, 96, 100, 5, 4, true)
    build.place(95, 95, 'bed', true)
    build.place(101, 95, 'bed', true)
    build.place(102, 96, 'chest', true)
    build.place(97, 101, 'table', true)
    build.place(98, 101, 'chair', true)

    this.placeProp(98, 98, 'stall', true)
    this.placeProp(102, 99, 'stall', true)
    this.placeProp(95, 99, 'barrel', true)
    this.placeProp(104, 102, 'barrel', true)
    this.placeProp(99, 96, 'lamp', true)
    this.placeProp(105, 96, 'lamp', true)
    this.placeProp(106, 104, 'rock', true)
    this.placeProp(93, 104, 'flower', false)
  }

  private seedOrchard(build: BuildSystem): void {
    this.paintFarm(42, 96, 12, 8)
    for (let y = 96; y <= 104; y += 2) {
      for (let x = 42; x <= 52; x += 2) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        this.placeProp(x, y, (x + y) % 4 === 0 ? 'flower' : 'bush', false)
      }
    }
    this.rectBuilding(build, 46, 106, 5, 4, true)
    build.place(47, 107, 'bed', true)
    build.place(48, 108, 'barrel', true)
    this.fenceRect(41, 95, 55, 105)
    this.placeProp(44, 98, 'lamp', true)
    this.placeProp(50, 102, 'well', true, 1)
  }

  private seedForestLodge(build: BuildSystem): void {
    this.paintPlaza(46, 34, 58, 46)
    this.styledBuilding(build, 48, 36, 6, 5, true, 'wall')
    build.place(49, 37, 'table', true)
    build.place(50, 37, 'chair', true)
    build.place(51, 38, 'bed', true)
    build.place(52, 38, 'chest', true)
    this.placeProp(47, 40, 'lamp', true)
    this.placeProp(54, 40, 'lamp', true)
    this.placeProp(50, 42, 'barrel', true)
    this.placeProp(46, 38, 'rock', true)
    this.placeProp(56, 44, 'rock', true)
    this.placeProp(52, 44, 'flower', false)
    this.placeProp(48, 44, 'bush', false)
  }

  private seedWorkshops(build: BuildSystem): void {
    this.paintPlaza(106, 68, 118, 82)
    this.rectBuilding(build, 108, 70, 5, 4, true)
    this.rectBuilding(build, 114, 70, 4, 4, true)
    this.rectBuilding(build, 108, 76, 5, 4, true)
    build.place(109, 71, 'table', true)
    build.place(110, 71, 'chair', true)
    build.place(115, 71, 'table', true)
    build.place(109, 77, 'barrel', true)
    build.place(110, 77, 'chest', true)
    build.place(111, 78, 'barrel', true)
    this.placeProp(112, 74, 'lamp', true)
    this.placeProp(116, 74, 'lamp', true)
    this.placeProp(113, 78, 'barrel', true)
  }

  private seedSouthGate(build: BuildSystem): void {
    this.paintPlaza(68, 104, 84, 118)
    this.rectBuilding(build, 70, 106, 4, 3, true)
    this.rectBuilding(build, 76, 106, 4, 4, true)
    this.rectBuilding(build, 72, 112, 5, 4, true)
    build.place(71, 107, 'bed', true)
    build.place(77, 107, 'bed', true)
    build.place(73, 113, 'table', true)
    this.placeProp(74, 110, 'well', true, 1)
    this.placeProp(70, 110, 'stall', true)
    this.placeProp(78, 111, 'stall', true)
    this.placeProp(74, 105, 'lamp', true)
    this.placeProp(80, 114, 'flower', false)
    this.fenceRect(67, 103, 85, 119)
  }

  private seedWestOutpost(build: BuildSystem): void {
    this.paintPlaza(24, 68, 36, 80)
    this.rectBuilding(build, 26, 70, 5, 4, true)
    this.rectBuilding(build, 32, 72, 4, 3, false)
    build.place(27, 71, 'bed', true)
    build.place(28, 71, 'chest', true)
    this.placeProp(30, 74, 'lamp', true)
    this.placeProp(28, 76, 'barrel', true)
    this.placeProp(34, 74, 'stall', true)
    this.placeProp(25, 72, 'rock', true)
  }

  // --- Theme parks ---

  private seedRollerCoasterPark(): void {
    const x0 = 146
    const y0 = 10
    const x1 = 182
    const y1 = 52

    this.paintParkGround(x0, y0, x1, y1, 'plaza')

    // Broad midway from the entrance, with two cross-park promenades.
    for (let y = y0 + 2; y <= y1 - 2; y++) {
      for (let x = 162; x <= 166; x++) this.overlayTile(x, y, 'path', 0.7)
    }
    for (const y of [27, 40]) {
      for (let x = x0 + 2; x <= x1 - 2; x++) {
        for (let d = 0; d < 2; d++) this.overlayTile(x, y + d, 'path', 0.7)
      }
    }

    // The signature rides.
    this.placeAttraction(148, 12, 9, 10, 'ride-coaster-loop')
    this.placeAttraction(158, 11, 17, 10, 'ride-coaster-hill')
    this.placeAttraction(148, 29, 8, 9, 'ride-ferris')
    this.placeAttraction(174, 28, 5, 8, 'ride-drop')
    this.placeAttraction(158, 30, 9, 7, 'ride-coaster-station')

    // Entrance and lively midway furniture.
    this.placeAttraction(160, 45, 9, 5, 'ride-park-gate', false)
    for (const [x, y] of [
      [151, 41],
      [155, 41],
      [171, 41],
      [176, 41],
      [151, 24],
      [178, 24],
    ] as [number, number][]) {
      this.placeProp(x, y, 'stall', true)
    }
    for (const [x, y] of [
      [158, 25],
      [169, 25],
      [158, 39],
      [169, 39],
      [155, 48],
      [173, 48],
    ] as [number, number][]) {
      this.placeProp(x, y, 'lamp', true)
    }
    this.placeProp(160, 42, 'chair', false)
    this.placeProp(168, 42, 'chair', false)
    this.placeProp(153, 38, 'flower', false)
    this.placeProp(176, 38, 'flower', false)

    this.fencePark(x0, y0, x1, y1, 162, 166)
  }

  private seedWaterPark(): void {
    const x0 = 145
    const y0 = 143
    const x1 = 183
    const y1 = 182

    this.paintParkGround(x0, y0, x1, y1, 'sand')

    // Main boardwalk.
    for (let y = y0 + 2; y <= y1 - 2; y++) {
      for (let x = 162; x <= 166; x++) this.overlayTile(x, y, 'path', 0.7)
    }
    for (let x = x0 + 2; x <= x1 - 2; x++) {
      this.overlayTile(x, 159, 'path', 0.7)
      this.overlayTile(x, 160, 'path', 0.7)
    }

    // Lazy river forms a thick oval around the center of the resort.
    for (let y = 147; y <= 177; y++) {
      for (let x = 148; x <= 180; x++) {
        const nx = (x - 164) / 16
        const ny = (y - 162) / 14
        const d = nx * nx + ny * ny
        if (d > 0.62 && d < 1.02) this.paintParkWater(x, y)
      }
    }

    // Wave pool and shallow kids' pool.
    this.paintPool(168, 163, 11, 8)
    this.paintPool(149, 166, 7, 5)

    this.placeAttraction(148, 145, 10, 11, 'ride-water-tower')
    this.placeAttraction(168, 145, 12, 9, 'ride-water-racer')
    this.placeAttraction(150, 160, 7, 8, 'ride-splash')
    this.placeAttraction(160, 176, 9, 5, 'ride-water-gate', false)

    // Food court, loungers and tropical landscaping.
    for (const [x, y] of [
      [158, 148],
      [161, 148],
      [174, 157],
      [178, 157],
      [157, 174],
      [172, 175],
    ] as [number, number][]) {
      this.placeProp(x, y, 'stall', true)
    }
    for (const [x, y] of [
      [158, 157],
      [169, 157],
      [158, 170],
      [170, 173],
      [154, 179],
      [175, 179],
    ] as [number, number][]) {
      this.placeProp(x, y, 'lamp', true)
    }
    for (const [x, y] of [
      [158, 163],
      [159, 164],
      [177, 173],
      [178, 174],
      [149, 157],
      [180, 147],
    ] as [number, number][]) {
      this.placeProp(x, y, 'bush', false)
    }
    this.placeProp(158, 161, 'chair', false)
    this.placeProp(158, 166, 'chair', false)
    this.placeProp(179, 159, 'chair', false)

    this.fencePark(x0, y0, x1, y1, 162, 166)
  }

  private paintParkGround(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    tex: 'plaza' | 'sand',
  ): void {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inBounds(x, y)) continue
        this.terrain[y]![x] = tex
        this.overlayTile(x, y, tex, 0.6)
      }
    }
  }

  private paintParkWater(x: number, y: number): void {
    if (!inBounds(x, y)) return
    this.terrain[y]![x] = 'water'
    this.overlayTile(x, y, 'water', 0.8)
  }

  private paintPool(ox: number, oy: number, w: number, h: number): void {
    for (let y = oy; y < oy + h; y++) {
      for (let x = ox; x < ox + w; x++) {
        // Rounded pool corners.
        const corner =
          (x === ox || x === ox + w - 1) && (y === oy || y === oy + h - 1)
        if (!corner) this.paintParkWater(x, y)
      }
    }
  }

  private placeAttraction(
    x0: number,
    y0: number,
    w: number,
    h: number,
    tex: string,
    blocks = true,
  ): void {
    const x1 = x0 + w - 1
    const y1 = y0 + h - 1
    const centerX = (x0 + x1) / 2
    const centerY = (y0 + y1) / 2
    const s = gridToScreen(centerX, centerY)
    const spr = this.scene.add.image(s.x, s.y + TILE_H / 2, tex) as PropSprite
    spr.setOrigin(0.5, 1)
    spr.setDepth(depthFor(x1, y1, 7))
    spr.gridX = centerX
    spr.gridY = centerY
    this.props.push(spr)

    if (blocks) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (inBounds(x, y)) this.blockers.add(this.key(x, y))
        }
      }
    }
  }

  private fencePark(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    gateX0: number,
    gateX1: number,
  ): void {
    for (let x = x0; x <= x1; x++) {
      this.placeProp(x, y0, 'fence', true)
      if (x < gateX0 || x > gateX1) this.placeProp(x, y1, 'fence', true)
    }
    for (let y = y0 + 1; y < y1; y++) {
      this.placeProp(x0, y, 'fence', true)
      this.placeProp(x1, y, 'fence', true)
    }
  }

  // --- Cities ---

  /** Streets, sidewalks, lane paint and a full skyline for one city. */
  private seedCity(city: CitySpec): void {
    const { w, h } = citySize(city)
    const x0 = city.ox
    const y0 = city.oy
    const x1 = x0 + w - 1
    const y1 = y0 + h - 1
    const step = CITY_BLOCK + CITY_STREET
    const blockX = (bx: number) => x0 + CITY_MARGIN + bx * step
    const blockY = (by: number) => y0 + CITY_MARGIN + by * step

    const blockCols = new Set<number>()
    for (let bx = 0; bx < city.blocksX; bx++) {
      for (let i = 0; i < CITY_BLOCK; i++) blockCols.add(blockX(bx) + i)
    }
    const blockRows = new Set<number>()
    for (let by = 0; by < city.blocksY; by++) {
      for (let i = 0; i < CITY_BLOCK; i++) blockRows.add(blockY(by) + i)
    }
    const onBlock = (x: number, y: number) => blockCols.has(x) && blockRows.has(y)

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        this.terrain[y]![x] = 'path'
        this.overlayTile(x, y, onBlock(x, y) ? 'sidewalk' : 'asphalt', 0.55)
      }
    }

    // Center lane dashes, skipped at intersections
    const bandStartY = (by: number) => (by === 0 ? y0 : blockY(by - 1) + CITY_BLOCK)
    const bandStartX = (bx: number) => (bx === 0 ? x0 : blockX(bx - 1) + CITY_BLOCK)

    for (let by = 0; by <= city.blocksY; by++) {
      const my = bandStartY(by) + 1
      for (let x = x0; x <= x1; x++) {
        if (!blockCols.has(x) || (x + my) % 2 !== 0) continue
        if (this.isWater(x, my)) continue
        this.overlayTile(x, my, 'laneX', 0.6)
      }
    }
    for (let bx = 0; bx <= city.blocksX; bx++) {
      const mx = bandStartX(bx) + 1
      for (let y = y0; y <= y1; y++) {
        if (!blockRows.has(y) || (mx + y) % 2 !== 0) continue
        if (this.isWater(mx, y)) continue
        this.overlayTile(mx, y, 'laneY', 0.6)
      }
    }

    // Crosswalks where sidewalks meet the road
    for (let by = 0; by <= city.blocksY; by++) {
      const band = bandStartY(by)
      for (let bx = 0; bx < city.blocksX; bx++) {
        for (const cx of [blockX(bx), blockX(bx) + CITY_BLOCK - 1]) {
          for (let i = 0; i < CITY_STREET; i++) {
            if (!inBounds(cx, band + i) || this.isWater(cx, band + i)) continue
            this.overlayTile(cx, band + i, 'crosswalk', 0.7)
          }
        }
      }
    }

    // Traffic
    const cars = ['car-taxi', 'car-red', 'car-blue', 'car-taxi']
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (onBlock(x, y) || !inBounds(x, y) || this.isWater(x, y)) continue
        const hit = this.hash(x, y, 91)
        if (hit % 17 !== 0) continue
        this.placeProp(x, y, cars[hit % cars.length]!, false)
      }
    }

    for (let by = 0; by < city.blocksY; by++) {
      for (let bx = 0; bx < city.blocksX; bx++) {
        this.seedCityBlock(city, bx, by, blockX(bx), blockY(by))
      }
    }
  }

  private seedCityBlock(
    city: CitySpec,
    bx: number,
    by: number,
    ox: number,
    oy: number,
  ): void {
    const midX = (city.blocksX - 1) / 2
    const midY = (city.blocksY - 1) / 2
    const dist = Math.abs(bx - midX) + Math.abs(by - midY)

    if (city.tier === 'metro' && dist < 0.25) {
      this.cityPark(ox, oy)
      return
    }

    const pool = (dist <= 1 ? CORE_POOL : MID_POOL)[city.tier]
    const slots: [number, number][] = [
      [0, 0],
      [4, 0],
      [0, 4],
      [4, 4],
    ]

    for (let i = 0; i < slots.length; i++) {
      const [sx, sy] = slots[i]!
      const h = this.hash(ox + sx, oy + sy, i)
      if (h % 13 === 0) {
        this.cityPocket(ox + sx, oy + sy)
        continue
      }
      const spec = TOWER_BY_ID[pool[h % pool.length]!]!
      const offX = spec.w < 3 && h % 2 === 0 ? 1 : 0
      const offY = spec.d < 3 && h % 3 === 0 ? 1 : 0
      this.placeTower(ox + sx + offX, oy + sy + offY, spec)
    }

    this.placeProp(ox - 1, oy - 1, 'lamp', true)
    this.placeProp(ox + CITY_BLOCK, oy + CITY_BLOCK, 'lamp', true)
    const vendor = this.hash(ox, oy, 5)
    if (vendor % 3 === 0) this.placeProp(ox + 3, oy - 1, 'stall', true)
    if (vendor % 4 === 0) this.placeProp(ox - 1, oy + 4, 'barrel', true)
  }

  /** Green square in the middle of the metro grid. */
  private cityPark(ox: number, oy: number): void {
    for (let y = oy; y < oy + CITY_BLOCK; y++) {
      for (let x = ox; x < ox + CITY_BLOCK; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        this.overlayTile(x, y, (x + y) % 3 === 0 ? 'grass2' : 'grass', 0.6)
      }
    }
    for (const [dx, dy] of [
      [1, 1],
      [5, 1],
      [1, 5],
      [5, 5],
      [3, 0],
      [0, 3],
      [6, 3],
    ] as [number, number][]) {
      this.placeTree(ox + dx, oy + dy)
    }
    this.placeProp(ox + 3, oy + 3, 'well', true, 1)
    this.placeProp(ox + 2, oy + 5, 'chair', false)
    this.placeProp(ox + 4, oy + 5, 'chair', false)
    this.placeProp(ox + 3, oy + 6, 'flower', false)
    this.placeProp(ox + 5, oy + 3, 'bush', false)
  }

  /** Small paved plaza where a tower slot is skipped. */
  private cityPocket(ox: number, oy: number): void {
    this.placeProp(ox + 1, oy + 1, 'lamp', true)
    this.placeProp(ox, oy + 2, 'bush', false)
    this.placeProp(ox + 2, oy, 'flower', false)
    this.placeProp(ox + 2, oy + 2, 'chair', false)
  }

  private placeTower(x0: number, y0: number, spec: TowerSpec): void {
    const x1 = x0 + spec.w - 1
    const y1 = y0 + spec.d - 1
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inBounds(x, y) || this.isWater(x, y) || this.hasTree(x, y)) return
        if (this.blockers.has(this.key(x, y))) return
      }
    }

    const s = gridToScreen(x1, y1)
    const spr = this.scene.add.image(s.x, s.y + TILE_H / 2, `tower-${spec.id}`) as PropSprite
    spr.setOrigin(spec.w / (spec.w + spec.d), 1)
    spr.setDepth(depthFor(x1, y1, 7))
    spr.gridX = x1
    spr.gridY = y1
    this.props.push(spr)

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) this.blockers.add(this.key(x, y))
    }
  }

  private hash(a: number, b: number, c: number): number {
    let h =
      Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2246822519)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return (h ^ (h >>> 16)) >>> 0
  }

  private overlayTile(x: number, y: number, tex: string, layer: number): void {
    const s = gridToScreen(x, y)
    this.scene.add
      .image(s.x, s.y, tex)
      .setOrigin(0.5, 0.5)
      .setScale(1.06)
      .setDepth(depthFor(x, y, layer))
  }

  // --- Helpers ---

  private paintPlaza(x0: number, y0: number, x1: number, y1: number): void {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inBounds(x, y) || this.isWater(x, y)) continue
        this.terrain[y]![x] = 'plaza'
        const s = gridToScreen(x, y)
        this.scene.add
          .image(s.x, s.y, 'plaza')
          .setOrigin(0.5, 0.5)
          .setScale(1.06)
          .setDepth(depthFor(x, y, 0.5))
      }
    }
  }

  private fenceRect(x0: number, y0: number, x1: number, y1: number): void {
    for (let x = x0; x <= x1; x++) {
      this.placeProp(x, y0, 'fence', true)
      this.placeProp(x, y1, 'fence', true)
    }
    for (let y = y0 + 1; y < y1; y++) {
      this.placeProp(x0, y, 'fence', true)
      this.placeProp(x1, y, 'fence', true)
    }
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
