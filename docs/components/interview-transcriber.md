# Interview Transcriber (`fzl-lit-interview-transcriber`)

Componente Web reativo em Lit para gravação de voz e transcrição em tempo real voltado à **pesquisa qualitativa** (entrevistas em profundidade, grupos focais, etnografia, testes de usabilidade e coleta de campo), com persistência estruturada do áudio e texto no backend.

---

## 🎯 Finalidade e Caso de Uso na Pesquisa Qualitativa

Na metodologia de pesquisa qualitativa (ciências sociais, UX research, compliance, saúde e finanças), o registro fidedigno da fala do participante é essencial. O `<fzl-lit-interview-transcriber>` resolve as principais dores do pesquisador:

1. **Captura Robusta de Áudio**: Gravação local com `MediaRecorder` em formatos compactos (`audio/webm;codecs=opus`), com suporte a pausar, retomar e concluir.
2. **VU Meter em Tempo Real**: Feedback visual contínuo do nível sonoro através da `Web Audio API` (`AnalyserNode`), evitando gravações mudas ou com volume insuficiente.
3. **Transcrição Assistida ao Vivo**: Reconhecimento de fala via `Web Speech API` (`SpeechRecognition`), permitindo que a fala seja convertida em texto imediatamente enquanto a entrevista acontece.
4. **Instrumentação Qualitativa**: Barra de ferramentas com botões de inserção rápida de metadados:
   - Inserção de timestamp de tempo decorrido `[00:02:15]`.
   - Tags de troca de interlocutor: `[Entrevistador]: ` e `[Participante]: `.
   - Inserção de notas de campo/observação etnográfica: `[Nota do Pesquisador: ...]`.
5. **Auditoria Ética e Consentimento (TCLE)**: Campo obrigatório para confirmação do Termo de Consentimento Livre e Esclarecido antes do salvamento.
6. **Persistência Completa no Backend**: Envio unificado via `FormData` (`audio.webm` + JSON com transcrição e metadados) ou disparo de evento desacoplado para a arquitetura do shell.
7. **Redundância e Segurança de Campo**: Opções de exportação/download local imediato do áudio (`.webm`) e da transcrição (`.json`) caso o pesquisador esteja sem conexão com o servidor.

---

## 💻 Exemplo de Uso

```html
<fzl-lit-interview-transcriber
  interview-id="INT-20261111-001"
  participant-id="P-04"
  interviewer="Dr. Wagner"
  topic="Percepção de Riscos em Fundos Imobiliários"
  language="pt-BR"
  save-url="/api/qualitative/interviews"
  auto-transcribe>
</fzl-lit-interview-transcriber>
```

---

## ⚙️ Atributos e Propriedades

| Atributo | Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `interview-id` | `interviewId` | `string` | Auto-gerado (`INT-...`) | Identificador único da sessão de entrevista. |
| `participant-id` | `participantId` | `string` | `'P-01'` | Código anonimizado ou pseudônimo do informante. |
| `interviewer` | `interviewer` | `string` | `'Pesquisador'` | Nome ou matrícula do pesquisador responsável. |
| `topic` | `topic` | `string` | `'Entrevista Qualitativa'` | Tema, seção do roteiro ou pergunta norteadora. |
| `language` | `language` | `string` | `'pt-BR'` | Código de idioma para o reconhecimento de fala. |
| `auto-transcribe` | `autoTranscribe` | `boolean` | `true` | Ativa a transcrição automática contínua durante a fala. |
| `save-url` | `saveUrl` | `string` | `''` | Endpoint REST para onde o `FormData` com áudio e texto será enviado. |
| `backend` | `backend` | `string` | `''` | Identificador do backend configurado no AppShell (`backend-service`). |
| `consent-confirmed` | `consentConfirmed` | `boolean` | `true` | Confirmação do TCLE / ética da pesquisa. |
| `allow-download` | `allowDownload` | `boolean` | `true` | Exibe botões de download de segurança do áudio e transcrição. |
| `read-only` | `readOnly` | `boolean` | `false` | Desabilita controles de gravação e edição de notas. |

---

## 📢 Eventos Disparados

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-recording-state-change` | `{ state: 'idle' \| 'recording' \| 'paused' \| 'stopped' }` | Disparado quando o ciclo de gravação muda de estado. |
| `fzl-transcription-update` | `{ transcript: string, interimTranscript: string, isFinal: boolean }` | Disparado a cada atualização da transcrição ou fala captada. |
| `fzl-interview-save` | Objeto completo da entrevista (`FzlInterviewSaveEventDetail`) | Disparado quando o usuário clica em "Salvar no Backend". |
| `fzl-interview-saved` | `{ interviewId: string }` | Disparado após sucesso no envio para a API remota. |
| `fzl-interview-error` | `{ message: string, error?: any }` | Disparado caso ocorra falha de microfone, transcrição ou rede. |

---

## 📦 Estrutura do Payload Enviado ao Backend

Quando o botão **Salvar no Backend** é acionado com `save-url`, uma requisição `POST` é enviada com corpo `multipart/form-data`:

```
POST /api/qualitative/interviews HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary...

------WebKitFormBoundary...
Content-Disposition: form-data; name="interviewId"
INT-20261111150000-A1B2
------WebKitFormBoundary...
Content-Disposition: form-data; name="participantId"
P-04
------WebKitFormBoundary...
Content-Disposition: form-data; name="interviewer"
Dr. Wagner
------WebKitFormBoundary...
Content-Disposition: form-data; name="topic"
Avaliação de Risco e Liquidez
------WebKitFormBoundary...
Content-Disposition: form-data; name="durationSeconds"
245
------WebKitFormBoundary...
Content-Disposition: form-data; name="transcript"
[00:00:02] [Entrevistador]: Como você avalia a segurança deste fundo?
[00:00:15] [P-04]: Na minha visão, o histórico de distribuição de dividendos passa confiança.
------WebKitFormBoundary...
Content-Disposition: form-data; name="tags"
["pesquisa-qualitativa", "risco", "dividendos"]
------WebKitFormBoundary...
Content-Disposition: form-data; name="audio"; filename="INT-20261111150000-A1B2.webm"
Content-Type: audio/webm;codecs=opus
<binary audio stream>
```

---

## 🎨 Tematização (Design Tokens)

O componente consome diretamente as variáveis de design tokens `@fzl/design-tokens`:

- `--_fzl-color-primary`: Cor de destaque do botão de salvar e foco.
- `--_fzl-color-danger`: Cor do botão de gravação e indicador `REC ●`.
- `--_fzl-color-surface` / `--_fzl-color-surface-muted`: Superfícies dos cartões e formulários.
- `--_fzl-color-border`: Bordas de campos de entrada e divisores.
- `--_fzl-radius-md` / `--_fzl-radius-sm`: Arredondamento harmônico com o AppShell.
