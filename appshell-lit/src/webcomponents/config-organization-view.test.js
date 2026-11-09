import { beforeEach, describe, expect, it } from 'vitest'
import { organizationService } from '../services/organization-service.js'
import { ConfigOrganizationView, BRAND_COLOR_PRESETS } from './config-organization-view.js'

describe('ConfigOrganizationView', () => {
  beforeEach(() => {
    organizationService.use({
      enabled: true,
      name: 'Test Org Corp',
      tagline: 'Leading Future Asset Management',
      primaryColor: '#0284c7',
      supportEmail: 'contact@testorg.com',
      website: 'https://testorg.com',
      footerText: '© 2026 Test Org Corp',
    })
  })

  it('é registrado como custom element', () => {
    expect(customElements.get('config-organization-view')).toBe(ConfigOrganizationView)
  })

  it('define propriedades de estado e estilos estáticos', () => {
    expect(ConfigOrganizationView.properties).toHaveProperty('_config')
    expect(ConfigOrganizationView.properties).toHaveProperty('_form')
    expect(ConfigOrganizationView.properties).toHaveProperty('_feedback')
    expect(ConfigOrganizationView.styles.cssText).toContain('.preview-card')
    expect(ConfigOrganizationView.styles.cssText).toContain('.preset-palette')
  })

  it('inicia com a config ativa do organizationService', () => {
    const view = new ConfigOrganizationView()
    expect(view._form.name).toBe('Test Org Corp')
    expect(view._form.primaryColor).toBe('#0284c7')
  })

  it('_selectPresetColor atualiza o campo de cor primária', () => {
    const view = new ConfigOrganizationView()
    view._selectPresetColor('#059669')
    expect(view._form.primaryColor).toBe('#059669')
  })

  it('_onFieldChange atualiza os campos do formulário', () => {
    const view = new ConfigOrganizationView()
    view._onFieldChange({ target: { name: 'name', value: 'Novo Nome S.A.' } })
    expect(view._form.name).toBe('Novo Nome S.A.')
  })

  it('_handleSubmit atualiza o organizationService e gera feedback', () => {
    const view = new ConfigOrganizationView()
    view._form = { ...view._form, name: 'Atualizado Corp', primaryColor: '#4f46e5' }
    view._handleSubmit({ preventDefault: () => {} })

    expect(organizationService.getConfig().name).toBe('Atualizado Corp')
    expect(organizationService.getConfig().primaryColor).toBe('#4f46e5')
    expect(view._feedback).toContain('salvas com sucesso')
  })

  it('_handleReset restaura os valores padrão', () => {
    const view = new ConfigOrganizationView()
    view._handleReset()
    expect(view._feedback).toContain('restaurados')
  })

  it('render produz o template lit html', () => {
    const view = new ConfigOrganizationView()
    const template = view.render()
    expect(template).toBeDefined()
    expect(template.strings.length).toBeGreaterThan(0)
  })
})
