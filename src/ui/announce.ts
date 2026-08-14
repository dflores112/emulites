import { ABOUT, ANNOUNCE_TEXT, EMULITE_CONTRACT } from '../data/site'

export function mountAnnounceChrome(): () => void {
  const bannerHost = document.getElementById('announce-banner')
  const aboutHost = document.getElementById('about-ui')
  if (!bannerHost || !aboutHost) return () => undefined

  bannerHost.innerHTML = `
    <button type="button" class="announce-btn" id="announce-open">
      <span class="announce-label">${escapeHtml(ANNOUNCE_TEXT)}</span>
      <span class="announce-cta">About →</span>
    </button>
  `
  bannerHost.hidden = false
  document.documentElement.style.setProperty('--announce-h', '40px')

  aboutHost.innerHTML = `
    <div class="about-panel" role="dialog" aria-labelledby="about-title">
      <p class="brand" id="about-title">${escapeHtml(ABOUT.title)}</p>
      <p class="about-chain">${escapeHtml(ABOUT.chainNote)}</p>
      <p class="about-lead">${escapeHtml(ABOUT.lead)}</p>
      <p class="about-body">${escapeHtml(ABOUT.body)}</p>

      <div class="contract-block">
        <p class="section-label">${escapeHtml(ABOUT.contractLabel)}</p>
        <div class="contract-row">
          <code class="contract-addr" id="contract-addr" title="${escapeHtml(EMULITE_CONTRACT)}">${escapeHtml(EMULITE_CONTRACT)}</code>
          <button type="button" class="btn primary" id="contract-copy">Copy</button>
        </div>
        <p class="contract-hint" id="contract-hint" aria-live="polite"></p>
      </div>

      <div class="actions">
        <button type="button" class="btn" id="about-close">Back</button>
      </div>
    </div>
  `
  aboutHost.classList.add('hidden')
  aboutHost.setAttribute('aria-hidden', 'true')

  const openBtn = bannerHost.querySelector('#announce-open') as HTMLButtonElement
  const closeBtn = aboutHost.querySelector('#about-close') as HTMLButtonElement
  const copyBtn = aboutHost.querySelector('#contract-copy') as HTMLButtonElement
  const hint = aboutHost.querySelector('#contract-hint') as HTMLElement

  const openAbout = () => {
    aboutHost.classList.remove('hidden')
    aboutHost.setAttribute('aria-hidden', 'false')
    closeBtn.focus()
  }

  const closeAbout = () => {
    aboutHost.classList.add('hidden')
    aboutHost.setAttribute('aria-hidden', 'true')
    hint.textContent = ''
    openBtn.focus()
  }

  openBtn.addEventListener('click', openAbout)
  closeBtn.addEventListener('click', closeAbout)
  aboutHost.addEventListener('click', (e) => {
    if (e.target === aboutHost) closeAbout()
  })

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !aboutHost.classList.contains('hidden')) {
      e.preventDefault()
      closeAbout()
    }
  }
  window.addEventListener('keydown', onKey)

  copyBtn.addEventListener('click', async () => {
    const ok = await copyText(EMULITE_CONTRACT)
    hint.textContent = ok ? 'Copied to clipboard.' : 'Select the address and copy manually.'
    if (ok) {
      copyBtn.textContent = 'Copied'
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy'
      }, 1600)
    }
  })

  return () => {
    window.removeEventListener('keydown', onKey)
    bannerHost.innerHTML = ''
    bannerHost.hidden = true
    aboutHost.innerHTML = ''
    aboutHost.classList.add('hidden')
    document.documentElement.style.removeProperty('--announce-h')
  }
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
