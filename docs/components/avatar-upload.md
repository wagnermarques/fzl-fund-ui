# Avatar Upload com Recorte Redondo (`fzl-lit-avatar-upload`)

> Web Component interativo e acessível para seleção, pré-visualização e recorte circular ("crop redondo") de avatares e fotos de perfil, com saída desacoplada pronta para integração com qualquer backend.

---

## 1. Visão Geral

O `<fzl-lit-avatar-upload>` resolve de forma elegante e padronizada a experiência de envio de foto de perfil em aplicações web. Ele combina:

1. **Pré-visualização Circular do Avatar**: Exibição em círculo estilizado com fallback inteligente para iniciais maiúsculas do nome (ex.: "WM") ou ícone neutro de usuário.
2. **Seleção Flexível**: Acionamento por clique, teclado (Enter/Espaço) ou arrastar-e-soltar (drag & drop) diretamente sobre o avatar.
3. **Modal Interativo de Recorte Redondo**:
   - Canvas com máscara circular (região externa escurecida) e guias visuais.
   - Zoom suave via controle deslizante (slider), botões +/- ou roda do mouse (wheel).
   - Pan (arraste e posicionamento) com mouse ou toque em telas sensíveis.
   - Rotação de 90° para corrigir fotos tiradas em dispositivos móveis.
4. **Desacoplamento Completo do Backend**:
   - Exporta imagem recortada tanto em **Base64 Data URL** (para visualização instantânea ou armazenamento local) quanto em **Binary Blob** (ideal para envio via `FormData` / `multipart/form-data` ou S3 presigned URL).
   - Emite eventos customizados (`fzl-avatar-change`, `fzl-avatar-remove`, `fzl-avatar-error`) que permitem que qualquer backend (REST, GraphQL, Supabase, Firebase, S3) seja plugado posteriormente sem tocar no componente.
5. **Acessibilidade e Alto Contraste**:
   - Totalmente operável por teclado.
   - Anúncios de acessibilidade para leitores de tela (`aria-label`, `role="button"`).
   - Compatível com High Contrast Mode (`@media (forced-colors: active)` e `[data-fzl-hc]`).
   - Construído com `FzlWidgetMixin` da arquitetura `@fzl/core` inspirada em Dijit.

---

## 2. Exemplo de Uso

```html
<!-- Avatar com foto existente -->
<fzl-lit-avatar-upload
  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"
  name="Wagner Marques"
  size="120"
></fzl-lit-avatar-upload>

<!-- Avatar sem foto (mostra iniciais "WM") -->
<fzl-lit-avatar-upload
  name="Wagner Marques"
  size="120"
  crop-title="Ajustar foto de perfil"
></fzl-lit-avatar-upload>
```

### Integração com JavaScript / Backend

```javascript
const avatarEl = document.querySelector('fzl-lit-avatar-upload');

avatarEl.addEventListener('fzl-avatar-change', async (event) => {
  const { dataUrl, blob, file, name } = event.detail;

  console.log('Foto recortada em dataUrl:', dataUrl);
  console.log('Blob binário para envio:', blob);

  // Exemplo de envio para API REST backend:
  const formData = new FormData();
  formData.append('avatar', blob, 'avatar.png');

  try {
    const res = await fetch('/api/user/avatar', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    console.log('Upload concluído com sucesso:', data.url);
  } catch (err) {
    console.error('Falha no upload:', err);
  }
});

avatarEl.addEventListener('fzl-avatar-remove', async () => {
  await fetch('/api/user/avatar', { method: 'DELETE' });
});
```

---

## 3. Propriedades e Atributos

| Propriedade | Atributo | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `src` | `src` | `string` | `""` | URL ou Data URL da imagem atual do avatar. |
| `name` | `name` | `string` | `""` | Nome do usuário para gerar iniciais de fallback e `aria-label`. |
| `size` | `size` | `number` | `120` | Diâmetro do avatar exibido na tela em pixels. |
| `outputSize` | `output-size` | `number` | `360` | Resolução (largura e altura) da imagem exportada no recorte. |
| `outputFormat`| `output-format`| `string` | `'image/png'` | Formato de exportação: `'image/png'`, `'image/jpeg'` ou `'image/webp'`. |
| `outputQuality`| `output-quality`| `number` | `0.92` | Qualidade de compressão (0 a 1) para JPEG ou WebP. |
| `accept` | `accept` | `string` | `'image/png, image/jpeg, ...'` | Tipos MIME aceitos no seletor de arquivos. |
| `maxFileSize` | `max-file-size` | `number` | `5242880` (5MB) | Tamanho máximo de arquivo permitido em bytes. |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita a interação com o avatar. |
| `readonly` | `readonly` | `boolean` | `false` | Apenas exibe a foto/iniciais sem controles de edição. |
| `buttonLabel` | `button-label` | `string` | `'Alterar foto'` | Rótulo do botão de ação abaixo do avatar. |
| `cropTitle` | `crop-title` | `string` | `'Recortar foto de perfil'` | Título exibido no cabeçalho do diálogo de recorte. |

---

## 4. Eventos Customizados

| Evento | Detalhes (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-avatar-change` | `{ dataUrl: string, blob: Blob, file: File, name: string }` | Disparado quando o usuário conclui o recorte e clica em "Aplicar corte". |
| `fzl-avatar-remove` | `void` | Disparado quando o usuário clica em "Remover foto". |
| `fzl-avatar-error` | `{ error: 'file-too-large' \| 'invalid-type' \| 'read-error', message: string, file?: File }` | Disparado se a validação do arquivo falhar. |
| `fzl-focus` | `{ widgetId: string, originalEvent: FocusEvent }` | Emitido quando o widget ganha foco pelo registry `@fzl/core`. |
| `fzl-blur` | `{ widgetId: string, originalEvent: FocusEvent }` | Emitido quando o widget perde o foco. |

---

## 5. CSS Shadow Parts

| Nome da Part | Descrição |
| :--- | :--- |
| `container` | Elemento raiz do widget. |
| `avatar` | Contêiner circular interativo do avatar (gatilho). |
| `image` | Elemento `<img>` da foto exibida. |
| `badge` | Ícone de câmera no canto do avatar. |
| `actions` | Contêiner dos botões de ação abaixo do avatar. |
| `modal` | Camada de scrim / backdrop do modal de recorte. |
| `dialog` | Caixa de diálogo do modal de recorte. |
