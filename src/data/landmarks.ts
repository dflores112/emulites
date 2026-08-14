import { CITIES, citySize } from './city'

export type Landmark = {
  id: string
  label: string
  /** Preferred arrival tile; the scene snaps to the nearest walkable neighbour. */
  gx: number
  gy: number
}

const CAPITAL: Landmark = { id: 'capital', label: 'Capital', gx: 74, gy: 76 }

/** Park arrivals sit on the midway just inside each gate. */
const PARKS: Landmark[] = [
  { id: 'thrill-city', label: 'Thrill City (coasters)', gx: 164, gy: 42 },
  { id: 'splash-bay', label: 'Splash Bay (water park)', gx: 164, gy: 173 },
]

const CITY_LANDMARKS: Landmark[] = CITIES.map((city) => {
  const size = citySize(city)
  return {
    id: city.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    label: city.name,
    gx: Math.floor(city.ox + size.w / 2),
    gy: Math.floor(city.oy + size.h / 2),
  }
})

export const LANDMARKS: Landmark[] = [CAPITAL, ...CITY_LANDMARKS, ...PARKS]
