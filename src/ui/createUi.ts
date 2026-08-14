import type { OutfitId } from '../data/outfits'
import { OUTFITS } from '../data/outfits'
import { clearSave, hasSave, loadSave } from '../systems/SaveSystem'

export type CreateResult = {
  name: string
  outfitId: OutfitId
  continueSave: boolean
}

export function mountCreateUI(
  root: HTMLElement,
  onStart: (result: CreateResult) => void,
  previews: Partial<Record<OutfitId, string>> = {},
): () => void {
  const existing = loadSave()
  let selected: OutfitId = existing?.outfitId ?? 'azure'
  let name = existing?.name ?? ''

  root.innerHTML = `
    <div class="create-panel">
      <p class="brand">Emulites</p>
      <p class="tagline">Build your little isometric world — built on Solana.</p>
      <p class="chain-badge">Solana</p>
      <label class="field">
        <span>Name</span>
        <input id="emu-name" type="text" maxlength="16" placeholder="Your Emulite" autocomplete="off" />
      </label>
      <p class="section-label">Outfit</p>
      <div class="outfit-grid" id="outfit-grid"></div>
      <div class="actions">
        <button type="button" class="btn primary" id="btn-start">Enter World</button>
        ${hasSave() ? '<button type="button" class="btn" id="btn-continue">Continue</button>' : ''}
        ${hasSave() ? '<button type="button" class="btn ghost" id="btn-new">New Game</button>' : ''}
      </div>
      <p class="hint" id="create-hint"></p>
    </div>
  `

  root.classList.remove('hidden')
  root.setAttribute('aria-hidden', 'false')

  const nameInput = root.querySelector('#emu-name') as HTMLInputElement
  nameInput.value = name

  const grid = root.querySelector('#outfit-grid') as HTMLElement
  for (const o of OUTFITS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = `outfit-card${o.id === selected ? ' selected' : ''}`
    btn.dataset.id = o.id
    const preview = previews[o.id]
    btn.innerHTML = preview
      ? `<img class="outfit-preview" src="${preview}" alt="" width="44" height="64" />
         <span class="outfit-name">${o.name}</span>`
      : `<span class="swatch" style="--c:${toCss(o.body)};--a:${toCss(o.accent)}"></span>
         <span class="outfit-name">${o.name}</span>`
    btn.addEventListener('click', () => {
      selected = o.id
      grid.querySelectorAll('.outfit-card').forEach((el) => el.classList.remove('selected'))
      btn.classList.add('selected')
    })
    grid.appendChild(btn)
  }

  const hint = root.querySelector('#create-hint') as HTMLElement

  const start = root.querySelector('#btn-start') as HTMLButtonElement
  start.addEventListener('click', () => {
    const n = nameInput.value.trim()
    if (!n) {
      hint.textContent = 'Pick a name first.'
      nameInput.focus()
      return
    }
    // Fresh character — only clear when explicitly starting new
    clearSave()
    onStart({ name: n.slice(0, 16), outfitId: selected, continueSave: false })
  })

  // Prefer Continue as the main action when a save exists
  if (hasSave()) {
    start.textContent = 'New World'
    start.classList.remove('primary')
    const contBtn = root.querySelector('#btn-continue') as HTMLButtonElement | null
    contBtn?.classList.add('primary')
  }

  const cont = root.querySelector('#btn-continue')
  cont?.addEventListener('click', () => {
    if (!existing) return
    onStart({
      name: existing.name,
      outfitId: existing.outfitId,
      continueSave: true,
    })
  })

  const neu = root.querySelector('#btn-new')
  neu?.addEventListener('click', () => {
    clearSave()
    nameInput.value = ''
    hint.textContent = 'Save cleared. Create a new Emulite.'
  })

  return () => {
    root.innerHTML = ''
    root.classList.add('hidden')
    root.setAttribute('aria-hidden', 'true')
  }
}

function toCss(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`
}
