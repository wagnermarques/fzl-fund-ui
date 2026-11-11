# ADR-008: Arquitetura de Acessibilidade (WCAG 2.2 / LBI), Leitor de Texto em Voz Alta (TTS) e Catálogo de Widgets

> **Status:** Aprovado / Especificação para o Roadmap  
> **Data:** Novembro de 2026  
> **Contexto:** WCAG 2.1 / 2.2 (Níveis A, AA e AAA), Lei Brasileira de Inclusão (LBI nº 13.146/2015), e-MAG (Modelo de Acessibilidade em Governo Eletrônico), Web Speech API  
> **Módulos Afetados:** `@fzl/core`, `@fzl/webcomponents-lit`, `appshell-lit` (`src/a11y/`, `src/services/accessibility-service.js`, `src/webcomponents/config-accessibility-view.js`)

---

## 1. Visão Geral e Contexto de Acessibilidade

O projeto `fzl-fund-ui` adota a acessibilidade não como uma camada cosmética posterior, mas como **requisito fundacional de arquitetura**. Interfaces financeiras, de gestão de fundos e de pesquisa qualitativa lidam com dados densos, tabelas extensas, relatórios regulatórios e textos normativos complexos.

### O que o sistema já disponibiliza:
1. **Temas de Alto Contraste:** Temas dedicados (`high-contrast-light` e `high-contrast-dark`) com contraste mínimo superior a 7:1 (WCAG AAA).
2. **Tipografia Inclusiva:** Suporte nativo às fontes **Atkinson Hyperlegible** (otimizada pelo Braille Institute para baixa visão) e **OpenDyslexic** (pesos diferenciados na base das letras para prevenção de rotações visuais).
3. **Escala de Texto Dinâmica:** Ajuste de raiz de `0.875rem` até `1.5rem` (`--a11y-text-scale`), preservando layouts sem quebra de containers.
4. **Foco e Teclado:** Controle de foco profundo através de Shadow DOM boundaries via `fzlFocus`, navegação de teclado *roving tabindex* (`FzlKeyNavController`) e repetição acelerada de botões (`FzlTypematicController`).
5. **Regiões Vivas (Screen Reader Announcements):** Utilitário [`announce()`](file:///home/wgn/WORKING/Projects-Srcs/Projects-Srcs-FzlSoft/fzlbpms-funds/fzl-fund-ui/appshell-lit/src/a11y/announce.js) que transmite mensagens prioritárias (`polite` / `assertive`) a leitores de tela sem poluir a interface visual.

---

## 2. A Inovação Proposta: Leitor de Conteúdo em Voz Alta (Text-to-Speech / TTS)

A proposta de permitir que componentes que apresentam texto (como `<fzl-lit-card>`, artigos do leitor, modais explicativos e resumos de fundos) possam ser ouvidos via áudio é de altíssimo impacto:

- **Atendimento Universal:** Beneficia pessoas com deficiência visual, baixa visão, dislexia, fadiga visual, dificuldades de alfabetização, além de usuários em multitarefa ou em deslocamento.
- **Tecnologia Nativa:** Utiliza a **`Web Speech API` (`window.speechSynthesis`)**, presente nativamente em todos os navegadores modernos (Google Chrome, Microsoft Edge, Apple Safari, Mozilla Firefox) sem necessidade de scripts ou APIs proprietárias externas.
- **Opt-in no AppShell:** A funcionalidade pode ser ativada globalmente no painel de configurações do usuário (`#/config/acessibilidade`) ou configurada via `appshell.config.js`. Quando desativada pelo administrador, o visual dos cartões permanece limpo e tradicional.
- **Sincronização Visual de Leitura (*Karaoke / Sentence Highlighting*):** O leitor destaca visualmente a frase ou palavra sendo dita no momento, auxiliando a retenção cognitiva.

---

## 3. Catálogo de Novos Widgets de Acessibilidade Recomendados

| Widget | Tag Web Component | Critério WCAG / LBI | Finalidade Principal |
| :--- | :--- | :--- | :--- |
| **Leitor de Texto (TTS)** | `<fzl-lit-speech-reader>` | WCAG 1.2 (Mídia Baseada em Tempo) e 3.1 (Legível) | Lê em voz alta o conteúdo textual com controles de reproduzir, pausar, velocidade e grifo dinâmico. |
| **Pular Navegação** | `<fzl-lit-skip-link>` | WCAG 2.4.1 (Bypass Blocks - Nível A) | Link oculto no topo que surge ao pressionar `Tab`, permitindo saltar direto ao conteúdo principal. |
| **Régua de Foco / Leitura** | `<fzl-lit-reading-guide>` | WCAG 1.4.8 (Apresentação Visual - AAA) | Régua semitransparente que isola a linha atual e escurece o restante da página (TDAH e dislexia). |
| **Guardião de Foco (Modal)** | `<fzl-lit-focus-trap>` | WCAG 2.1.2 (Sem Armadilhas de Teclado) | Impede que o foco do teclado escape de janelas modais, gavetas laterais e diálogos abertos. |
| **Central de Atalhos** | `<fzl-lit-keyboard-shortcuts-modal>` | WCAG 2.1.4 (Atalhos de Teclado) | Diálogo aberto via `?` ou `Alt + /` com o mapa acessível de atalhos rápidos do sistema. |
| **Tradutor LIBRAS** | `<fzl-lit-vlibras-widget>` | LBI nº 13.146/2015 e e-MAG | Integração padronizada com o avatar público do VLibras para a comunidade surda. |

---

## 4. 👨‍💻 Sessão Programadores: Detalhes Técnicos de Implementação

Esta seção destina-se aos desenvolvedores que irão implementar, manter ou consumir estes componentes de acessibilidade no monorepo e nas aplicações clientes.

### 4.1. Arquitetura da Web Speech API (`SpeechSynthesis`)

A síntese de voz no navegador não requer bibliotecas externas. Ela opera através de duas entidades centrais:

1. `window.speechSynthesis`: Controlador singleton de fala (executa `speak()`, `pause()`, `resume()`, `cancel()`, `getVoices()`).
2. `SpeechSynthesisUtterance`: Objeto que encapsula o texto a ser vocalizado, com propriedades de idioma (`lang`), velocidade (`rate`: 0.1 a 10), tom (`pitch`: 0 a 2) e volume (`volume`: 0 a 1).

```typescript
// Exemplo canônico de vocalização com captura de eventos
const utterance = new SpeechSynthesisUtterance("O Fundo FZL11 apresentou valorização de 2.4% no mês.");
utterance.lang = "pt-BR";
utterance.rate = 1.0;

// Evento disparado em cada palavra ou frase vocalizada (ideal para sentence highlighting)
utterance.onboundary = (event) => {
  console.log(`Caractere atual: ${event.charIndex}, palavra: ${event.name}`);
};

utterance.onend = () => {
  console.log("Leitura concluída com sucesso.");
};

window.speechSynthesis.speak(utterance);
```

---

### 4.2. Contrato de Configuração no `appshell.config.js`

Para que as aplicações clientes que usam nosso AppShell decidam se querem ou não habilitar a leitura em voz alta e outros recursos, estendemos a seção `accessibility`:

```javascript
// appshell.config.js
export default {
  app: {
    name: 'FZL BPMS Funds',
  },
  accessibility: {
    enabled: true,
    // Configurações do motor Text-to-Speech
    tts: {
      enabled: true,             // se false, oculta opções de voz no shell e nos componentes
      defaultRate: 1.0,          // velocidade padrão
      defaultPitch: 1.0,         // tom de voz
      preferredVoice: 'pt-BR',   // preferência de idioma
      highlightWords: true,      // grifo visual sincronizado de texto
    },
    // Atalhos de teclado
    shortcuts: {
      enabled: true,
      triggerKey: '?',           // tecla que abre o modal de ajuda
    },
    // Régua de leitura
    readingGuide: {
      enabled: true,
      defaultHeight: 48,         // altura em pixels da régua de foco
    }
  }
};
```

---

### 4.3. Implementação Técnica do Componente `<fzl-lit-speech-reader>`

O componente deve herdar de `FzlWidgetMixin(LitElement)` para garantir o ciclo de vida limpo e descarte automático de eventos através de `this.own()`:

```typescript
import { LitElement, html, css } from 'lit';
import { property, state } from 'lit/decorators.js';
import { FzlWidgetMixin } from '@fzl/core';

export class FzlLitSpeechReader extends FzlWidgetMixin(LitElement) {
  static override styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .tts-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: var(--_fzl-font-size-xs, 12px);
      border-radius: var(--_fzl-radius-sm, 4px);
      border: 1px solid var(--_fzl-color-border, #cbd5e1);
      background: var(--_fzl-color-surface, #ffffff);
      cursor: pointer;
      color: var(--_fzl-color-text, #1e293b);
      transition: all 150ms ease;
    }
    .tts-btn:hover {
      background: var(--_fzl-color-surface-muted, #f1f5f9);
      border-color: var(--_fzl-color-primary, #0284c7);
    }
    .tts-btn.active {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
      font-weight: 600;
    }
  `;

  /** Texto a ser vocalizado (caso não informado, lê o textContent do elemento-alvo) */
  @property({ type: String }) text: string = '';

  /** Seletor CSS do elemento-alvo a ser lido */
  @property({ type: String, attribute: 'target-selector' }) targetSelector: string = '';

  /** Idioma da voz (padrão pt-BR) */
  @property({ type: String }) lang: string = 'pt-BR';

  /** Velocidade da leitura (0.5 a 2.0) */
  @property({ type: Number }) rate: number = 1.0;

  @state() private _isPlaying: boolean = false;
  @state() private _isPaused: boolean = false;

  private _utterance: SpeechSynthesisUtterance | null = null;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stop(); // Garante o cancelamento da voz ao remover o componente do DOM
  }

  private _resolveTextToRead(): string {
    if (this.text) return this.text;
    if (this.targetSelector) {
      const root = this.getRootNode() as Document | ShadowRoot;
      const target = root.querySelector(this.targetSelector);
      return target?.textContent?.trim() || '';
    }
    return '';
  }

  play(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (this._isPaused) {
      window.speechSynthesis.resume();
      this._isPlaying = true;
      this._isPaused = false;
      return;
    }

    const text = this._resolveTextToRead();
    if (!text) return;

    window.speechSynthesis.cancel(); // Cancela falas anteriores
    this._utterance = new SpeechSynthesisUtterance(text);
    this._utterance.lang = this.lang;
    this._utterance.rate = this.rate;

    this._utterance.onstart = () => {
      this._isPlaying = true;
      this._isPaused = false;
      this.dispatchEvent(new CustomEvent('fzl-speech-start', { bubbles: true, composed: true }));
    };

    this._utterance.onend = () => {
      this._isPlaying = false;
      this._isPaused = false;
      this.dispatchEvent(new CustomEvent('fzl-speech-end', { bubbles: true, composed: true }));
    };

    this._utterance.onerror = (e) => {
      this._isPlaying = false;
      this._isPaused = false;
      this.dispatchEvent(new CustomEvent('fzl-speech-error', { bubbles: true, composed: true, detail: e }));
    };

    window.speechSynthesis.speak(this._utterance);
  }

  pause(): void {
    if (window.speechSynthesis && this._isPlaying) {
      window.speechSynthesis.pause();
      this._isPlaying = false;
      this._isPaused = true;
    }
  }

  stop(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      this._isPlaying = false;
      this._isPaused = false;
    }
  }

  override render() {
    if (!this._isPlaying && !this._isPaused) {
      return html`
        <button type="button" class="tts-btn" @click=${this.play} title="Ouvir este conteúdo em voz alta">
          <span aria-hidden="true">🔊</span> Ouvir
        </button>
      `;
    }

    return html`
      <button type="button" class="tts-btn active" @click=${this._isPlaying ? this.pause : this.play} title=${this._isPlaying ? 'Pausar leitura' : 'Retomar leitura'}>
        <span aria-hidden="true">${this._isPlaying ? '⏸' : '▶'}</span> ${this._isPlaying ? 'Pausar' : 'Continuar'}
      </button>
      <button type="button" class="tts-btn" @click=${this.stop} title="Interromper leitura">
        <span aria-hidden="true">⏹</span> Parar
      </button>
    `;
  }
}
```

---

### 4.4. Armadilhas Comuns e Soluções (Gotchas & Workarounds para Programadores)

1. **Bug do Silêncio após 15 Segundos no Chromium (*The 15-second Garfield Bug*)**:
   - *Problema:* Em navegadores baseados no Chromium, o motor de áudio interno pode pausar silenciosamente a síntese de voz se um único `SpeechSynthesisUtterance` for muito longo (> 15 segundos sem interrupção).
   - *Solução Técnica:* Para textos longos (ex: relatórios de fundos ou artigos completos), o componente deve dividir o texto em sentenças (usando pontuações `.` `!` `?` ou `Intl.Segmenter`) e enfileirar utterances encadeadas.
2. **Requisito de Gesto do Usuário (*User Activation Requirement*)**:
   - O método `window.speechSynthesis.speak()` **nunca** deve ser chamado no carregamento automático da página (`DOMContentLoaded` ou `connectedCallback`). Ele deve sempre ser disparado por uma interação física e explícita do usuário (`click` ou acionamento por teclado).
3. **Limpeza Obrigatória no Descarte de Componentes**:
   - Se o usuário navegar para outra rota enquanto o leitor estiver falando, a fala continuará ao fundo se não houver limpeza. É obrigatório invocar `window.speechSynthesis.cancel()` no `disconnectedCallback()` do componente ou na troca de rota do roteador do AppShell.

---

### 4.5. Implementação Técnica do `<fzl-lit-skip-link>`

Para satisfazer o critério WCAG 2.4.1:

```typescript
import { LitElement, html, css } from 'lit';
import { property } from 'lit/decorators.js';

