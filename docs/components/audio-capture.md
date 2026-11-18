# Captura de Áudio (`fzl-audio-capture` / `fzl-lit-audio-capture`)

> Componente Web reativo para gravação de áudio pelo microfone (`MediaRecorder`), com medidor de nível em tempo real (Web Audio API), pausa/retomada, limite de duração e **persistência automática do binário de cada gravação no IndexedDB do navegador**. As gravações salvas aparecem em uma biblioteca integrada para ouvir, baixar e excluir.

---

## 🎯 1. Finalidade e Casos de Uso no FZL Funds / BPMS

1. **Notas de voz offline**: o operador grava observações em campo sem conexão; o áudio fica salvo no navegador até ser enviado ao backend.
2. **Evidências sonoras em processos**: registro de declarações ou confirmações verbais anexadas a um processo do BPMS.
3. **Rascunhos de entrevistas**: captura bruta de áudio para posterior transcrição (veja também `fzl-interview-transcriber`).

---

## 💾 2. Armazenamento no IndexedDB (padrão)

Com `storage="indexeddb"` (valor padrão), ao parar uma gravação o componente:

1. Monta o `Blob` final com os trechos emitidos pelo `MediaRecorder`;
2. Dispara `fzl-audio-captured` com a gravação;
3. Grava o registro no IndexedDB (banco `db-name`, object store `store-name`, chave `id`, índice `createdAt`);
4. Dispara `fzl-audio-saved` e atualiza a biblioteca.

O áudio é persistido como `ArrayBuffer` (compatível com todos os motores, inclusive WebKit antigo, que não armazenava `Blob` no IndexedDB) e é devolvido como `Blob` pela API. Com `storage="none"` nada é persistido e apenas `fzl-audio-captured` é disparado.

O mesmo armazenamento pode ser usado fora do componente pela classe `FzlAudioStore`:

```ts
import { FzlAudioStore } from '@fzl/webcomponents-lit/audio-capture';

const store = new FzlAudioStore('fzl-audio-capture', 'recordings');
const recordings = await store.list();        // mais recentes primeiro, com .blob
const one = await store.get(recordings[0].id);
await store.rename(one.id, 'Depoimento do cotista');
await store.delete(one.id);
```

---

## 💻 3. Exemplo de Uso

```html
<fzl-audio-capture
  id="voice-notes"
  max-duration="120"
  db-name="fzl-audio-capture"
  store-name="recordings">
</fzl-audio-capture>

<script type="module">
  import '@fzl/webcomponents-lit/audio-capture';

  const recorder = document.getElementById('voice-notes');

  recorder.addEventListener('fzl-audio-saved', (e) => {
    const { recording } = e.detail;
    console.log('Salvo no IndexedDB:', recording.id, recording.blob, recording.durationSeconds);
  });

  recorder.addEventListener('fzl-audio-error', (e) => {
    console.warn('Erro de áudio:', e.detail.error);
  });
</script>
```

---

## ⚙️ 4. Atributos e Propriedades

| Atributo | Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `storage` | `storage` | `'indexeddb' \| 'none'` | `'indexeddb'` | Onde as gravações finalizadas são persistidas. |
| `db-name` | `dbName` | `string` | `'fzl-audio-capture'` | Nome do banco IndexedDB. |
| `store-name` | `storeName` | `string` | `'recordings'` | Nome do object store. |
| `max-duration` | `maxDuration` | `number` | `300` | Duração máxima em segundos (`0` = ilimitado). A gravação para sozinha ao atingir o limite. |
| `mime-type` | `mimeType` | `string` | `''` | MIME type preferido; se não suportado, usa o primeiro suportado entre `audio/webm;codecs=opus`, `audio/webm`, `audio/ogg;codecs=opus`, `audio/mp4`, `audio/aac`. |
| `audio-bits-per-second` | `audioBitsPerSecond` | `number` | `0` | Taxa de bits do codificador (`0` = padrão do navegador). |
| `show-library` | `showLibrary` | `boolean` | `true` | Exibe a lista de gravações salvas. Use `show-library="false"` para ocultar. |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita as interações. |

---

## 🧰 5. Métodos Públicos

| Método | Descrição |
| :--- | :--- |
| `start()` | Solicita o microfone e inicia a gravação. |
| `stop()` | Finaliza a gravação; o resultado é emitido e (por padrão) salvo. |
| `pause()` / `resume()` | Pausa e retoma; o tempo pausado não conta na duração. |
| `toggle()` | Inicia ou para conforme o estado atual. |
| `saveRecording(recording)` | Emite `fzl-audio-captured` e persiste uma gravação (também serve para áudio obtido de outra fonte). |
| `refreshRecordings()` | Recarrega a lista a partir do IndexedDB. |
| `getRecording(id)` | Lê uma gravação com o `Blob`. |
| `deleteRecording(id)` / `clearRecordings()` | Exclui uma ou todas as gravações do object store. |
| `recordings` / `isRecording` | Getters: lista carregada e estado da gravação. |

---

## 📢 6. Eventos Disparados

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-audio-start` | `{ stream: MediaStream, mimeType: string }` | Gravação iniciada. |
| `fzl-audio-captured` | `{ recording: FzlAudioRecording }` | Gravação finalizada (sempre disparado, antes de persistir). |
| `fzl-audio-saved` | `{ recording: FzlAudioRecording }` | Gravação salva no IndexedDB. |
| `fzl-audio-deleted` | `{ id: string }` | Gravação excluída do IndexedDB. |
| `fzl-audio-error` | `{ error: string }` | Falha de permissão, microfone, gravação ou armazenamento (inclusive cota esgotada). |

---

## 🧱 7. Estruturas de Dados

```typescript
export interface FzlAudioRecording {
  id: string;
  name: string;            // "Gravação 2026-11-17 14:03:22"
  blob: Blob;
  mimeType: string;
  size: number;            // bytes
  durationSeconds: number; // sem o tempo pausado
  createdAt: number;       // epoch ms
}
```

---

## 🔒 8. Privacidade, Segurança e Limpeza de Recursos

- **Microfone liberado ao parar**: todas as `MediaStreamTrack` são finalizadas assim que a gravação termina, antes da escrita no IndexedDB, apagando o indicador de microfone do sistema.
- **Remoção do componente**: se o elemento for removido durante uma gravação, ela é descartada e o microfone é liberado.
- **Dados locais**: o IndexedDB é por origem e por navegador; as gravações não saem do dispositivo a menos que o host as envie. Limpar os dados do site apaga as gravações.
- **Cota de armazenamento**: gravações longas ocupam espaço; o erro `QuotaExceededError` é reportado via `fzl-audio-error`.
- **URLs de objeto** usadas na reprodução são revogadas ao excluir gravações e ao desconectar o componente.
- **Contexto seguro**: `getUserMedia` exige `HTTPS` ou `localhost`.
