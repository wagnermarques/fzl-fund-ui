# Reader ChapterView (`fzl-reader-chapterview`)

> Componente padronizado de chip / tag / badge para leitores, barras de filtros, seleção de capítulos e categorização.

---

## 1. Visão Geral

O `<fzl-reader-chapterview>` e seu contêiner `<fzl-reader-chapterview-group>` fornecem botões compactos interativos em formato de pílula (chips/tags) com suporte a:
- Estado ativo / selecionado (`selected`)
- Badge numérico de contagem (`count`)
- Botão de remoção opcional (`removable`)
- Cores customizadas via Design Tokens
- Modos de seleção única ou múltipla (`selectionMode="single" | "multiple" | "none"`)
- Roving tabindex e navegação acessível por teclado (setas, Enter, Espaço)
- Suporte a alto contraste (WCAG AAA)

---

## 2. Exemplo de Uso

```html
<!-- Chip individual -->
<fzl-reader-chapterview label="Estudo Bíblico" count="12"></fzl-reader-chapterview>

<!-- Chip removível -->
<fzl-reader-chapterview label="Favorito" removable></fzl-reader-chapterview>

<!-- Grupo de chips com seleção única -->
<fzl-reader-chapterview-group selection-mode="single">
  <fzl-reader-chapterview label="Todos" selected></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Doutrina" count="5"></fzl-reader-chapterview>
  <fzl-reader-chapterview label="Oração" count="3"></fzl-reader-chapterview>
</fzl-reader-chapterview-group>
```
