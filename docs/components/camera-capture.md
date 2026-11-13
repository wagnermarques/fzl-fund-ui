# Câmera e Captura de Mídia (`fzl-camera-capture` / `fzl-lit-camera-capture`)

> Componente Web reativo mobile-first para captura de fotos em alta resolução e gravação de vídeos diretamente pela câmera do celular ou computador, com visor em tempo real, alternância entre câmera frontal e traseira, controle de lanterna/tocha (*torch*), máscaras de enquadramento (documento e biometria facial), temporizador regressivo e fallback via HTML5 Media Capture.

---

## 🎯 1. Finalidade e Casos de Uso no FZL Funds / BPMS

Operações financeiras modernas exigem validação de identidade e coleta de evidências visuais no próprio dispositivo do usuário:

1. **Biometria Facial e Vivacidade (KYC - Know Your Customer)**:
   - Captura de selfie com a câmera frontal utilizando a máscara de enquadramento ovalada (`overlay="face"`) para abertura e ativação de contas de cotistas.
2. **Fotografia e Digitalização de Documentos**:
   - Enquadramento nítido de CNH, RG, comprovantes de residência e contratos assinados com a máscara retangular (`overlay="document"`) e disparo de alta resolução.
3. **Vistoria de Imóveis em Fundos Imobiliários (FIIs)**:
   - Registro em foto e gravação de vídeo das condições estruturais de galpões logísticos, lajes corporativas ou shopping centers da carteira do fundo, com câmera traseira (`facing-mode="environment"`) e iluminação auxiliar por lanterna (`allow-torch`).
4. **Depoimentos e Evidências em Processos**:
   - Gravação de vídeos curtos com áudio e limite de tempo configurável (`max-video-duration="60"`).

---

## 📱 2. Recursos e Funcionalidades Mobile

- **Visor em Tempo Real (Live Viewfinder)**:
  - Streaming direto através de `navigator.mediaDevices.getUserMedia()`, com espelhamento automático na câmera frontal para uma experiência natural de selfie.
- **Alternância de Câmeras (Flip Camera)**:
  - Botão de alternância instantânea entre a câmera frontal (`user`) e a câmera traseira (`environment`).
- **Controle de Lanterna / Tocha (*Torch*)**:
  - Detecção automática de hardware com suporte a tocha (`track.getCapabilities().torch`) e ativação contínua da iluminação via `applyConstraints`.
- **Modos de Captura**:
  - `mode="photo"`: modo dedicado para fotografia estática em alta resolução via Canvas HTML5.
  - `mode="video"`: modo dedicado para gravação de vídeo e áudio via `MediaRecorder` com contador de tempo (*REC 00:15 / 01:00*) e indicador pulsante.
  - `mode="both"`: exibe abas táteis para alternar livremente entre câmera fotográfica e gravador de vídeo.
- **Temporizador Regressivo (*Countdown*)**:
  - Contagem regressiva na tela (ex.: 3 segundos) antes do disparo da foto.
- **Tela de Revisão (*Review Screen*)**:
  - Após a captura, o componente exibe a imagem ou o vídeo gravado com reprodutor integrado, permitindo ao usuário **Confirmar** ou **Descartar e Repetir**.
- **Fallback Automático e Acessível**:
  - Caso o navegador não suporte `getUserMedia` ou o usuário negue a permissão de câmera, o componente disponibiliza um botão alternativo com `<input type="file" accept="image/*,video/*" capture="environment">`, garantindo funcionamento em qualquer plataforma.

---

## 💻 3. Exemplo de Uso

