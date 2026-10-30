/**
 * Serviço de Internacionalização (i18n) e Localização (l10n) do Appshell.
 *
 * Gerencia o locale ativo, persistência no localStorage (com prefixo do app),
 * detecção do idioma do navegador, carregamento de catálogos e sincronização
 * com o DOM raiz (<html lang="..." dir="...">) e eventos de shell / fzl:locale-change.
 */
import { DEFAULT_CATALOGS } from '../locales/index.js'
import { storageKey } from '../storage-keys.js'

export const DEFAULT_LOCALE = 'pt-BR'
export const FALLBACK_LOCALE = 'pt-BR'

export const DEFAULT_SUPPORTED_LOCALES = [
  { code: 'pt-BR', label: 'Português (Brasil)', dir: 'ltr' },
  { code: 'en-US', label: 'English (US)', dir: 'ltr' },
  { code: 'es-ES', label: 'Español', dir: 'ltr' },
]

function defaultStorage() {
  return globalThis.localStorage ?? null
}

function resolveKey(keyFn) {
  try {
    return typeof keyFn === 'function' ? keyFn() : storageKey('i18n:locale')
  } catch {
    return 'fzl:i18n:locale'
  }
}

/** Lê o valor de chave aninhada por caminho de pontos ('auth.login') */
export function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object') return undefined
  return path.split('.').reduce((curr, step) => (curr && typeof curr === 'object' ? curr[step] : undefined), obj)
}

/**
 * Interpolação de texto simples substituindo marcadores {param}.
 */
export function interpolate(text, params) {
  if (typeof text !== 'string') return text
  if (!params || typeof params !== 'object') return text
  return text.replace(/{([a-zA-Z0-9_]+)}/g, (match, key) => {
    return key in params ? String(params[key]) : match
  })
}

/**
 * Detecta o melhor locale a partir dos idiomas do navegador.
 */
export function detectBrowserLocale(supportedCodes = ['pt-BR', 'en-US', 'es-ES'], nav = globalThis.navigator) {
  if (!nav) return null

  const candidates = nav.languages && nav.languages.length ? nav.languages : [nav.language].filter(Boolean)

  for (const candidate of candidates) {
    // 1. Correspondência exata (ex.: pt-BR)
    const exact = supportedCodes.find((c) => c.toLowerCase() === candidate.toLowerCase())
    if (exact) return exact

    // 2. Correspondência por prefixo de idioma (ex.: pt -> pt-BR)
    const langPrefix = candidate.split('-')[0].toLowerCase()
    const prefixMatch = supportedCodes.find((c) => c.toLowerCase().startsWith(langPrefix))
    if (prefixMatch) return prefixMatch
  }

  return null
}

/**
 * Cria uma instância isolada do i18nService.
 */
export function createI18nService(options = {}) {
  const {
    defaultLocale = DEFAULT_LOCALE,
    fallbackLocale = FALLBACK_LOCALE,
    supportedLocales = DEFAULT_SUPPORTED_LOCALES,
    autoDetect = true,
    storage = defaultStorage(),
    key: keyFn = () => storageKey('i18n:locale'),
    catalogs = { ...DEFAULT_CATALOGS },
  } = options

  const supportedList = supportedLocales.map((item) =>
    typeof item === 'string' ? { code: item, label: item, dir: 'ltr' } : item,
  )
  const supportedCodes = supportedList.map((item) => item.code)

  const listeners = new Set()
  const loadedCatalogs = { ...catalogs }

  // Resolução inicial
  function readSavedLocale() {
    try {
      const saved = storage?.getItem(resolveKey(keyFn))
      if (saved && supportedCodes.includes(saved)) {
        return saved
      }
    } catch {
      // Storage indisponível
    }
    return null
  }

  const initialLocale =
    readSavedLocale() ||
    (autoDetect ? detectBrowserLocale(supportedCodes) : null) ||
    defaultLocale ||
    FALLBACK_LOCALE

  let currentLocale = supportedCodes.includes(initialLocale) ? initialLocale : defaultLocale

  function updateDom(locale, dir) {
    if (typeof globalThis.document !== 'undefined' && globalThis.document?.documentElement) {
      globalThis.document.documentElement.lang = locale
      globalThis.document.documentElement.dir = dir
    }
    if (typeof globalThis.window !== 'undefined' && typeof globalThis.CustomEvent === 'function') {
      globalThis.window.dispatchEvent(
        new CustomEvent('fzl:locale-change', {
          detail: { locale, dir },
        }),
      )
    }
  }

  // Aplicação inicial no DOM se disponível
  const initialMeta = supportedList.find((l) => l.code === currentLocale) || { dir: 'ltr' }
  updateDom(currentLocale, initialMeta.dir || 'ltr')

  return {
    getLocale() {
      return currentLocale
    },

    getDirection() {
      const meta = supportedList.find((l) => l.code === currentLocale)
      return meta?.dir || 'ltr'
    },

    getSupportedLocales() {
      return [...supportedList]
    },

    setLocale(code) {
      if (!supportedCodes.includes(code)) {
        throw new Error(`i18nService: locale "${code}" não é suportado (use ${supportedCodes.join(', ')})`)
      }

      currentLocale = code
      const dir = this.getDirection()

      try {
        storage?.setItem(resolveKey(keyFn), code)
      } catch {
        // Storage com cota excedida ou restrito
      }

      updateDom(code, dir)

      const payload = { locale: code, dir }
      listeners.forEach((fn) => {
        try {
          fn(payload)
        } catch (err) {
          console.error('[appshell] erro em listener de i18n:', err)
        }
      })
    },

    subscribe(callback) {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },

    registerCatalog(code, dict) {
      if (!loadedCatalogs[code]) {
        loadedCatalogs[code] = {}
      }
      loadedCatalogs[code] = { ...loadedCatalogs[code], ...dict }
    },

    t(key, params) {
      const activeDict = loadedCatalogs[currentLocale]
      let value = getNestedValue(activeDict, key)

      // Fallback
      if (value === undefined && currentLocale !== fallbackLocale) {
        const fallbackDict = loadedCatalogs[fallbackLocale]
        value = getNestedValue(fallbackDict, key)
      }

      // Se não encontrou em nenhum lugar, devolve a própria chave
      if (value === undefined) {
        return key
      }

      return interpolate(value, params)
    },

    formatDate(date, dateOptions) {
      const d = date instanceof Date ? date : new Date(date)
      return new Intl.DateTimeFormat(currentLocale, dateOptions).format(d)
    },

    formatNumber(number, numberOptions) {
      return new Intl.NumberFormat(currentLocale, numberOptions).format(number)
    },

    formatCurrency(amount, currency = 'BRL', currencyOptions = {}) {
      return new Intl.NumberFormat(currentLocale, {
        style: 'currency',
        currency,
        ...currencyOptions,
      }).format(amount)
    },

    formatRelativeTime(value, unit, relativeOptions) {
      return new Intl.RelativeTimeFormat(currentLocale, relativeOptions).format(value, unit)
    },
  }
}

export const i18nService = createI18nService()