export class FzlLitSkipLink extends LitElement {
  static override styles = css`
    :host {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 9999;
    }
    .skip-link {
      position: absolute;
      top: -999px;
      left: 12px;
      background: var(--_fzl-color-primary, #0284c7);
      color: #ffffff;
      padding: 10px 16px;
      font-weight: 700;
      border-radius: 0 0 6px 6px;
      text-decoration: none;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      outline: 3px solid #ffffff;
      transition: top 150ms ease-in-out;
    }
    .skip-link:focus {
      top: 0;
    }
  `;

  @property({ type: String, attribute: 'target-id' }) targetId: string = 'main-content';
  @property({ type: String }) label: string = 'Pular para o conteúdo principal';

  override render() {
    return html`
      <a href="#${this.targetId}" class="skip-link">${this.label}</a>
    `;
  }
}
```

---

## 5. Estratégia de Testes Automatizados para Programadores

Todo novo widget de acessibilidade adicionado ao repositório deve ser coberto por testes unitários com Vitest + Happy DOM em `appshell-lit/src/webcomponents/`:

1. **Testes de Atributos ARIA:** Verificar que elementos interativos possuem `aria-label`, `role` e estados (`aria-expanded`, `aria-live`, `aria-hidden`) corretos.
2. **Testes de Foco e Teclado:** Simular eventos `KeyboardEvent` (`Enter`, `Space`, `Tab`, `Escape`) e verificar que os callbacks são acionados adequadamente.
3. **Mocks de APIs de Áudio e Fala:** Como o ambiente de teste de linha de comando não possui sintetizador de áudio real, deve-se mockar `window.speechSynthesis` e `SpeechSynthesisUtterance` para verificar as invocações de método.

---

## 6. Próximos Passos de Desenvolvimento

1. Incorporar as configurações de TTS no esquema de preferências de [`appshell-lit/src/a11y/config.js`](file:///home/wgn/WORKING/Projects-Srcs/Projects-Srcs-FzlSoft/fzlbpms-funds/fzl-fund-ui/appshell-lit/src/a11y/config.js).
2. Criar a interface de alternância no [`config-accessibility-view.js`](file:///home/wgn/WORKING/Projects-Srcs/Projects-Srcs-FzlSoft/fzlbpms-funds/fzl-fund-ui/appshell-lit/src/webcomponents/config-accessibility-view.js).
3. Implementar `<fzl-lit-speech-reader>` em `@fzl/webcomponents-lit` e exportá-lo para os pacotes do monorepo.
4. Integrar o botão de áudio opcional nos cartões (`<fzl-lit-card>`).
