// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlLitInterviewTranscriber,
  formatDuration,
  generateInterviewId,
} from '@fzl/webcomponents-lit/interview-transcriber';

describe('Interview Transcriber Helpers', () => {
  describe('formatDuration', () => {
    it('formata 0 segundos como 00:00', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('formata segundos menores que 1 minuto', () => {
      expect(formatDuration(45)).toBe('00:45');
    });

    it('formata minutos e segundos', () => {
      expect(formatDuration(125)).toBe('02:05');
    });

    it('formata horas, minutos e segundos quando acima de 3600 segundos', () => {
      expect(formatDuration(3665)).toBe('01:01:05');
    });
  });

  describe('generateInterviewId', () => {
    it('gera identificador no formato INT-YYYYMMDDHHMMSS-XXXX', () => {
      const id = generateInterviewId();
      expect(id).toMatch(/^INT-\d{14}-[A-Z0-9]{4}$/);
    });
  });
});

describe('FzlLitInterviewTranscriber Web Component', () => {
  let el;

  beforeEach(async () => {
    el = new FzlLitInterviewTranscriber();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
    vi.restoreAllMocks();
  });

  it('instancia o elemento com valores padrão para pesquisa qualitativa', () => {
    expect(el).toBeInstanceOf(FzlLitInterviewTranscriber);
    expect(el.participantId).toBe('P-01');
    expect(el.interviewer).toBe('Pesquisador');
    expect(el.topic).toBe('Entrevista Qualitativa');
    expect(el.language).toBe('pt-BR');
    expect(el.recordingState).toBe('idle');
    expect(el.savingState).toBe('idle');
    expect(el.consentConfirmed).toBe(true);
    expect(el.autoTranscribe).toBe(true);
  });

  it('permite configurar metadados da entrevista via propriedades', async () => {
    el.participantId = 'P-104';
    el.interviewer = 'Dra. Silva';
    el.topic = 'Percepção de Riscos e Tomada de Decisão';
    el.language = 'en-US';
    await el.updateComplete;

    expect(el.participantId).toBe('P-104');
    expect(el.interviewer).toBe('Dra. Silva');
    expect(el.topic).toBe('Percepção de Riscos e Tomada de Decisão');
    expect(el.language).toBe('en-US');
  });

  it('insere tags e snippets qualitativos na transcrição', async () => {
    el.transcript = 'Primeira fala da entrevista.';
    await el.updateComplete;

    el.insertQuickTag('\n[00:01:15] [Entrevistador]: ');
    expect(el.transcript).toContain('[00:01:15] [Entrevistador]: ');

    el.insertQuickTag('\n[P-01]: ');
    expect(el.transcript).toContain('[P-01]: ');
  });

  it('dispara evento fzl-transcription-update quando o texto é alterado', async () => {
    let detailReceived = null;
    el.addEventListener('fzl-transcription-update', (e) => {
      detailReceived = e.detail;
    });

    el.transcript = 'Fala inicial do informante sobre sua jornada.';
    el.insertQuickTag(' [Nota]');
    await el.updateComplete;

    expect(detailReceived).toBeTruthy();
    expect(detailReceived.transcript).toContain('[Nota]');
  });

  it('trata falha ao iniciar gravação sem microfone disponível', async () => {
    let errorDetail = null;
    el.addEventListener('fzl-interview-error', (e) => {
      errorDetail = e.detail;
    });

    // Em ambiente de teste sem mediaDevices mockado
    await el.startRecording();
    await el.updateComplete;

    expect(el.recordingState).toBe('idle');
    expect(errorDetail).toBeTruthy();
    expect(el.errorMessage).toBeTruthy();
  });

  it('inicia, pausa, retoma e conclui gravação com API de mídia mockada', async () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: () => [mockTrack],
    };

    // Mock getUserMedia
    navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream),
    };

    // Mock MediaRecorder
    class MockMediaRecorder {
      constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this.mimeType = 'audio/webm';
      }
      start() {
        this.state = 'recording';
      }
      pause() {
        this.state = 'paused';
      }
      resume() {
        this.state = 'recording';
      }
      stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
      }
    }
    window.MediaRecorder = MockMediaRecorder;

    const stateChanges = [];
    el.addEventListener('fzl-recording-state-change', (e) => {
      stateChanges.push(e.detail.state);
    });

    // 1. Iniciar
    await el.startRecording();
    expect(el.recordingState).toBe('recording');

    // 2. Pausar
    el.pauseRecording();
    expect(el.recordingState).toBe('paused');

    // 3. Retomar
    el.resumeRecording();
    expect(el.recordingState).toBe('recording');

    // 4. Concluir
    el.stopRecording();
    expect(el.recordingState).toBe('stopped');

    expect(stateChanges).toEqual(['recording', 'paused', 'recording', 'stopped']);

    // 5. Descartar e reiniciar
    el.discardRecording();
    expect(el.recordingState).toBe('idle');
  });

  it('dispara evento fzl-interview-save com pacote completo para o backend', async () => {
    let saveEvent = null;
    el.addEventListener('fzl-interview-save', (e) => {
      saveEvent = e.detail;
    });

    el.participantId = 'P-42';
    el.interviewer = 'Pesquisador Fulano';
    el.topic = 'Avaliação Qualitativa de Fundos';
    el.transcript = '[Entrevistador]: Como você avalia a liquidez? \n[P-42]: Considero satisfatória.';
    el.elapsedSeconds = 120;
    el.audioBlob = new Blob(['fake audio'], { type: 'audio/webm' });

    await el.saveToBackend();
    await el.updateComplete;

    expect(saveEvent).toBeTruthy();
    expect(saveEvent.participantId).toBe('P-42');
    expect(saveEvent.interviewer).toBe('Pesquisador Fulano');
    expect(saveEvent.topic).toBe('Avaliação Qualitativa de Fundos');
    expect(saveEvent.transcript).toContain('Como você avalia a liquidez?');
    expect(saveEvent.durationSeconds).toBe(120);
    expect(saveEvent.audioBlob).toBeInstanceOf(Blob);
    expect(el.savingState).toBe('saved');
  });

  it('envia FormData para saveUrl configurado e trata sucesso', async () => {
    const fetchSpy = vi.spyOn(window, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    el.saveUrl = 'https://api.exemplo.com/entrevistas';
    el.participantId = 'P-88';
    el.transcript = 'Notas da pesquisa de campo';
    el.audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

    await el.saveToBackend();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.exemplo.com/entrevistas',
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
    expect(el.savingState).toBe('saved');
    expect(el.statusMessage).toContain('sucesso');
  });

  it('trata falha de rede ao salvar no backend', async () => {
    vi.spyOn(window, 'fetch').mockRejectedValue(new Error('Falha de conexão com servidor'));

    el.saveUrl = 'https://api.exemplo.com/entrevistas';
    await el.saveToBackend();

    expect(el.savingState).toBe('error');
    expect(el.errorMessage).toContain('Falha de conexão com servidor');
  });
});
