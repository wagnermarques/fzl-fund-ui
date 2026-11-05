import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService, localProvider } from '../services/auth-service.js'
import { UserProfileView } from './user-profile-view.js'
import { FzlLitAvatarUpload } from '@fzl/webcomponents-lit/avatar-upload'

function memoryStorage() {
  const data = {}
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    removeItem: (k) => delete data[k],
    data,
  }
}

describe('UserProfileView (<user-profile-view>)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    authService.use(localProvider)
  })

  it('é registrado como custom element user-profile-view', () => {
    expect(customElements.get('user-profile-view')).toBe(UserProfileView)
    expect(customElements.get('fzl-lit-avatar-upload')).toBe(FzlLitAvatarUpload)
  })

  it('define propriedades de estado e estilos estáticos', () => {
    expect(UserProfileView.properties).toHaveProperty('_user')
    expect(UserProfileView.properties).toHaveProperty('_busy')
    expect(UserProfileView.properties).toHaveProperty('_successMessage')
    expect(UserProfileView.properties).toHaveProperty('_errorMessage')
    expect(UserProfileView.styles.cssText).toContain('.profile-card')
    expect(UserProfileView.styles.cssText).toContain('.avatar-section')
  })

  it('renderiza o estado não autenticado com chamada para login', () => {
    const view = new UserProfileView()
    view._user = null
    const template = view.render()
    expect(template).toBeDefined()
    expect(template.strings.join(' ')).toContain('not-logged-in-card')
  })

  it('renderiza dados do usuário logado e formulário', async () => {
    await authService.signUp({ name: 'Maria Silva', email: 'maria@fzl.com', password: 'senha123' })
    await authService.updateProfile({
      role: 'Analista de Riscos',
      phone: '+55 11 99999-0000',
      bio: 'Especialista em fundos imobiliários',
      avatarUrl: 'data:image/png;base64,mockAvatar',
    })

    const view = new UserProfileView()
    view._user = authService.getCurrentUser()

    const template = view.render()
    expect(template).toBeDefined()
    expect(template.strings.join(' ')).toContain('fzl-lit-avatar-upload')
    expect(template.strings.join(' ')).toContain('profile-card')
  })

  it('_handleAvatarChange emite profile-avatar-change e atualiza avatarUrl no authService', async () => {
    await authService.signUp({ name: 'Carlos Lima', email: 'carlos@fzl.com', password: 'senha123' })
    const view = new UserProfileView()
    view._user = authService.getCurrentUser()

    const dispatchSpy = vi.spyOn(view, 'dispatchEvent')

    await view._handleAvatarChange({
      detail: {
        dataUrl: 'data:image/png;base64,novoCorteRedondo',
        blob: null,
        file: null,
        name: 'Carlos Lima',
      },
    })

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'profile-avatar-change',
      })
    )
    expect(authService.getCurrentUser().avatarUrl).toBe('data:image/png;base64,novoCorteRedondo')
    expect(view._successMessage).toContain('salva com sucesso')
  })

  it('_handleAvatarRemove remove o avatar e limpa no authService', async () => {
    await authService.signUp({ name: 'Paula Costa', email: 'paula@fzl.com', password: 'senha123' })
    await authService.updateProfile({ avatarUrl: 'data:image/png;base64,avatarAntigo' })

    const view = new UserProfileView()
    view._user = authService.getCurrentUser()

    await view._handleAvatarRemove()

    expect(authService.getCurrentUser().avatarUrl).toBeNull()
    expect(view._successMessage).toContain('removida com sucesso')
  })
})
