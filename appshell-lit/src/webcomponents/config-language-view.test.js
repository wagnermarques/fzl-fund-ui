import { beforeEach, describe, expect, it } from 'vitest'
import { i18nService } from '../services/i18n-service.js'
import { ConfigLanguageView } from './config-language-view.js'

describe('ConfigLanguageView', () => {
  beforeEach(() => {
    i18nService.setLocale('pt-BR')
  })

  it('é registrado como custom element', () => {
    expect(customElements.get('config-language-view')).toBe(ConfigLanguageView)
  })

  it('define propriedades de estado e estilos estáticos', () => {
    expect(ConfigLanguageView.properties).toHaveProperty('_locale')
    expect(ConfigLanguageView.styles.cssText).toContain('.language-list')
    expect(ConfigLanguageView.styles.cssText).toContain('.preview-card')
  })

  it('inicia com o locale ativo do i18nService', () => {
    const view = new ConfigLanguageView()
    expect(view._locale).toBe('pt-BR')
  })

  it('_selectLanguage atualiza o i18nService e a propriedade interna', () => {
    const view = new ConfigLanguageView()
    view._selectLanguage('en-US')

    expect(i18nService.getLocale()).toBe('en-US')
    view._selectLanguage('pt-BR')
    expect(i18nService.getLocale()).toBe('pt-BR')
  })

  it('render produz o template com os idiomas suportados', () => {
    const view = new ConfigLanguageView()
    const template = view.render()
    expect(template).toBeDefined()
    expect(template.strings.length).toBeGreaterThan(0)
  })
})
