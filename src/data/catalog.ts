export type ItemId =
  | 'floor'
  | 'path'
  | 'plaza'
  | 'wall'
  | 'door'
  | 'table'
  | 'chair'
  | 'bed'
  | 'chest'
  | 'barrel'
  | 'lamp'
  | 'fence'
  | 'crop'
  | 'bush'
  | 'tree'
  | 'flower'
  | 'rock'
  | 'well'
  | 'stall'

export type CatalogItem = {
  id: ItemId
  label: string
  blocks: boolean
  layer: 'floor' | 'object'
  hotkey: string
}

export const CATALOG: CatalogItem[] = [
  { id: 'floor', label: 'Floor', blocks: false, layer: 'floor', hotkey: '1' },
  { id: 'path', label: 'Path', blocks: false, layer: 'floor', hotkey: '2' },
  { id: 'plaza', label: 'Plaza', blocks: false, layer: 'floor', hotkey: '3' },
  { id: 'wall', label: 'Wall', blocks: true, layer: 'object', hotkey: '4' },
  { id: 'door', label: 'Door', blocks: false, layer: 'object', hotkey: '5' },
  { id: 'table', label: 'Table', blocks: true, layer: 'object', hotkey: '6' },
  { id: 'chair', label: 'Chair', blocks: false, layer: 'object', hotkey: '7' },
  { id: 'bed', label: 'Bed', blocks: true, layer: 'object', hotkey: '8' },
  { id: 'chest', label: 'Chest', blocks: true, layer: 'object', hotkey: '9' },
  { id: 'barrel', label: 'Barrel', blocks: true, layer: 'object', hotkey: '0' },
  { id: 'lamp', label: 'Lamp', blocks: false, layer: 'object', hotkey: 'Q' },
  { id: 'fence', label: 'Fence', blocks: true, layer: 'object', hotkey: 'E' },
  { id: 'crop', label: 'Crop', blocks: false, layer: 'floor', hotkey: 'R' },
  { id: 'bush', label: 'Bush', blocks: false, layer: 'object', hotkey: 'T' },
  { id: 'tree', label: 'Tree', blocks: true, layer: 'object', hotkey: 'Y' },
  { id: 'flower', label: 'Flower', blocks: false, layer: 'object', hotkey: 'U' },
  { id: 'rock', label: 'Rock', blocks: true, layer: 'object', hotkey: 'I' },
  { id: 'well', label: 'Well', blocks: true, layer: 'object', hotkey: 'O' },
  { id: 'stall', label: 'Stall', blocks: true, layer: 'object', hotkey: 'P' },
]

export function getCatalogItem(id: ItemId): CatalogItem {
  return CATALOG.find((i) => i.id === id) ?? CATALOG[0]!
}

export function isCatalogId(id: string): id is ItemId {
  return CATALOG.some((i) => i.id === id)
}
