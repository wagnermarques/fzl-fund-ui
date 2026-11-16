// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import './config-privacy-view.js'

function memoryStorage() {
  const data = {}
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
    data,
  }
}

describe('ConfigPrivacyView (<config-privacy-view>)', () => {
  /** @type {HTMLElement} */
  let el

  beforeEach(async () => {
    vi.stubGlobal('localStorage', memoryStorage())
    el = document.createElement('config-privacy-view')
    document.body.appendChild(el)
    await el.updateComplete
  })

  afterEach(() => {
    el?.remove()
    vi.unstubAllGlobals()
  })

  it('exibe declaração de cookies/armazenamento local e transparência de escopos OAuth2 incluindo drive.file', () => {
    const text = el.shadowRoot.textContent
    expect(text).toContain('Declaração de Cookies e Armazenamento Local')
    expect(text).toContain('Permissões OAuth2 e Acesso à Nuvem Pessoal')
    expect(text).toContain('https://www.googleapis.com/auth/drive.file')
    expect(text).toContain('openid profile email')
    expect(text).toContain('Sem acesso ao restante do Drive')
  })
})
