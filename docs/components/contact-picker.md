# Seletor de Contatos Mobile (`fzl-contact-picker` / `fzl-lit-contact-picker`)

> Componente Web reativo mobile-first para seleção de contatos da agenda telefônica através da W3C Contact Picker API (`navigator.contacts.select`), com interface de fallback completa para ambientes desktop ou navegadores sem suporte (importação de arquivos vCard `.vcf` e cadastro manual).

---

## 🎯 1. Finalidade e Casos de Uso no FZL Funds / BPMS

Em aplicações corporativas modernas e soluções financeiras, a experiência do usuário no celular exige agilidade na entrada de dados. Em vez de obrigar o usuário a alternar entre aplicativos e copiar números de telefone ou e-mails manualmente, o `<fzl-contact-picker>` conecta-se à agenda nativa do dispositivo:

1. **Transferências e Pagamentos PIX**: Seleção instantânea de chave PIX a partir de contatos da agenda (telefone ou e-mail).
2. **Indicação e Cadastro de Cotistas**: Adição rápida de sócios, investidores e co-titulares de contas em fundos de investimento.
3. **Compartilhamento de Relatórios e Extratos**: Envio direto de comunicados, atas de assembleias e informes de rendimentos para os contatos selecionados.
4. **Governança e Procuradores**: Registro ágil de contatos de emergência e procuradores autorizados na carteira.

---

## 📱 2. Como Funciona: Detecção Nativa vs Fallback Elegante

O componente adota o padrão de **Progressive Enhancement**:

- **No Celular (Navegadores com suporte - ex.: Chrome Android)**:
  - Invoca nativamente `navigator.contacts.select(properties, { multiple })`.
  - O sistema operacional exibe o diálogo nativo da agenda do usuário com controle de privacidade (o usuário escolhe explicitamente quais contatos compartilhar).
  - O componente recebe os dados autorizados (`name`, `tel`, `email`, `address`, `icon`) e emite o evento `fzl-contact-select`.
- **No Desktop ou Navegadores sem suporte**:
  - Abre um modal acessível e responsivo com 3 alternativas:
    1. **Lista de Contatos Pré-carregados (`preset-contacts`)**: lista corporativa ou contatos favoritos da organização.
    2. **Formulário Manual**: campos para nome, telefone, e-mail e empresa/cargo com validação instantânea.
    3. **Importador vCard (`.vcf`)**: área de upload com suporte a *drag-and-drop* e clique, compatível com arquivos exportados do Google Contatos, Apple iCloud/iOS e Android.

---

## 💻 3. Exemplo de Uso

```html
<fzl-contact-picker
  id="picker-cotistas"
  button-label="Convidar Cotista da Agenda"
  multiple
  properties="name,tel,email"
  allow-import-vcard
  allow-manual-add>
</fzl-contact-picker>

<script type="module">
  import '@fzl/webcomponents-lit/contact-picker';

  const picker = document.getElementById('picker-cotistas');

  // Opcional: configurar contatos pré-definidos para o fallback
  picker.presetContacts = [
    {
      id: 'fav-1',
      name: ['Carlos Eduardo Silva'],
      tel: ['+55 (11) 98765-4321'],
      email: ['carlos@exemplo.com.br'],
      organization: 'FZL Advisory'
    }
  ];

  picker.addEventListener('fzl-contact-select', (e) => {
    console.log('Contatos selecionados:', e.detail.contacts);
    console.log('Origem nativa?', e.detail.isNative);
  });

  picker.addEventListener('fzl-contact-remove', (e) => {
    console.log('Contato removido:', e.detail.contact);
  });
</script>
```

---

## ⚙️ 4. Atributos e Propriedades

| Atributo | Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `multiple` | `multiple` | `boolean` | `false` | Se permite selecionar múltiplos contatos ou apenas um contato por vez. |
| `properties` | `properties` | `string` | `'name,tel,email'` | Propriedades da agenda a serem solicitadas (`name`, `tel`, `email`, `address`, `icon`). |
| `button-label` | `buttonLabel` | `string` | `'Selecionar Contato'` | Rótulo do botão principal de acionamento. |
| `allow-import-vcard` | `allowImportVcard` | `boolean` | `true` | Habilita a aba de importação de arquivos vCard (`.vcf`) no modal de fallback. |
| `allow-manual-add` | `allowManualAdd` | `boolean` | `true` | Habilita a aba de digitação manual de contatos no modal de fallback. |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita interações com o componente. |
| `readonly` | `readonly` | `boolean` | `false` | Modo somente leitura (exibe os contatos selecionados sem botões de remoção ou seleção). |
| — | `selectedContacts` | `FzlContact[]` | `[]` | Lista dos contatos atualmente selecionados. |
| `preset-contacts` | `presetContacts` | `FzlContact[] \| string` | `[]` | Lista ou JSON de contatos sugeridos para seleção rápida no modo de compatibilidade. |

---

## 📢 5. Eventos Disparados

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-contact-select` | `{ contacts: FzlContact[], isNative: boolean }` | Disparado quando um ou mais contatos são selecionados (seja via API nativa ou fallback). |
| `fzl-contact-remove` | `{ contact: FzlContact, remaining: FzlContact[] }` | Disparado ao remover um contato da lista de selecionados. |
| `fzl-contact-error` | `{ error: string, originalError?: any }` | Disparado quando ocorre um erro na API ou na leitura do arquivo vCard. |

---

## 🧱 6. Interface de Dados `FzlContact`

```typescript
export interface FzlContact {
  id: string;
  name?: string[];
  tel?: string[];
  email?: string[];
  address?: string[];
  icon?: (Blob | string)[];
  organization?: string;
  note?: string;
}
```

---

## ♿ 7. Acessibilidade (WCAG 2.1 AA) & Segurança

- **Avisos de permissão**: O componente respeita a política de segurança de navegadores (exige contexto HTTPS ou `localhost`).
- **Navegação por Teclado**: O modal e todos os botões de ação e exclusão possuem suporte a foco visível (`:focus-visible`), tecla `Esc` para fechar e rótulos acessíveis (`aria-label`).
- **Feedback Visual**: Badges indicam claramente se o dispositivo está executando a **Agenda Nativa** ou o **Modo Web / vCard**.
