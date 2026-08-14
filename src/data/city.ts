export type TowerStory = { hpx: number; inset: number }

export type TowerSpec = {
  id: string
  /** Footprint in tiles along the +x axis. */
  w: number
  /** Footprint in tiles along the +y axis. */
  d: number
  /** Main shaft height in pixels. */
  hpx: number
  wall: number
  wallShade: number
  roof: number
  glass: number
  glassLit: number
  /** Stacked setbacks, drawn bottom to top. */
  stories?: TowerStory[]
  antenna?: number
  waterTower?: boolean
  /** Window columns per tile of facade. */
  cols?: number
  /** Vertical spacing between window rows. */
  rowH?: number
  band?: number
}

export const TOWERS: TowerSpec[] = [
  {
    id: 'skyGlass',
    w: 3,
    d: 3,
    hpx: 420,
    wall: 0x4f7f9c,
    wallShade: 0x3c6480,
    roof: 0x2f4f66,
    glass: 0x9fe0f0,
    glassLit: 0xfff0b0,
    cols: 3,
    rowH: 20,
    antenna: 34,
  },
  {
    id: 'skySteel',
    w: 3,
    d: 3,
    hpx: 370,
    wall: 0x4a5560,
    wallShade: 0x38424c,
    roof: 0x2c343c,
    glass: 0x8fd0e8,
    glassLit: 0xffe9a8,
    cols: 3,
    rowH: 22,
    stories: [{ hpx: 62, inset: 0.4 }],
    antenna: 44,
  },
  {
    id: 'skyDeco',
    w: 3,
    d: 3,
    hpx: 300,
    wall: 0xd8cdb8,
    wallShade: 0xbfb49f,
    roof: 0xa89c86,
    glass: 0x3d5a70,
    glassLit: 0xf4d98a,
    cols: 2,
    rowH: 24,
    band: 0xb9a37c,
    stories: [
      { hpx: 74, inset: 0.5 },
      { hpx: 52, inset: 0.45 },
    ],
    antenna: 56,
  },
  {
    id: 'skyTwin',
    w: 2,
    d: 3,
    hpx: 340,
    wall: 0x6d7f92,
    wallShade: 0x55677a,
    roof: 0x3f505f,
    glass: 0xaddcf0,
    glassLit: 0xffeeb4,
    cols: 3,
    rowH: 20,
    antenna: 26,
  },
  {
    id: 'towerGlass',
    w: 3,
    d: 2,
    hpx: 210,
    wall: 0x3f8f88,
    wallShade: 0x2f6f6a,
    roof: 0x275a56,
    glass: 0xaee8e0,
    glassLit: 0xffeeb0,
    cols: 3,
    rowH: 20,
  },
  {
    id: 'towerBrick',
    w: 3,
    d: 3,
    hpx: 150,
    wall: 0xa85c48,
    wallShade: 0x8a4636,
    roof: 0x6b3a2c,
    glass: 0x2f4a5c,
    glassLit: 0xf6d68a,
    cols: 2,
    rowH: 24,
    waterTower: true,
  },
  {
    id: 'towerTan',
    w: 2,
    d: 2,
    hpx: 176,
    wall: 0xd0b48a,
    wallShade: 0xb0956f,
    roof: 0x8f7a5a,
    glass: 0x3a5568,
    glassLit: 0xf6d68a,
    cols: 2,
    rowH: 22,
  },
  {
    id: 'blockOffice',
    w: 3,
    d: 3,
    hpx: 112,
    wall: 0xb9bcbb,
    wallShade: 0x9ba0a0,
    roof: 0x7f8586,
    glass: 0x46697d,
    glassLit: 0xf2dd9c,
    cols: 3,
    rowH: 22,
  },
  {
    id: 'midBrown',
    w: 3,
    d: 2,
    hpx: 92,
    wall: 0x8f5a3c,
    wallShade: 0x74472e,
    roof: 0x5b3826,
    glass: 0x33505f,
    glassLit: 0xf6d68a,
    cols: 2,
    rowH: 22,
    waterTower: true,
  },
  {
    id: 'midRed',
    w: 2,
    d: 2,
    hpx: 76,
    wall: 0xa4483c,
    wallShade: 0x84362c,
    roof: 0x6a2b22,
    glass: 0x2f4a5c,
    glassLit: 0xf6d68a,
    cols: 2,
    rowH: 20,
    waterTower: true,
  },
  {
    id: 'lowShop',
    w: 2,
    d: 2,
    hpx: 50,
    wall: 0xc9c2b4,
    wallShade: 0xaaa496,
    roof: 0x8b8578,
    glass: 0x5b86a0,
    glassLit: 0xffe9b0,
    cols: 2,
    rowH: 18,
    band: 0xc04a48,
  },
]

export const TOWER_BY_ID: Record<string, TowerSpec> = Object.fromEntries(
  TOWERS.map((t) => [t.id, t]),
)

export type CityTier = 'metro' | 'city' | 'town'

export type CitySpec = {
  name: string
  ox: number
  oy: number
  blocksX: number
  blocksY: number
  tier: CityTier
}

/** Downtown cores get the tallest stock; outer blocks step down. */
export const CORE_POOL: Record<CityTier, string[]> = {
  metro: ['skyDeco', 'skySteel', 'skyGlass', 'skyTwin'],
  city: ['skyGlass', 'skyTwin', 'towerGlass', 'towerTan'],
  town: ['towerBrick', 'towerTan', 'midBrown'],
}

export const MID_POOL: Record<CityTier, string[]> = {
  metro: ['towerGlass', 'skyTwin', 'towerBrick', 'blockOffice', 'towerTan'],
  city: ['towerBrick', 'blockOffice', 'towerTan', 'midBrown'],
  town: ['midBrown', 'midRed', 'lowShop'],
}

export const CITIES: CitySpec[] = [
  { name: 'Emulite City', ox: 6, oy: 6, blocksX: 3, blocksY: 3, tier: 'metro' },
  { name: 'Northport', ox: 96, oy: 6, blocksX: 3, blocksY: 2, tier: 'city' },
  { name: 'Southbay', ox: 106, oy: 104, blocksX: 3, blocksY: 3, tier: 'city' },
  { name: 'Westend', ox: 6, oy: 104, blocksX: 2, blocksY: 2, tier: 'town' },
]

export const CITY_BLOCK = 7
export const CITY_STREET = 3
export const CITY_MARGIN = 3

export function citySize(city: CitySpec): { w: number; h: number } {
  return {
    w: CITY_MARGIN * 2 + city.blocksX * CITY_BLOCK + (city.blocksX - 1) * CITY_STREET,
    h: CITY_MARGIN * 2 + city.blocksY * CITY_BLOCK + (city.blocksY - 1) * CITY_STREET,
  }
}
