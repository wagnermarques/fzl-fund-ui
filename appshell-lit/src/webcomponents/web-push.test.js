import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WebPushComponent } from './web-push.js'
import { pushService } from '../services/push-service.js'

describe('WebPushComponent (<fzl-web-push> / <web-push-component>)', () => {
  let element

  beforeEach(() => {
    element = new WebPushComponent()
  })

  it('é registrado como custom element fzl-web-push e web-push-component', () => {
    expect(customElements.get('fzl-web-push')).toBe(WebPushComponent)
    expect(customElements.get('web-push-component')).toBeDefined()
  })

  it('inicia com atributos e propriedades padrão corretos (headless)', () => {
    expect(element.vapidKey).toBe('')
    expect(element.endpointUrl).toBe('')
    expect(element.autoPrompt).toBe(false)
    expect(element.topics).toBe('')
    expect(element.displayMode).toBe('none')
    expect(element.subscribed).toBe(false)
  })

  it('processa lista de tópicos corretamente', () => {
    element.topics = 'alertas, processos, sistema '
    expect(element._getTopicsList()).toEqual(['alertas', 'processos', 'sistema'])

    element.topics = ''
    expect(element._getTopicsList()).toEqual([])
  })

  it('getStatus retorna snapshot das propriedades e suporte', () => {
    element.vapidKey = 'test-vapid'
    element.endpointUrl = 'https://api.test/push'
    element.topics = 'noticias'

    const status = element.getStatus()
    expect(status).toHaveProperty('supported')
    expect(status).toHaveProperty('permission')
    expect(status).toHaveProperty('subscribed')
    expect(status.endpointUrl).toBe('https://api.test/push')
    expect(status.topics).toEqual(['noticias'])
  })

  it('prompt() e _dismissPrompt() alternam a exibição do banner', () => {
    expect(element._showPrompt).toBe(false)
    element.prompt()
    expect(element._showPrompt).toBe(true)
    element._dismissPrompt()
    expect(element._showPrompt).toBe(false)
  })

  it('simulatePush dispara evento fzl-push-received e configura estado de push recebido', () => {
    const receivedHandler = vi.fn()
    element.addEventListener('fzl-push-received', receivedHandler)

    const payload = {
      title: 'Tarefa Concluída',
      body: 'O fluxo foi aprovado.',
      url: '#/tarefas/10',
    }

    element.simulatePush(payload)

    expect(receivedHandler).toHaveBeenCalledTimes(1)
    expect(receivedHandler.mock.calls[0][0].detail).toEqual({
      title: 'Tarefa Concluída',
      body: 'O fluxo foi aprovado.',
      url: '#/tarefas/10',
      data: {},
      icon: 'notifications',
    })
    expect(element._incomingPush).toBeDefined()
    expect(element._incomingPush.title).toBe('Tarefa Concluída')
  })

  it('_handleToastClick dispara evento fzl-push-clicked e fecha o toast', () => {
    const clickedHandler = vi.fn()
    element.addEventListener('fzl-push-clicked', clickedHandler)

    element.simulatePush({
      title: 'Aviso',
      body: 'Mensagem de teste',
      url: '#/home',
    })

    element._handleToastClick('open')

    expect(clickedHandler).toHaveBeenCalledTimes(1)
    expect(clickedHandler.mock.calls[0][0].detail).toEqual({
      action: 'open',
      url: '#/home',
      data: {},
    })
    expect(element._incomingPush).toBeNull()
  })

  it('_closeToast fecha a notificação ativa', () => {
    element.simulatePush({ title: 'Aviso', body: 'Teste' })
    expect(element._incomingPush).not.toBeNull()
    element._closeToast()
    expect(element._incomingPush).toBeNull()
  })

  it('renderiza banner condicional quando displayMode="banner"', () => {
    element.displayMode = 'banner'
    element._showPrompt = true
    element._permission = 'default'
    element.subscribed = false

    const template = element.render()
    expect(template).toBeDefined()
  })

  it('renderiza badge condicional quando displayMode="badge"', () => {
    element.displayMode = 'badge'
    element.status = 'subscribed'

    const badgeTemplate = element._renderBadge()
    expect(badgeTemplate).toBeDefined()
    expect(badgeTemplate.strings.join('')).toContain('push-badge')
    expect(badgeTemplate.values).toContain('Push Ativo')
  })

  it('renderiza card de diagnóstico quando displayMode="card"', () => {
    element.displayMode = 'card'

    const cardTemplate = element._renderCard()
    expect(cardTemplate).toBeDefined()
    expect(cardTemplate.strings.join('')).toContain('push-card')
  })

  it('subscribe emite erro quando navegador não suporta push', async () => {
    vi.spyOn(pushService, 'isSupported').mockReturnValue(false)
    const errorHandler = vi.fn()
    element.addEventListener('fzl-push-error', errorHandler)

    await expect(element.subscribe()).rejects.toThrow('Navegador não suporta notificações Web Push.')
    expect(errorHandler).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe altera estado de inscrição e emite evento', async () => {
    vi.spyOn(pushService, 'disable').mockResolvedValue(undefined)
    element.subscribed = true
    const unsubHandler = vi.fn()
    element.addEventListener('fzl-push-unsubscribed', unsubHandler)

    await element.unsubscribe()

    expect(element.subscribed).toBe(false)
    expect(unsubHandler).toHaveBeenCalledTimes(1)
  })
})
