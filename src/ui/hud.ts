import { CATALOG, type ItemId } from '../data/catalog'
import type { HotbarIcons } from './hotbarIcons'

const SCROLL_STEP = 180

export function mountHud(
  root: HTMLElement,
  opts: {
    name: string
    selected: ItemId
    dragMode?: boolean
    icons?: HotbarIcons
    onSelect: (id: ItemId) => void
    onDragMode: (on: boolean) => void
    onNewGame?: () => void
  },
): {
  setSelected: (id: ItemId) => void
  setDragMode: (on: boolean) => void
  destroy: () => void
} {
  root.innerHTML = `
    <div class="hud-top">
      <span class="hud-brand">Emulites</span>
      <span class="hud-name">${escapeHtml(opts.name)}</span>
    </div>
    ${opts.onNewGame ? '<button type="button" class="hud-new" id="hud-new">New Game</button>' : ''}
    <div class="hotbar-wrap" id="hotbar-wrap">
      <button type="button" class="hotbar-nav hotbar-nav-left" id="hotbar-left" aria-label="Scroll hotbar left">‹</button>
      <div class="hotbar" id="hotbar"></div>
      <button type="button" class="hotbar-nav hotbar-nav-right" id="hotbar-right" aria-label="Scroll hotbar right">›</button>
    </div>
    <p class="hud-help">WASD move · scroll zoom · C center · build keys on icons · Drag / H to pan · click place · right-click remove</p>
  `
  root.classList.remove('hidden')
  root.setAttribute('aria-hidden', 'false')

  const newBtn = root.querySelector('#hud-new') as HTMLButtonElement | null
  newBtn?.addEventListener('click', () => {
    if (confirm('Start a new world? Your current save will be erased.')) {
      opts.onNewGame?.()
    }
  })
  const hotbar = root.querySelector('#hotbar') as HTMLElement
  const leftBtn = root.querySelector('#hotbar-left') as HTMLButtonElement
  const rightBtn = root.querySelector('#hotbar-right') as HTMLButtonElement
  let selected = opts.selected
  let dragMode = opts.dragMode ?? false
  const icons = opts.icons ?? {}

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
        render()
      })
      hotbar.appendChild(btn)
    }

    const dragBtn = document.createElement('button')
    dragBtn.type = 'button'
    dragBtn.dataset.id = 'drag'
    dragBtn.className = `hotbar-item hotbar-drag${dragMode ? ' selected' : ''}`
    dragBtn.title = 'Enable drag mode to pan the map'
    dragBtn.innerHTML = `
      ${iconHtml(icons.drag, '✋')}
      <span class="hotbar-meta">
        <kbd>H</kbd>
        <span class="hotbar-label">Drag</span>
      </span>
    `
    dragBtn.addEventListener('click', () => {
      dragMode = !dragMode
      opts.onDragMode(dragMode)
      render()
    })
    hotbar.appendChild(dragBtn)

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
      render()
    },
    setDragMode(on: boolean) {
      dragMode = on
      render()
    },
    destroy() {
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
