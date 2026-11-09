/**
 * Serviço de Customização Organizacional e Marca Corporativa do Appshell.
 *
 * Permite que aplicações consumidoras definam (ou não) identidade corporativa:
 * - Nome da organização / Razão Social
 * - Logotipo (URL ou SVG inline / data URI) e versão escura opcional
 * - Slogan / Tagline
 * - Cor primária institucional (--md-sys-color-primary / --fzl-color-primary)
 * - Contato de suporte, website e texto de rodapé / copyright
 * - Permissão de edição em tempo de execução e sincronização com backend
 *
 * Se desabilitado ou não configurado (organization: false ou omitido), o
 * App Shell preserva rigorosamente sua apresentação padrão e não exibe rotas
 * ou itens de menu da organização.
 */

import { DEFAULT_MOCK_ORGANIZATION, validateOrganization } from '../app-config.js'
import { storageKey } from '../storage-keys.js'

function defaultStorage() {
  return globalThis.localStorage ?? null
}

function defaultRoot() {
  return globalThis.document?.documentElement ?? null
}

function resolveKey(key) {
  if (typeof key === 'string' && key) return key
  if (typeof key === 'function') {
    try {
      return key()
    } catch {
      return 'fzl:organization:config'
    }
  }
  try {
    return storageKey('organization:config')
  } catch {
    return 'fzl:organization:config'
  }
}

export function applyOrganizationTheme(config, root = defaultRoot()) {
  if (!root || !root.style) return
  if (config?.enabled && config?.primaryColor) {
    root.style.setProperty('--md-sys-color-primary', config.primaryColor)
    root.style.setProperty('--fzl-color-primary', config.primaryColor)
    root.style.setProperty('--md-sys-color-surface-tint', config.primaryColor)
  } else {
    root.style.removeProperty('--md-sys-color-primary')
    root.style.removeProperty('--fzl-color-primary')
    root.style.removeProperty('--md-sys-color-surface-tint')
  }
}

export function readPersistedConfig(storage, key) {
  try {
    const raw = storage?.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function createOrganizationService({
  initialConfig = null,
  key = () => storageKey('organization:config'),
  storage = defaultStorage(),
  root = defaultRoot(),
} = {}) {
  let baseConfig = validateOrganization(initialConfig)
  let subscribers = new Set()

  function getKey() {
    return resolveKey(key)
  }

  function resolveCurrent() {
    if (!baseConfig || !baseConfig.enabled) {
      return baseConfig ? { ...baseConfig } : null
    }
    const persisted = readPersistedConfig(storage, getKey())
    if (persisted && typeof persisted === 'object') {
      return { ...baseConfig, ...persisted }
    }
    return { ...baseConfig }
  }

  let currentConfig = resolveCurrent()

  function notify() {
    for (const sub of [...subscribers]) {
      try {
        sub(currentConfig ? { ...currentConfig } : null)
      } catch (err) {
        console.error('[organization-service] erro em subscriber:', err)
      }
    }
  }

  return {
    isConfigured() {
      return Boolean(currentConfig && currentConfig.enabled)
    },

    getConfig() {
      return currentConfig ? { ...currentConfig } : null
    },

    get() {
      return this.getConfig()
    },

    use(config) {
      baseConfig = validateOrganization(config)
      currentConfig = resolveCurrent()
      this.apply()
      notify()
      return currentConfig
    },

    updateConfig(patch, { persist = true } = {}) {
      if (!currentConfig) {
        currentConfig = validateOrganization({ ...DEFAULT_MOCK_ORGANIZATION, ...patch })
      } else {
        currentConfig = validateOrganization({ ...currentConfig, ...patch })
      }

      if (persist && currentConfig.allowRuntimeEdit !== false && storage) {
        try {
          storage.setItem(getKey(), JSON.stringify(currentConfig))
        } catch {
          // quota or storage unavailable
        }
      }

      this.apply()
      notify()
      return { ...currentConfig }
    },

    resetToDefault() {
      if (storage) {
        try {
          storage.removeItem(getKey())
        } catch {}
      }
      currentConfig = baseConfig ? { ...baseConfig } : null
      this.apply()
      notify()
      return currentConfig ? { ...currentConfig } : null
    },

    apply() {
      applyOrganizationTheme(currentConfig, root)
    },

    subscribe(fn) {
      if (typeof fn !== 'function') return () => {}
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },

    async syncWithBackend(client) {
      if (!currentConfig?.backendUrl || !client) return null
      try {
        const response = await client.get(currentConfig.backendUrl)
        if (response && typeof response === 'object') {
          return this.updateConfig(response, { persist: true })
        }
      } catch (err) {
        console.warn('[organization-service] falha ao sincronizar com backend:', err)
        throw err
      }
      return null
    },
  }
}

export const organizationService = createOrganizationService()
