export type OutfitId =
  | 'azure'
  | 'crimson'
  | 'moss'
  | 'violet'
  | 'sunset'
  | 'midnight'
  | 'honey'
  | 'rose'
  | 'frost'
  | 'ember'
  | 'royal'
  | 'sage'

export type HatId =
  | 'none'
  | 'cap'
  | 'beanie'
  | 'top'
  | 'crown'
  | 'wizard'
  | 'flower'
  | 'bandana'

export type Outfit = {
  id: OutfitId
  name: string
  /** Recolor for the blue body pixels on the base sprite */
  body: number
  accent: number
  detail: number
  hat: HatId
  hatColor?: number
  hatAccent?: number
}

/** Base art body color from the Emulite person sprite (~#548DA1). */
export const BASE_BODY_RGB = { r: 84, g: 141, b: 161 }

/** Extra pixels above the base sprite so tall hats fit. */
export const HAT_PAD = 4

export const OUTFITS: Outfit[] = [
  {
    id: 'azure',
    name: 'Denim Fit',
    body: 0x548da1,
    accent: 0x3a6578,
    detail: 0xf5d56e,
    hat: 'none',
  },
  {
    id: 'crimson',
    name: 'Crimson Fit',
    body: 0xc44b4b,
    accent: 0x8b2e2e,
    detail: 0xf5d56e,
    hat: 'none',
  },
  {
    id: 'moss',
    name: 'Moss Fit',
    body: 0x4a9a5c,
    accent: 0x2d5f38,
    detail: 0xf5d56e,
    hat: 'none',
  },
  {
    id: 'violet',
    name: 'Violet Fit',
    body: 0x7a4fcf,
    accent: 0x4a2e8a,
    detail: 0xf5d56e,
    hat: 'none',
  },
  {
    id: 'sunset',
    name: 'Sunset Cap',
    body: 0xd4683a,
    accent: 0x9a3e22,
    detail: 0xf5d56e,
    hat: 'cap',
    hatColor: 0xe8a038,
    hatAccent: 0xc87820,
  },
  {
    id: 'midnight',
    name: 'Midnight Top',
    body: 0x2a3a58,
    accent: 0x1a2438,
    detail: 0xf5d56e,
    hat: 'top',
    hatColor: 0x1a1a22,
    hatAccent: 0x3a3a48,
  },
  {
    id: 'honey',
    name: 'Honey Beanie',
    body: 0xd4a04a,
    accent: 0xa87830,
    detail: 0xf5d56e,
    hat: 'beanie',
    hatColor: 0xe87070,
    hatAccent: 0xc05050,
  },
  {
    id: 'rose',
    name: 'Rose Bloom',
    body: 0xd06090,
    accent: 0xa04068,
    detail: 0xf5d56e,
    hat: 'flower',
    hatColor: 0xe84870,
    hatAccent: 0xf0d050,
  },
  {
    id: 'frost',
    name: 'Frost Beanie',
    body: 0x6ab0c8,
    accent: 0x3a7088,
    detail: 0xf5d56e,
    hat: 'beanie',
    hatColor: 0xe8f0f8,
    hatAccent: 0xa8c0d8,
  },
  {
    id: 'ember',
    name: 'Ember Bandana',
    body: 0xb03828,
    accent: 0x702018,
    detail: 0xf5d56e,
    hat: 'bandana',
    hatColor: 0xe05030,
    hatAccent: 0xf0c040,
  },
  {
    id: 'royal',
    name: 'Royal Crown',
    body: 0x4a60b0,
    accent: 0x2a3878,
    detail: 0xf5d56e,
    hat: 'crown',
    hatColor: 0xe8c040,
    hatAccent: 0xe84870,
  },
  {
    id: 'sage',
    name: 'Sage Wizard',
    body: 0x3a7858,
    accent: 0x245038,
    detail: 0xf5d56e,
    hat: 'wizard',
    hatColor: 0x4a3a78,
    hatAccent: 0xe8c040,
  },
]

export function getOutfit(id: OutfitId | string): Outfit {
  return OUTFITS.find((o) => o.id === id) ?? OUTFITS[0]!
}

export function isOutfitId(id: string): id is OutfitId {
  return OUTFITS.some((o) => o.id === id)
}
