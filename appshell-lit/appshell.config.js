// Config declarativa do appshell para a demo deste repositório — e o modelo
// para os apps: o lugar central de todos os *valores* do app. Lida pelo
// vite.config.js (build), que a entrega ao navegador; o createAppShell() do
// main.js a recebe sozinho e fica só com o que é código.
//
// Só valores simples aqui (sem lit/html``/funções): o vite.config.js roda
// no Node. Nada de segredos: este arquivo vai para o git e para o
// navegador. O que muda por ambiente vem de variável (VITE_APPSHELL_*, ver
// .env.example e src/app-config.js).
// Opções e referências de acessibilidade: documentation/acessibilidade.org.
import { defineAppShellConfig } from './src/config.js'

export default defineAppShellConfig({
  title: 'Fund Appshell',
  // Identidade institucional e customização organizacional (opt-in)
  organization: {
    enabled: true,
    name: 'FZL Capital & Investimentos',
    tagline: 'Gestão Estratégica de Fundos & Ativos',
    logo: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="32" height="32"><defs><linearGradient id="fzlGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230284c7"/><stop offset="100%" stop-color="%230369a1"/></linearGradient></defs><rect width="40" height="40" rx="8" fill="url(%23fzlGrad)"/><path d="M10 13 H24 V17 H15 V20 H22 V24 H15 V28 H10 Z" fill="%23ffffff"/><circle cx="28" cy="25" r="3.5" fill="%2338bdf8"/></svg>',
    primaryColor: '#0284c7',
    supportEmail: 'contato@fzlcapital.com.br',
    website: 'https://fzlcapital.com.br',
    footerText: '© 2026 FZL Capital & Investimentos S.A. Todos os direitos reservados.',
    allowRuntimeEdit: true,
  },
  // Sem storagePrefix, vale o name do package.json.
  accessibility: {
    fonts: ['atkinson', 'opendyslexic'],
    themes: ['light', 'dark', 'high-contrast-light', 'high-contrast-dark'],
    textScale: { min: 1, max: 2 },
    defaults: { font: 'system', theme: 'system', textScale: 1 },
  },
  // Cada app aponta para a sua própria propriedade do GA4 — o id vem do
  // ambiente (VITE_APPSHELL_ANALYTICS_ID); sem ele, o analytics não liga.
  analytics: {
    requireConsent: true,
  },
  // Chave *pública* VAPID, do ambiente (VITE_APPSHELL_PUSH_VAPID_PUBLIC_KEY);
  // sem ela o push fica desligado. A privada nunca vem para cá.
  push: {
    vapidPublicKey: '',
  },
  // Os servidores do app. A url de cada um é sobrescrita por ambiente com
  // VITE_APPSHELL_BACKENDS_<NOME>_URL; vazia = ainda não configurado (a
  // demo não tem backend). Uso: backend('api').get('/pedidos').
  backends: {
    api: { url: '', auth: 'bearer', health: '/health' },
  },
})
