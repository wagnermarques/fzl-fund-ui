# Formulário e Controles de Entrada (`fzl-form`)

> Conjunto de Web Components para captura, edição e validação de dados do usuário, inspirado na arquitetura de formulários do Dojo Toolkit (`dijit/form/Form` e `_FormWidget`), integrado nativamente ao ecossistema de Design Tokens e acessibilidade `@fzl`.

---

## 1. Visão Geral

O componente `<fzl-form>` atua como orquestrador de controles de entrada de dados, oferecendo:

1. **Serialização Unificada (`getValues()`)**:
   - Varre recursivamente a árvore do formulário e agrupa os valores de todos os controles nomeados (`name="campo"`) em um único objeto JavaScript plano.
2. **Hidratação de Valores (`setValues(data)`)**:
   - Popula automaticamente os controles filhos a partir de um objeto JavaScript ou registro oriundo de um `FzlStore` (`dojo/store`).
3. **Validação Coletiva (`validate()`)**:
   - Aciona a validação de cada controle individualmente, reporta mensagens de erro visuais acessíveis (`role="alert"`) e previne submissão inválida.
4. **Detecção de Alterações (`isDirty()`) e Reset (`reset()`)**:
   - Compara o estado atual com o snapshot inicial para habilitar ações contextuais de salvar/descartar.

### Controles Básicos Incluídos

* **`<fzl-text-input>` (`ValidationTextBox`)**: Campo de texto com suporte a obrigatoriedade (`required`), padrões regex (`pattern`), tamanho mínimo/máximo (`minlength`/`maxlength`), botão de limpeza rápida e mensagens de ajuda/erro.
* **`<fzl-number-input>` (`NumberTextBox` / `CurrencyTextBox`)**: Campo numérico e monetário com prefixo/sufixo ("R$ ", "%"), limites (`min`/`max`), passo (`step`) e botões de incremento/decremento acelerados por pressão contínua via `FzlTypematicController`.
* **`<fzl-select>` (`Select` / `FilteringSelect`)**: Dropdown estilizável com suporte a lista de opções (`options`) e slotted `<option>`.
* **`<fzl-checkbox>` (`CheckBox`)**: Caixa de seleção acessível com rótulo clicável.

---

## 2. Exemplo de Uso

```html
<fzl-form id="meu-formulario">
  <fzl-text-input
    name="nome"
    label="Nome Completo"
    placeholder="Digite seu nome"
    required
  ></fzl-text-input>

  <fzl-number-input
    name="salario"
    label="Pretensão Salarial"
    prefix="R$ "
    step="100"
    min="0"
    required
  ></fzl-number-input>

  <fzl-select
    name="cargo"
    label="Cargo Desejado"
    .options=${[
      { value: 'frontend', label: 'Desenvolvedor Frontend' },
      { value: 'backend', label: 'Desenvolvedor Backend' }
    ]}
    required
  ></fzl-select>

  <fzl-checkbox
    name="termos"
    label="Concordo com as políticas de privacidade"
  ></fzl-checkbox>

  <button type="submit">Enviar Dados</button>
</fzl-form>

<script>
  const form = document.getElementById('meu-formulario');

  form.addEventListener('fzl-submit', (e) => {
    const dados = e.detail; // Objeto { nome: '...', salario: 5000, cargo: 'frontend', termos: true }
    console.log('Formulário válido submetido:', dados);
  });
</script>
```

---

## 3. Propriedades e Métodos do `<fzl-form>`

| Método | Retorno | Descrição |
| :--- | :--- | :--- |
| `getValues()` | `Record<string, any>` | Retorna um objeto com todos os valores dos campos nomeados. |
| `setValues(data)` | `void` | Preenche os campos nomeados com as propriedades do objeto fornecido. |
| `validate()` | `boolean` | Executa a validação de todos os campos. Retorna `true` se todos forem válidos. |
| `reset()` | `void` | Limpa todos os campos para os valores padrão. |
| `isDirty()` | `boolean` | Retorna `true` se os valores atuais diferem do snapshot inicial. |

---

## 4. Eventos Customizados

| Evento | Objeto `detail` | Descrição |
| :--- | :--- | :--- |
| `fzl-submit` | `Record<string, any>` | Disparado ao submeter o formulário após validação com sucesso. |
| `fzl-change` | `{ detail, values }` | Disparado quando qualquer controle filho tem seu valor modificado. |
