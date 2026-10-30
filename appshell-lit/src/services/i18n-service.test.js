import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createI18nService,
  DEFAULT_LOCALE,
  DEFAULT_SUPPORTED_LOCALES,
  detectBrowserLocale,
  getNestedValue,
  interpolate,
} from './i18n-service.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => (data[k] = String(v)),
    data,
  }
}

describe('i18n-service helpers', () => {
  it('getNestedValue encontra chaves aninhadas por ponto', () => {
    const obj = { nav: { home: 'Início', auth: { login: 'Entrar' } } }
    expect(getNestedValue(obj, 'nav.home')).toBe('Início')
    expect(getNestedValue(obj, 'nav.auth.login')).toBe('Entrar')
    expect(getNestedValue(obj, 'nav.missing')).toBeUndefined()
    expect(getNestedValue(null, 'nav.home')).toBeUndefined()
  })

  it('interpolate substitui marcadores {chave}', () => {
    expect(interpolate('Olá, {name}!', { name: 'Wagner' })).toBe('Olá, Wagner!')
    expect(interpolate('Contagem: {count}', { count: 42 })).toBe('Contagem: 42')
    expect(interpolate('Sem params {missing}', {})).toBe('Sem params {missing}')
    expect(interpolate(123, { name: 'teste' })).toBe(123)
  })

  it('detectBrowserLocale encontra idioma exato ou por prefixo', () => {
    const supported = ['pt-BR', 'en-US', 'es-ES']

    expect(detectBrowserLocale(supported, { languages: ['en-US', 'pt-BR'] })).toBe('en-US')
    expect(detectBrowserLocale(supported, { languages: ['pt', 'en'] })).toBe('pt-BR')
    expect(detectBrowserLocale(supported, { languages: ['fr-FR', 'de-DE'] })).toBeNull()
  })
})

describe('createI18nService', () => {
  let storage

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('inicia com o locale padrão se nada estiver salvo e autoDetect for falso', () => {
    const service = createI18nService({
      storage,
      autoDetect: false,
    })
    expect(service.getLocale()).toBe(DEFAULT_LOCALE)
    expect(service.getDirection()).toBe('ltr')
  })

  it('respeita o locale salvo no storage', () => {
    const key = 'test:i18n:locale'
    const storage = memoryStorage({ [key]: 'en-US' })
    const service = createI18nService({
      storage,
      key: () => key,
      autoDetect: false,
    })
    expect(service.getLocale()).toBe('en-US')
  })

  it('setLocale altera o locale atual, grava no storage e avisa os inscritos', () => {
    const key = 'test:i18n:locale'
    const service = createI18nService({
      storage,
      key: () => key,
      autoDetect: false,
    })

    const listener = vi.fn()
    const off = service.subscribe(listener)

    service.setLocale('es-ES')
    expect(service.getLocale()).toBe('es-ES')
    expect(storage.data[key]).toBe('es-ES')
    expect(listener).toHaveBeenCalledWith({ locale: 'es-ES', dir: 'ltr' })

    off()
    service.setLocale('pt-BR')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('setLocale lança erro para locale não suportado', () => {
    const service = createI18nService({ storage, autoDetect: false })
    expect(() => service.setLocale('fr-FR')).toThrowError(/não é suportado/)
  })

  it('traduz termos conhecidos com fallback e interpolação', () => {
    const customCatalogs = {
      'pt-BR': {
        hello: 'Olá, {name}!',
        onlyPt: 'Apenas em português',
      },
      'en-US': {
        hello: 'Hello, {name}!',
      },
    }

    const service = createI18nService({
      storage,
      autoDetect: false,
      catalogs: customCatalogs,
      fallbackLocale: 'pt-BR',
    })

    expect(service.t('hello', { name: 'Maria' })).toBe('Olá, Maria!')

    service.setLocale('en-US')
    expect(service.t('hello', { name: 'John' })).toBe('Hello, John!')

    // Fallback para pt-BR quando chave não existir em en-US
    expect(service.t('onlyPt')).toBe('Apenas em português')

    // Devolve a própria chave se não existir em nenhum lugar
    expect(service.t('non.existent.key')).toBe('non.existent.key')
  })

  it('permite registrar novos catálogos dinamicamente via registerCatalog', () => {
    const service = createI18nService({ storage, autoDetect: false })
    service.registerCatalog('en-US', { custom: { message: 'Dynamic text' } })
    service.setLocale('en-US')
    expect(service.t('custom.message')).toBe('Dynamic text')
  })

  it('formata datas, números e moedas com a API Intl', () => {
    const service = createI18nService({ storage, autoDetect: false })
    const date = new Date(2026, 9, 29, 12, 0, 0)

    const formattedPt = service.formatDate(date, { month: 'short' })
    expect(formattedPt).toBeDefined()

    const formattedNumber = service.formatNumber(1234.56)
    expect(formattedNumber).toBeDefined()

    const formattedCurrency = service.formatCurrency(100, 'BRL')
    expect(formattedCurrency).toContain('100')
  })

  it('atualiza atributos lang e dir no document.documentElement quando disponível', () => {
    const origDoc = globalThis.document
    const mockDoc = {
      documentElement: { lang: 'pt-BR', dir: 'ltr' },
    }
    try {
      globalThis.document = mockDoc
      const service = createI18nService({ storage, autoDetect: false })
      service.setLocale('en-US')
      expect(mockDoc.documentElement.lang).toBe('en-US')
      expect(mockDoc.documentElement.dir).toBe('ltr')
    } finally {
      globalThis.document = origDoc
    }
  })
})
