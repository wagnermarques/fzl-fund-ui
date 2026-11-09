import { describe, expect, it, vi } from 'vitest'
import { createOrganizationService, applyOrganizationTheme } from './organization-service.js'
import { DEFAULT_MOCK_ORGANIZATION } from '../app-config.js'

function createMockStorage(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((k) => store.get(k) ?? null),
    setItem: vi.fn((k, v) => store.set(k, String(v))),
    removeItem: vi.fn((k) => store.delete(k)),
    clear: vi.fn(() => store.clear()),
    _store: store,
  }
}

function createMockRoot() {
  const properties = new Map()
  return {
    style: {
      setProperty: vi.fn((prop, val) => properties.set(prop, val)),
      removeProperty: vi.fn((prop) => properties.delete(prop)),
      _properties: properties,
    },
  }
}

describe('organization-service', () => {
  it('inicializa desabilitado quando initialConfig é null ou false', () => {
    const service = createOrganizationService({ initialConfig: null })
    expect(service.isConfigured()).toBe(false)
    expect(service.getConfig()).toBeNull()

    const serviceFalse = createOrganizationService({ initialConfig: false })
    expect(serviceFalse.isConfigured()).toBe(false)
  })

  it('inicializa com mock padrão quando initialConfig é true', () => {
    const service = createOrganizationService({ initialConfig: true })
    expect(service.isConfigured()).toBe(true)
    expect(service.getConfig().name).toBe(DEFAULT_MOCK_ORGANIZATION.name)
    expect(service.getConfig().primaryColor).toBe(DEFAULT_MOCK_ORGANIZATION.primaryColor)
  })

  it('aplica variáveis de cor ao root quando configurado', () => {
    const root = createMockRoot()
    const service = createOrganizationService({
      initialConfig: { enabled: true, name: 'Org Teste', primaryColor: '#0284c7' },
      root,
    })
    service.apply()
    expect(root.style.setProperty).toHaveBeenCalledWith('--md-sys-color-primary', '#0284c7')
    expect(root.style.setProperty).toHaveBeenCalledWith('--fzl-color-primary', '#0284c7')

    service.use(false)
    expect(root.style.removeProperty).toHaveBeenCalledWith('--md-sys-color-primary')
    expect(root.style.removeProperty).toHaveBeenCalledWith('--fzl-color-primary')
  })

  it('restaura configuração prévia do storage', () => {
    const storage = createMockStorage({
      'test:org': JSON.stringify({ name: 'Nome Salvo', primaryColor: '#10b981' }),
    })
    const service = createOrganizationService({
      initialConfig: { enabled: true, name: 'Padrao' },
      key: 'test:org',
      storage,
    })
    expect(service.getConfig().name).toBe('Nome Salvo')
    expect(service.getConfig().primaryColor).toBe('#10b981')
  })

  it('updateConfig atualiza, persiste no storage e notifica assinantes', () => {
    const storage = createMockStorage()
    const root = createMockRoot()
    const service = createOrganizationService({
      initialConfig: { enabled: true, name: 'Inicial', primaryColor: '#000000' },
      key: 'test:org',
      storage,
      root,
    })

    const listener = vi.fn()
    const unsubscribe = service.subscribe(listener)

    service.updateConfig({ name: 'Novo Nome', primaryColor: '#ef4444' })

    expect(service.getConfig().name).toBe('Novo Nome')
    expect(service.getConfig().primaryColor).toBe('#ef4444')
    expect(storage.setItem).toHaveBeenCalled()
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Novo Nome', primaryColor: '#ef4444' }),
    )
    expect(root.style.setProperty).toHaveBeenCalledWith('--md-sys-color-primary', '#ef4444')

    unsubscribe()
    service.updateConfig({ name: 'Outro' })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('resetToDefault remove do storage e restaura baseConfig', () => {
    const storage = createMockStorage({
      'test:org': JSON.stringify({ name: 'Sobrescrito' }),
    })
    const service = createOrganizationService({
      initialConfig: { enabled: true, name: 'Padrao Original' },
      key: 'test:org',
      storage,
    })

    expect(service.getConfig().name).toBe('Sobrescrito')
    service.resetToDefault()

    expect(storage.removeItem).toHaveBeenCalledWith('test:org')
    expect(service.getConfig().name).toBe('Padrao Original')
  })
})
