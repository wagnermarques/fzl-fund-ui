# Barra de Marcação e Seleção do Leitor (`fzl-reader-mark-bar`)

> Web Component moderno de barra de ação e paleta de cores para leitura, estudo bíblico e seleção de textos em dispositivos móveis e desktop, projetado para eliminar conflitos com gestos do Android, Touch-to-Search e painéis do sistema.

---

## 1. Visão Geral e Contexto de UX

Em aplicativos de leitura e estudo bíblico em dispositivos móveis (especialmente navegadores Chrome no Android), modais e barras fixadas no rodapé (`bottom: 0`) causam severos problemas de usabilidade:

1. **Conflito com o Touch to Search (Google Lens)**: O painel inferior do Android sobe a partir de `bottom: 0` assim que o texto é selecionado, colidindo e sobrepondo a barra de marcação.
2. **Barra de Gestos do Sistema**: As alças de navegação por gestos do sistema operacional ficam na mesma zona de toque.
3. **Quebra de Fluidez**: Modais bloqueiam a rolagem e impedem que o leitor continue ajustando os marcadores de seleção de texto.

O componente `<fzl-reader-mark-bar>` resolve este desafio oferecendo **3 estratégias ergonômicas de posicionamento**:

---

### As 3 Estratégias de Exibição

#### Opção 1: Pílula Flutuante Arrastável (*Draggable Floating Island*) — `mode="floating"` (Padrão)
* **Posição Inicial Elevada e Segura**: Surge flutuando a uma distância segura da base (`bottom: 76px`), centralizada e fora da área de disparo do Touch to Search do Android.
* **Alça de Arrasto Livre (Drag Handle)**: O leitor pode arrastar a pílula livremente com o polegar (`pointermove` / `touchmove`) para qualquer posição da tela caso ela cubra os versículos que deseja continuar lendo.
* **Inversão Rápida (`swap_vert`)**: Um botão conveniente na pílula permite alternar com um único toque entre o topo e a base elevada.

#### Opção 2: Barra de Ação Contextual no Topo (*Top Action Bar*) — `mode="top"`
* Desliza suavemente a partir do topo da tela (logo abaixo do cabeçalho da aplicação).
* **Zero conflito com o Android**: Mantém toda a porção inferior da tela livre para os polegares ajustarem as alças de seleção e rolagem.

#### Opção 3: Balão Ancorado na Seleção (*Bubble Popover*) — `mode="bubble"`
* Estilo *Medium* / *Kindle*: O balão surge ancorado diretamente acima ou abaixo do trecho selecionado com uma seta apontadora (`bubble-arrow`), recalculando automaticamente a posição com detecção de bordas da viewport.

---

## 2. Paleta de Cores e Ferramentas

O componente traz uma paleta de 6 cores suaves e contrastantes desenvolvidas para leitura contínua:

| Cor | Nome | Fundo | Borda |
| :--- | :--- | :--- | :--- |
| **Amarelo** | Amarelo Destaque | `#fef08a` | `#eab308` |
| **Verde** | Verde Esperança | `#bbf7d0` | `#22c55e` |
| **Azul** | Azul Estudo | `#bfdbfe` | `#3b82f6` |
| **Rosa** | Rosa / Salmão | `#fbcfe8` | `#ec4899` |
| **Roxo** | Roxo / Lilás | `#e9d5ff` | `#a855f7` |
| **Laranja** | Laranja Atenção | `#fed7aa` | `#f97316` |

### Ações de Estudo Integradas

* **Grifo / Destaque**: Aplicação da cor selecionada no trecho.
* **Sublinhado (`format_underlined`)**: Aplica sublinhado ondulado com contraste.
* **Adicionar Nota (`edit_note`)**: Abre o fluxo de anotações ou reflexões para o versículo.
* **Copiar Trecho (`content_copy`)**: Copia o texto para a área de transferência com feedback visual temporário (*"Copiado!"*).
* **Compartilhar (`share`)**: Dispara o compartilhamento nativo ou customizado do versículo.
* **Limpar Marcação (`format_color_reset`)**: Remove a marcação do trecho.

---

## 3. Exemplo de Uso

### Uso Simples com Detecção Automática de Seleção

```html
<!-- Importa os componentes -->
<script type="module" src="@fzl/webcomponents-lit/reader-mark-bar"></script>
<script type="module" src="@fzl/webcomponents-lit/reader-content"></script>

<!-- Container com texto e barra integrada -->
<fzl-reader-content
  passage-title="Salmos 23"
  passage-meta="Nova Versão Internacional (NVI)"
  mode="floating"
></fzl-reader-content>
```

### Uso da Barra Conectada a Qualquer Área de Leitura

```html
<article id="artigo-estudo">
  <p>Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito...</p>
</article>

<fzl-reader-mark-bar
  target="#artigo-estudo"
  watch-selection
  mode="floating"
></fzl-reader-mark-bar>

<script>
  const markBar = document.querySelector('fzl-reader-mark-bar');

  markBar.addEventListener('fzl-mark', (e) => {
    const { color, text } = e.detail;
    console.log(`Texto marcado com ${color.name}: "${text}"`);
  });

  markBar.addEventListener('fzl-reader-action', (e) => {
    const { action, text } = e.detail;
    if (action === 'note') {
      console.log('Abrir diálogo de anotação para:', text);
    }
  });
</script>
```

---

## 4. Propriedades e Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `mode` | `'floating' \| 'top' \| 'bubble'` | `'floating'` | Modo de exibição e posicionamento da barra. |
| `visible` | `visible` | `boolean` | `false` | Se a barra está atualmente visível na tela. |
| `colors` | — | `MarkColorItem[]` | `DEFAULT_MARK_COLORS` | Lista de cores disponíveis para grifo. |
| `selectedText` | `selected-text` | `string` | `''` | Texto selecionado atualmente. |
| `target` | `target` | `string` | `''` | Seletor CSS do elemento leitor monitorado. |
| `watchSelection` | `watch-selection` | `boolean` | `false` | Se monitora automaticamente eventos de seleção de texto. |

---

## 5. Métodos Públicos

| Método | Argumentos | Descrição |
| :--- | :--- | :--- |
| `showAt(rect?, text?)` | `rect?: DOMRect, text?: string` | Exibe a barra calculando a posição ideal para o modo ativo. |
| `hide()` | — | Oculta a barra e emite o evento `fzl-bar-close`. |
| `toggleVerticalPosition()` | — | Alterna instantaneamente a posição entre o rodapé elevado e o topo no modo flutuante. |

---

## 6. Eventos Customizados

| Evento | Objeto `detail` | Descrição |
| :--- | :--- | :--- |
| `fzl-mark` | `{ color, action, text, range }` | Disparado ao selecionar uma das cores de marcação. |
| `fzl-reader-action` | `{ action, text, range }` | Disparado ao clicar em ações (`underline`, `note`, `copy`, `share`, `clear`). |
| `fzl-drag-end` | `{ x, y }` | Disparado ao finalizar o arraste da barra flutuante. |
| `fzl-bar-close` | `{ selectedText }` | Disparado ao fechar ou dispensar a barra. |
