import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigWebPushView } from './config-web-push-view.js'
import { resolveRouteCrumbs } from './app-crumb.js'
import { resolveRoute } from '../router.js'

function memoryStorage() {
  const data = {}
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
    clear: () => {
      for (const k in data) delete data[k]
    },
    data,
  }
}

describe('ConfigWebPushView (<config-web-push-view>)', () => {
  let view
  let storage

  beforeEach(() => {
    storage = memoryStorage()
    vi.stubGlobal('localStorage', storage)
    view = new ConfigWebPushView()
  })

  it('é registrado como custom element config-web-push-view', () => {
    expect(customElements.get('config-web-push-view')).toBe(ConfigWebPushView)
  })

  it('inicia com valores padrão e carrega tópicos', () => {
    expect(view.topics).toContain('alertas')
    expect(view.autoPrompt).toBe(false)
    expect(view._testTitle).toBeDefined()
    expect(view._testBody).toBeDefined()
  })

  it('_generateMockKey preenche chave VAPID demo', () => {
    view._generateMockKey()
    expect(view.vapidKey).toContain('BEl62iUYgUivxIkv69yViEuiBIa')
    expect(view._statusType).toBe('success')
  })

  it('_toggleTopic adiciona ou remove tópicos da lista', () => {
    view.topics = 'alertas,sistema'
    view._toggleTopic('financeiro')
    expect(view.topics).toBe('alertas,sistema,financeiro')

    view._toggleTopic('sistema')
    expect(view.topics).toBe('alertas,financeiro')
  })

  it('_saveConfig persiste configurações no localStorage', () => {
    view.vapidKey = 'demo-key'
    view.endpointUrl = 'https://api.teste.com/push'
    view.autoPrompt = true
    view.topics = 'alertas'

    view._saveConfig()

    expect(view._statusType).toBe('success')
    expect(view._statusMessage).toContain('salvas com sucesso')
  })

  it('render produz o template completo com seções de configuração e diagnóstico', () => {
    const template = view.render()
    expect(template).toBeDefined()
    const content = template.strings.join('')
    expect(content).toContain('Parâmetros do Provedor Push')
    expect(content).toContain('Diagnóstico do Dispositivo')
    expect(content).toContain('Simulador de Notificações Push')
    expect(content).toContain('fzl-web-push')
  })

  it('resolve rota config-web-push corretamente', () => {
    const route = resolveRoute('#/config/web-push')
    expect(route.name).toBe('config-web-push')
  })

  it('resolve breadcrumbs para config-web-push', () => {
    const crumbs = resolveRouteCrumbs({ name: 'config-web-push' })
    expect(crumbs).toEqual([
      { label: 'Início', href: '#/' },
      { label: 'Config' },
      { label: 'Web Push' },
    ])
  })
})
