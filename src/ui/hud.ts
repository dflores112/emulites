import { CATALOG, type ItemId } from '../data/catalog'
import type { Landmark } from '../data/landmarks'
import type { HotbarIcons } from './hotbarIcons'

const SCROLL_STEP = 180

export type PadDir = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
}

export function mountHud(
  root: HTMLElement,
  opts: {
    name: string
    selected: ItemId
    dragMode?: boolean
    icons?: HotbarIcons
    landmarks?: Landmark[]
    onSelect: (id: ItemId) => void
    onDragMode: (on: boolean) => void
    onTravel?: (mark: Landmark) => void
    onFindMe?: () => void
    onNewGame?: () => void
  },
): {
  setSelected: (id: ItemId) => void
  setDragMode: (on: boolean) => void
  getPad: () => PadDir
  toggleTravel: () => void
  destroy: () => void
} {
  const pad: PadDir = { left: false, right: false, up: false, down: false }
  const landmarks = opts.landmarks ?? []

  const travelHtml = landmarks.length
    ? `<div class="travel">
        <div class="travel-menu hidden" id="travel-menu" role="menu" aria-hidden="true">
          <p class="travel-title">Fast travel</p>
          ${landmarks
            .map(
              (m) =>
                `<button type="button" class="travel-item" role="menuitem" data-mark="${escapeHtml(m.id)}">${escapeHtml(m.label)}</button>`,
            )
            .join('')}
        </div>
        <button type="button" class="dpad-grab" id="travel-btn" aria-haspopup="menu" aria-expanded="false" title="Fast travel to a city or park (M)">
          <span class="dpad-grab-icon" aria-hidden="true">🧭</span>
          Travel
        </button>
      </div>`
    : ''

  root.innerHTML = `
    <div class="hud-top">
      <span class="hud-brand">Emulites</span>
      <span class="hud-name">${escapeHtml(opts.name)}</span>
    </div>
    ${opts.onNewGame ? '<button type="button" class="hud-new" id="hud-new">New Game</button>' : ''}
    <div class="controls-br">
      ${
        opts.onFindMe
          ? `<button type="button" class="dpad-grab" id="find-me" title="Snap the camera back to ${escapeHtml(opts.name)} (C)">
        <span class="dpad-grab-icon" aria-hidden="true">📍</span>
        Find me
      </button>`
          : ''
      }
      ${travelHtml}
      <button type="button" class="dpad-grab${(opts.dragMode ?? true) ? ' active' : ''}" id="dpad-grab" aria-label="Grab to pan" title="Pan map (default). Hotbar to place. H / Esc to return.">
        <span class="dpad-grab-icon" aria-hidden="true">✊</span>
        Grab
      </button>
      <div class="dpad" id="dpad" aria-label="Move">
        <button type="button" class="dpad-btn dpad-up" data-dir="up" aria-label="Up">▲</button>
        <button type="button" class="dpad-btn dpad-left" data-dir="left" aria-label="Left">◀</button>
        <button type="button" class="dpad-btn dpad-right" data-dir="right" aria-label="Right">▶</button>
        <button type="button" class="dpad-btn dpad-down" data-dir="down" aria-label="Down">▼</button>
        <span class="dpad-center" aria-hidden="true"></span>
      </div>
    </div>
    <div class="hotbar-wrap" id="hotbar-wrap">
      <button type="button" class="hotbar-nav hotbar-nav-left" id="hotbar-left" aria-label="Scroll hotbar left">‹</button>
      <div class="hotbar" id="hotbar"></div>
      <button type="button" class="hotbar-nav hotbar-nav-right" id="hotbar-right" aria-label="Scroll hotbar right">›</button>
    </div>
    <p class="hud-help">Drag to pan · WASD / arrows move · scroll zoom · C find me · M travel · hotbar / keys to place · Grab / H / Esc back to pan · right-click remove</p>
  `
  root.classList.remove('hidden')
  root.setAttribute('aria-hidden', 'false')

  const newBtn = root.querySelector('#hud-new') as HTMLButtonElement | null
  newBtn?.addEventListener('click', () => {
    if (confirm('Start a new world? Your current save will be erased.')) {
      opts.onNewGame?.()
    }
  })

  const dpad = root.querySelector('#dpad') as HTMLElement
  const setDir = (dir: keyof PadDir, on: boolean) => {
    pad[dir] = on
  }
  const clearPad = () => {
    pad.left = pad.right = pad.up = pad.down = false
    dpad.querySelectorAll('.dpad-btn').forEach((el) => el.classList.remove('active'))
  }

  dpad.querySelectorAll('.dpad-btn').forEach((btn) => {
    const el = btn as HTMLButtonElement
    const dir = el.dataset.dir as keyof PadDir
    const press = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      setDir(dir, true)
      el.classList.add('active')
    }
    const release = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      setDir(dir, false)
      el.classList.remove('active')
    }
    el.addEventListener('pointerdown', (e) => {
      press(e)
      el.setPointerCapture((e as PointerEvent).pointerId)
    })
    el.addEventListener('pointerup', release)
    el.addEventListener('pointercancel', release)
    el.addEventListener('lostpointercapture', () => {
      setDir(dir, false)
      el.classList.remove('active')
    })
    el.addEventListener('contextmenu', (e) => e.preventDefault())
  })
  window.addEventListener('blur', clearPad)

  const hotbar = root.querySelector('#hotbar') as HTMLElement
  const leftBtn = root.querySelector('#hotbar-left') as HTMLButtonElement
  const rightBtn = root.querySelector('#hotbar-right') as HTMLButtonElement
  const grabBtn = root.querySelector('#dpad-grab') as HTMLButtonElement
  let selected = opts.selected
  let dragMode = opts.dragMode ?? true
  const icons = opts.icons ?? {}

  const syncGrab = () => {
    grabBtn.classList.toggle('active', dragMode)
  }
  grabBtn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    // Grab is the default camera mode — never toggle into place mode from here
    dragMode = true
    opts.onDragMode(true)
    syncGrab()
    render()
  })
  grabBtn.addEventListener('contextmenu', (e) => e.preventDefault())
  syncGrab()

  const findBtn = root.querySelector('#find-me') as HTMLButtonElement | null
  findBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    opts.onFindMe?.()
  })

  const travelBtn = root.querySelector('#travel-btn') as HTMLButtonElement | null
  const travelMenu = root.querySelector('#travel-menu') as HTMLElement | null
  const setTravelOpen = (open: boolean) => {
    if (!travelBtn || !travelMenu) return
    travelMenu.classList.toggle('hidden', !open)
    travelMenu.setAttribute('aria-hidden', open ? 'false' : 'true')
    travelBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
    travelBtn.classList.toggle('active', open)
  }
  const toggleTravel = () => {
    setTravelOpen(travelMenu?.classList.contains('hidden') ?? false)
  }
  travelBtn?.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggleTravel()
  })
  travelMenu?.querySelectorAll('.travel-item').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const id = (el as HTMLElement).dataset.mark
      const mark = landmarks.find((m) => m.id === id)
      if (mark) opts.onTravel?.(mark)
      setTravelOpen(false)
    })
  })
  const closeTravelOnOutside = (e: MouseEvent) => {
    if (!travelMenu || travelMenu.classList.contains('hidden')) return
    const target = e.target as Node
    if (travelMenu.contains(target) || travelBtn?.contains(target)) return
    setTravelOpen(false)
  }
  const closeTravelOnEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setTravelOpen(false)
  }
  document.addEventListener('pointerdown', closeTravelOnOutside)
  window.addEventListener('keydown', closeTravelOnEsc)

  const iconHtml = (src: string | undefined, fallback: string) =>
    src
      ? `<span class="hotbar-icon"><img src="${src}" alt="" draggable="false" /></span>`
      : `<span class="hotbar-icon hotbar-icon-fallback">${fallback}</span>`

  const updateNav = () => {
    const max = hotbar.scrollWidth - hotbar.clientWidth
    leftBtn.disabled = hotbar.scrollLeft <= 2
    rightBtn.disabled = hotbar.scrollLeft >= max - 2
  }

  const render = () => {
    hotbar.innerHTML = ''
    for (const item of CATALOG) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.dataset.id = item.id
      btn.className = `hotbar-item${!dragMode && item.id === selected ? ' selected' : ''}`
      btn.innerHTML = `
        ${iconHtml(icons[item.id], item.label[0] ?? '?')}
        <span class="hotbar-meta">
          <kbd>${item.hotkey}</kbd>
          <span class="hotbar-label">${item.label}</span>
        </span>
      `
      btn.addEventListener('click', () => {
        dragMode = false
        selected = item.id
        opts.onDragMode(false)
        opts.onSelect(item.id)
        syncGrab()
        render()
      })
      hotbar.appendChild(btn)
    }

    const active = hotbar.querySelector('.hotbar-item.selected') as HTMLElement | null
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
    requestAnimationFrame(updateNav)
  }
  render()

  leftBtn.addEventListener('click', () => {
    hotbar.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' })
  })
  rightBtn.addEventListener('click', () => {
    hotbar.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' })
  })
  hotbar.addEventListener('scroll', updateNav, { passive: true })

  hotbar.addEventListener(
    'wheel',
    (e) => {
      e.stopPropagation()
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        hotbar.scrollLeft += e.deltaY
        e.preventDefault()
      }
      updateNav()
    },
    { passive: false },
  )

  return {
    setSelected(id: ItemId) {
      selected = id
      dragMode = false
      opts.onDragMode(false)
      syncGrab()
      render()
    },
    setDragMode(on: boolean) {
      dragMode = on
      syncGrab()
      render()
    },
    getPad() {
      return { ...pad }
    },
    toggleTravel,
    destroy() {
      window.removeEventListener('blur', clearPad)
      document.removeEventListener('pointerdown', closeTravelOnOutside)
      window.removeEventListener('keydown', closeTravelOnEsc)
      clearPad()
      root.innerHTML = ''
      root.classList.add('hidden')
      root.setAttribute('aria-hidden', 'true')
    },
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
