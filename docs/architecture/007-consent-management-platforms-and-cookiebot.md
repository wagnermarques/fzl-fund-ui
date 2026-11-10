# ADR-007: Plataformas de Gestão de Consentimento (CMPs), Cookiebot e Alternativas Livres

> **Status:** Aprovado / Arquitetura Implementada  
> **Data:** Novembro de 2026  
> **Contexto:** LGPD (Brasil - Lei 13.709/2018), GDPR (União Europeia), Google Consent Mode v2 (Suporte Google Artigo 14546767)  
> **Módulo:** `appshell-lit` (`src/services/consent-service.js`, `src/services/analytics-service.js`, `src/webcomponents/consent-banner.js`)

---

## 1. Contexto e Motivação Regulatória

Com a entrada em vigor da **LGPD no Brasil** e a evolução contínua da **GDPR e do Digital Markets Act (DMA) na União Europeia**, o rastreamento de usuários e a gravação de cookies estatísticos ou de marketing exigem consentimento livre, informado, inequívoco e revogável a qualquer tempo.

Em 2024, o Google tornou obrigatória a implementação do **Google Consent Mode v2** para anunciantes e proprietários de sites que medem tráfego ou veiculam anúncios no Espaço Econômico Europeu (EEE) e Reino Unido. Conforme detalhado no [Artigo de Suporte do Google 14546767](https://support.google.com/analytics/answer/14546767?hl=pt-BR), a integração com uma **CMP (Consent Management Platform) certificada como o Cookiebot** é um dos caminhos homologados pelo Google para transmitir os 4 sinais obrigatórios de consentimento:
1. `analytics_storage`: armazenamento de cookies para medição analítica.
2. `ad_storage`: cookies e identificadores para publicidade.
3. `ad_user_data`: envio de dados de usuários para serviços de anúncios do Google.
4. `ad_personalization`: personalização de anúncios e remarketing.

Além desses 4, o Consent Mode v2 contempla os sinais funcionais e de segurança:
5. `functionality_storage`: gravação necessária para a funcionalidade do app.
6. `personalization_storage`: preferências como tema, idioma e personalização de interface.
7. `security_storage`: armazenamento exclusivo de autenticação, integridade e prevenção a fraudes.

---

## 2. A Solução Nativa Atual do `appshell-lit`

O ecossistema `appshell-lit` já possui um motor completo de conformidade com a LGPD embutido, composto por:

1. **[`<consent-banner>`](../components/consent-banner.md):** Web component Lit renderizado acima do rodapé, no fluxo da página (sem overlay bloqueante), garantindo que aceitar e recusar tenham rigorosamente o mesmo peso visual (`md-outlined-button`).
2. **[`consentService`](file:///home/wgn/WORKING/Projects-Srcs/Projects-Srcs-FzlSoft/fzlbpms-funds/fzl-fund-ui/appshell-lit/src/services/consent-service.js):** Serviço reativo que persiste a resposta do usuário em `localStorage` sob chave prefixada por aplicação (`<prefix>:consent:analytics`), garantindo isolamento total entre diferentes apps na mesma origem.
3. **[`analyticsService`](file:///home/wgn/WORKING/Projects-Srcs/Projects-Srcs-FzlSoft/fzlbpms-funds/fzl-fund-ui/appshell-lit/src/services/analytics-service.js):**
   - **Consent Mode Básico:** Por padrão, o script externo `gtag.js` **não é baixado da rede** enquanto o usuário não responder ou caso recuse. Zero dados saem do cliente.
   - **Sanitização de URLs (`safePageLocation`):** Tokens de sessão (`access_token`, `refresh_token`, senhas) presentes em links de login mágico ou recuperação de senha são removidos antes do envio ao GA4.
   - **Limpeza Ativa de Cookies:** Ao revogar o consentimento em `#/config/privacidade`, os cookies `_ga` e `_ga_*` são expurgados imediatamente do navegador.

---

## 3. Avaliação Técnica: Cookiebot CMP

O **Cookiebot** é uma das CMPs SaaS proprietárias mais populares do mercado global.

### Vantagens do Cookiebot
- **Varredura Automatizada (*Cookie Scanner*):** Um crawler em nuvem analisa periodicamente o domínio, cataloga cada cookie e script encontrado, e gera automaticamente a tabela de declaração com finalidade, expiração e provedor.
- **Certificação Oficial Google CMP e IAB TCF v2.2:** Permite conformidade direta com exigências de veiculação do Google Ads e AdSense no mercado europeu.
- **Consent Mode v2 Avançado:** Permite carregar o `gtag.js` imediatamente e enviar pings anônimos sem cookie quando o usuário recusa, permitindo ao algoritmo do GA4 modelar matematicamente o tráfego perdido.
- **Log Auditável em Nuvem (*Proof of Consent*):** Grava carimbo de tempo, IP anonimizado e versão da política aceita em cofre auditável para fins jurídicos.
- **Detecção Geográfica:** Apresenta interfaces distintas com base no IP (GDPR rigoroso para Europa, CCPA opt-out para EUA, LGPD para Brasil).

### Desvantagens e Trade-offs para a Arquitetura FZL
1. **Custo de Licenciamento:** Gratuito apenas para 1 domínio com até 50 subpáginas. Em projetos comerciais e multi-tenant, gera cobrança recorrente em Euros por domínio/mês.
2. **Quebra de Funcionamento Offline (PWA):** O Cookiebot carrega scripts pesados de servidores remotos (`consent.cookiebot.com`). Sem conexão com a internet, o banner trava ou gera erros no console, prejudicando a proposta offline-first do PWA.
3. **Latência de Inicialização (*FCP / LCP*):** Injeta bloqueio de renderização no `<head>`, aumentando o tempo de carregamento da página.
4. **Fricção de Design e UX:** O modal padrão do Cookiebot sobrepõe a tela inteira com backdrop escuro, fugindo do padrão estético limpo em Material 3 do `appshell-lit`.
5. **Bloqueadores de Anúncios:** Extensões como uBlock Origin e navegadores com proteção estrita (Brave) bloqueiam com frequência o domínio do Cookiebot, podendo impedir a execução de outros fluxos da aplicação.

---

## 4. Soluções Livres e Open Source como Alternativas

Para organizações que necessitam de recursos avançados de CMP (como categorização granular de cookies e bloqueio condicional de scripts), mas **não desejam arcar com custos de SaaS nem depender de serviços externos em nuvem**, existem excelentes bibliotecas de código aberto:

### 4.1. Vanilla-CookieConsent (por Orest Bida)
* **Licença:** MIT (100% Livre e Gratuito)
* **Tamanho:** ~15 KB gzip (Vanilla JavaScript puro, zero dependências).
* **Suporte a Google Consent Mode v2:** Nativo e completo. Permite definir `gtag('consent', 'default', ...)` antes do carregamento e despachar `gtag('consent', 'update', ...)` nos callbacks `onConsent` e `onChange`.
* **Destaques:**
  - Interface moderna, responsiva e com suporte nativo a temas claro e escuro.
  - Granularidade de categorias: Essenciais, Preferências, Estatísticas e Marketing.
  - Pode ser empacotado localmente no bundle da aplicação (suporta PWA e offline total).
  - Pode gravar o consentimento em `localStorage` ou disparar um webhook para backend próprio de auditoria.

### 4.2. Klaro! (por KIProtect)
* **Licença:** BSD-3-Clause (Open Source corporativo)
* **Tamanho:** ~35 KB (Vanilla JS).
* **Destaques:**
  - Projetado especificamente para conformidade rigorosa com GDPR e LGPD.
  - Gerenciador de scripts: intercepta dinamicamente tags `<script type="text/plain" data-type="application/javascript">` e só as executa quando o usuário aprova o serviço correspondente.
  - Multilíngue com suporte a dezenas de idiomas.
  - Permite rodar como biblioteca cliente 100% autônoma ou conectar ao servidor de consentimento da KIProtect.

### 4.3. Tarteaucitron.js
* **Licença:** MIT
* **Destaques:**
  - Muito popular no setor público francês e europeu (homologado pela CNIL).
  - Inclui centenas de conectores pré-configurados para serviços populares (Google Analytics, YouTube, Vimeo, reCAPTCHA, Disqus, Facebook Pixel, etc.).
  - Bloqueia automaticamente iframes e embeds de terceiros até que o usuário clique em "Autorizar".

---

## 5. Matriz Comparativa Completa

| Funcionalidade | Nativo Lit (`appshell`) | Cookiebot CMP (SaaS) | Vanilla-CookieConsent | Klaro! |
| :--- | :---: | :---: | :---: | :---: |
| **Modelo de Custo** | Grátis (Monorepo) | Pago (Euros/mês/domínio) | Grátis (MIT) | Grátis (BSD-3) |
| **Offline / PWA Ready** | **Sim (100%)** | Não (requer CDN externa) | **Sim (Self-hosted)** | **Sim (Self-hosted)** |
| **Google Consent Mode v2** | **Sim (Básico)** | **Sim (Básico e Avançado)** | **Sim (Básico e Avançado)** | Sim (via wrapper) |
| **Scanner Automático em Nuvem** | Não (manual) | **Sim (Crawler periódico)** | Não (manual) | Não (manual) |
| **Categorias Granulares** | Simples (Analítico) | **Sim (4 categorias)** | **Sim (Customizável)** | **Sim (Por serviço)** |
| **Integração Material 3** | **Perfeita / Nativa** | Requer override CSS pesado | Requer CSS customizado | Requer CSS customizado |
| **Dependência de Terceiros** | **Zero** | Alta (servidores Cookiebot) | **Zero** | **Zero** |
| **Auditabilidade LGPD** | Local (`localStorage`) | Nuvem (audit log) | Local / API própria | Local / API própria |

---

## 6. Arquitetura Pluggable no App Shell

Para permitir o melhor dos dois mundos, o `appshell-lit` adota uma **Arquitetura Híbrida e Plugável**:

```javascript
// appshell.config.js
export default defineAppShellConfig({
  analytics: {
    provider: 'ga4',
    id: 'G-XXXXXXXXXX',
    requireConsent: true,
    privacyUrl: '#/config/privacidade',
    
    // Provedor de Gestão de Consentimento:
    // - 'internal': Usa o <consent-banner> nativo Lit do shell (Leve, LGPD, zero dependências, offline-first)
    // - 'cookiebot': Integra com a CMP Cookiebot (injetando o script oficial e escutando eventos)
    // - 'custom': Permite conectar Vanilla-CookieConsent ou Klaro
    // - 'none': Desativa o banner (para sistemas de intranet/uso estritamente interno)
    cmp: 'internal',
    
    // Obrigatório caso cmp: 'cookiebot' seja selecionado
    cookiebotId: '00000000-0000-0000-0000-000000000000',
    
    // Modo de Consentimento do Google:
    // - 'basic': O script do GA4 só carrega após aceite explícito (Recomendado LGPD)
    // - 'advanced': Carrega o gtag com 'denied' inicial e dispara pings modelados
    consentMode: 'basic',
  },
})
```

### Fluxo de Inicialização do Conector Cookiebot
Quando `analytics.cmp === 'cookiebot'`:
1. O App Shell suprime a renderização do `<consent-banner>` interno.
2. O `analyticsService` injeta o script oficial:
   ```html
   <script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="${cookiebotId}" type="text/javascript"></script>
   ```
3. O serviço registra listeners para os eventos globais `CookiebotOnConsentReady` e `CookiebotOnDecline`:
   ```javascript
   window.addEventListener('CookiebotOnConsentReady', () => {
     const granted = window.Cookiebot?.consent?.statistics ?? false
     consentService.set(granted ? 'granted' : 'denied')
     shellEvents.emit('consent:change', { consent: granted ? 'granted' : 'denied', provider: 'cookiebot' })
   })
   ```
4. Na tela `#/config/privacidade` (`<config-privacy-view>`), o componente exibe as informações sobre o Cookiebot e disponibiliza o botão para reabrir o diálogo oficial de preferências via `Cookiebot.renew()`.

---

## 7. Decisão e Recomendações

1. **Padrão do Projeto (`cmp: 'internal'`):** Manter o componente nativo Lit como padrão default do ecossistema. Ele é ideal para aplicações corporativas no Brasil, possui custo zero, funciona 100% offline em PWAs, respeita as diretrizes da LGPD sem dark patterns e mantém a identidade visual Material 3.
2. **Habilitação de CMP Comercial:** Projetos que exigem conformidade contratual formal com Google Ads internacional ou auditoria automatizada em nuvem podem ativar `cmp: 'cookiebot'` passando o respectivo `cookiebotId`.
3. **Evolução Open Source:** Caso no futuro seja necessária a seleção granular de cookies (Essenciais vs. Estatísticas vs. Marketing) com visual totalmente customizável e sem custo de SaaS, a biblioteca livre recomendada para integração é o **Vanilla-CookieConsent (Orest Bida)** devido ao suporte nativo ao Google Consent Mode v2 e empacotamento local.