```html
<fzl-camera-capture
  id="camera-kyc"
  mode="both"
  facing-mode="environment"
  overlay="document"
  max-video-duration="30"
  allow-torch
  allow-flip>
</fzl-camera-capture>

<script type="module">
  import '@fzl/webcomponents-lit/camera-capture';

  const camera = document.getElementById('camera-kyc');

  // Foto capturada e confirmada
  camera.addEventListener('fzl-capture-photo', (e) => {
    const { photo } = e.detail;
    console.log('Foto Blob:', photo.blob);
    console.log('Foto DataURL:', photo.dataUrl);
    console.log('Resolução:', photo.width, 'x', photo.height);
  });

  // Vídeo gravado e confirmado
  camera.addEventListener('fzl-capture-video', (e) => {
    const { video } = e.detail;
    console.log('Vídeo Blob:', video.blob);
    console.log('Duração em segundos:', video.durationSeconds);
    console.log('MIME Type:', video.mimeType);
  });

  // Erros de permissão ou hardware
  camera.addEventListener('fzl-camera-error', (e) => {
    console.warn('Erro de câmera:', e.detail.error);
  });
</script>
```

---

## ⚙️ 4. Atributos e Propriedades

| Atributo | Propriedade | Tipo | Padrão | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `mode` | `mode` | `'both' \| 'photo' \| 'video'` | `'both'` | Modo de operação da câmera. |
| `facing-mode` | `facingMode` | `'user' \| 'environment'` | `'environment'` | Câmera inicial ativa (frontal ou traseira). |
| `overlay` | `overlay` | `'none' \| 'document' \| 'face'` | `'none'` | Guia visual de enquadramento sobre o visor. |
| `max-video-duration` | `maxVideoDuration` | `number` | `60` | Duração máxima de vídeo em segundos antes da parada automática. |
| `image-quality` | `imageQuality` | `number` | `0.92` | Qualidade de compressão da foto (de `0.1` a `1.0`). |
| `image-format` | `imageFormat` | `'image/jpeg' \| 'image/webp' \| 'image/png'` | `'image/jpeg'` | Formato MIME da foto gerada. |
| `allow-torch` | `allowTorch` | `boolean` | `true` | Se exibe o botão de lanterna quando o dispositivo oferecer suporte. |
| `allow-flip` | `allowFlip` | `boolean` | `true` | Se permite alternar entre câmeras frontal e traseira. |
| `countdown` | `countdown` | `number` | `0` | Segundos do temporizador regressivo para fotos (`0` para disparo imediato). |
| `disabled` | `disabled` | `boolean` | `false` | Desabilita interações e acionamento da câmera. |

---

## 📢 5. Eventos Disparados

| Evento | Detalhe (`event.detail`) | Descrição |
| :--- | :--- | :--- |
| `fzl-capture-photo` | `{ photo: FzlCapturedPhoto }` | Disparado quando uma fotografia é capturada e confirmada na tela de revisão. |
| `fzl-capture-video` | `{ video: FzlCapturedVideo }` | Disparado quando uma gravação de vídeo é concluída e confirmada. |
| `fzl-camera-ready` | `{ stream: MediaStream, facingMode: string }` | Disparado quando o fluxo de vídeo da câmera foi iniciado com sucesso. |
| `fzl-camera-error` | `{ error: string }` | Disparado caso a permissão seja recusada ou o dispositivo não possua câmera. |
| `fzl-camera-stop` | `void` | Disparado quando o fluxo da câmera é encerrado. |

---

## 🧱 6. Estruturas de Dados

```typescript
export interface FzlCapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  timestamp: number;
}

export interface FzlCapturedVideo {
  blob: Blob;
  objectUrl: string;
  durationSeconds: number;
  mimeType: string;
  timestamp: number;
}
```

---

## 🔒 7. Privacidade, Segurança e Limpeza de Recursos

- **Encerramento Automático**: Todas as faixas de mídia (`MediaStreamTrack`) são explicitamente finalizadas via `.stop()` quando o componente é destruído ou fechado, garantindo que o LED de privacidade da câmera no celular/notebook seja desligado imediatamente.
- **Revogação de URLs de Objeto**: Objetos Blob URL gerados para visualização do vídeo são liberados via `URL.revokeObjectURL()` ao descartar ou confirmar a mídia.
- **Contexto Seguro**: O acesso a `navigator.mediaDevices` exige origem segura (`HTTPS` ou `localhost`), conforme exigido pelos padrões W3C.
