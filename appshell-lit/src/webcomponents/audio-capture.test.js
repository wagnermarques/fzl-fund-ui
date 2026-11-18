// @vitest-environment happy-dom
import 'fake-indexeddb/auto';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlAudioCapture,
  FzlAudioStore,
  formatAudioDuration,
  formatAudioSize,
  audioFileExtension,
  pickAudioMimeType,
} from '@fzl/webcomponents-lit/audio-capture';

let dbCounter = 0;
const uniqueDbName = () => `fzl-audio-test-${Date.now()}-${dbCounter++}`;

const makeRecording = (overrides = {}) => ({
  id: `id-${Math.random().toString(36).slice(2)}`,
  name: 'Teste',
  blob: new Blob(['fake-audio-bytes'], { type: 'audio/webm' }),
  mimeType: 'audio/webm',
  size: 16,
  durationSeconds: 3,
  createdAt: Date.now(),
  ...overrides,
});

/** Minimal MediaRecorder stand-in: emits one chunk on stop, then fires onstop asynchronously. */
class FakeMediaRecorder {
  static isTypeSupported(type) {
    return type === 'audio/webm;codecs=opus';
  }
  constructor(stream, options = {}) {
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
    this.state = 'inactive';
    this.ondataavailable = null;
    this.onstop = null;
    this.onerror = null;
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
    this.ondataavailable?.({ data: new Blob(['recorded-audio'], { type: this.mimeType }) });
    setTimeout(() => this.onstop?.(), 0);
  }
}

function installFakeMedia() {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] };
  const getUserMedia = vi.fn().mockResolvedValue(stream);
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia },
  });
  return { track, getUserMedia };
}

const waitForEvent = (el, name) =>
  new Promise((resolve) => el.addEventListener(name, (e) => resolve(e.detail), { once: true }));

describe('Audio Capture Helpers', () => {
  it('formata a duração em mm:ss e h:mm:ss', () => {
    expect(formatAudioDuration(0)).toBe('00:00');
    expect(formatAudioDuration(65)).toBe('01:05');
    expect(formatAudioDuration(3725)).toBe('1:02:05');
  });

  it('formata tamanhos em bytes', () => {
    expect(formatAudioSize(512)).toBe('512 B');
    expect(formatAudioSize(2048)).toBe('2.0 KB');
    expect(formatAudioSize(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('mapeia o MIME type para a extensão do arquivo', () => {
    expect(audioFileExtension('audio/webm;codecs=opus')).toBe('webm');
    expect(audioFileExtension('audio/mp4')).toBe('m4a');
    expect(audioFileExtension('audio/ogg')).toBe('ogg');
  });

  it('escolhe o primeiro MIME type suportado', () => {
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    expect(pickAudioMimeType()).toBe('audio/webm;codecs=opus');
    expect(pickAudioMimeType('audio/unsupported')).toBe('audio/webm;codecs=opus');
    vi.unstubAllGlobals();
  });
});

describe('FzlAudioStore (IndexedDB)', () => {
  let store;

  beforeEach(() => {
    store = new FzlAudioStore(uniqueDbName());
  });

  afterEach(() => store.close());

  it('salva e lê o binário do áudio', async () => {
    const rec = makeRecording();
    await store.save(rec);
    const loaded = await store.get(rec.id);
    expect(loaded).toBeTruthy();
    expect(loaded.name).toBe('Teste');
    expect(loaded.size).toBe(16);
    expect(await loaded.blob.text()).toBe('fake-audio-bytes');
  });

  it('lista as gravações da mais recente para a mais antiga', async () => {
    await store.save(makeRecording({ id: 'a', createdAt: 1000 }));
    await store.save(makeRecording({ id: 'b', createdAt: 3000 }));
    await store.save(makeRecording({ id: 'c', createdAt: 2000 }));
    const ids = (await store.list()).map((r) => r.id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('renomeia, exclui e limpa gravações', async () => {
    await store.save(makeRecording({ id: 'x' }));
    await store.save(makeRecording({ id: 'y' }));

    const renamed = await store.rename('x', 'Novo nome');
    expect(renamed.name).toBe('Novo nome');
    expect((await store.get('x')).name).toBe('Novo nome');
    expect(await store.rename('missing', 'n/a')).toBeUndefined();

    await store.delete('x');
    expect(await store.get('x')).toBeUndefined();

    await store.clear();
    expect(await store.list()).toEqual([]);
  });
});

describe('FzlAudioCapture Component', () => {
  let el;
  let media;

  beforeEach(async () => {
    media = installFakeMedia();
    el = new FzlAudioCapture();
    el.dbName = uniqueDbName();
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
    vi.unstubAllGlobals();
  });

  it('usa IndexedDB como armazenamento padrão', () => {
    expect(el.storage).toBe('indexeddb');
    expect(el.showLibrary).toBe(true);
    const hint = el.shadowRoot.querySelector('.hint');
    expect(hint.textContent).toContain('IndexedDB');
    expect(el.shadowRoot.querySelector('.library')).toBeTruthy();
  });

  it('grava, salva o blob no IndexedDB e lista a gravação', async () => {
    const captured = waitForEvent(el, 'fzl-audio-captured');
    const saved = waitForEvent(el, 'fzl-audio-saved');

    await el.start();
    expect(media.getUserMedia).toHaveBeenCalledOnce();
    expect(el.isRecording).toBe(true);

    el.stop();
    const capturedDetail = await captured;
    const { recording } = await saved;

    expect(capturedDetail.recording.id).toBe(recording.id);
    expect(recording.mimeType).toBe('audio/webm;codecs=opus');
    expect(recording.size).toBeGreaterThan(0);
    expect(media.track.stop).toHaveBeenCalled();
    expect(el.isRecording).toBe(false);

    // Persisted: a separate store over the same database sees it.
    const other = new FzlAudioStore(el.dbName);
    const fromDb = await other.get(recording.id);
    other.close();
    expect(fromDb).toBeTruthy();
    expect(await fromDb.blob.text()).toBe('recorded-audio');

    await el.updateComplete;
    const items = el.shadowRoot.querySelectorAll('.recording-item');
    expect(items.length).toBe(1);
    expect(items[0].querySelector('audio')).toBeTruthy();
  });

  it('carrega gravações existentes ao conectar', async () => {
    const dbName = uniqueDbName();
    const seed = new FzlAudioStore(dbName);
    await seed.save(makeRecording({ id: 'seeded', name: 'Gravação antiga' }));
    seed.close();

    const other = new FzlAudioCapture();
    other.dbName = dbName;
    document.body.appendChild(other);
    await vi.waitFor(() => expect(other.recordings.length).toBe(1));
    await other.updateComplete;
    expect(other.shadowRoot.querySelector('.recording-name').textContent).toBe('Gravação antiga');
    other.remove();
  });

  it('exclui uma gravação do IndexedDB', async () => {
    const rec = makeRecording({ id: 'to-delete' });
    await el.saveRecording(rec);
    expect(el.recordings.map((r) => r.id)).toEqual(['to-delete']);

    const deleted = waitForEvent(el, 'fzl-audio-deleted');
    await el.deleteRecording('to-delete');
    expect((await deleted).id).toBe('to-delete');
    expect(el.recordings).toEqual([]);
    expect(await el.getRecording('to-delete')).toBeUndefined();
  });

  it('não persiste nada com storage="none"', async () => {
    el.storage = 'none';
    await el.updateComplete;
    const onSaved = vi.fn();
    el.addEventListener('fzl-audio-saved', onSaved);

    const captured = waitForEvent(el, 'fzl-audio-captured');
    await el.start();
    el.stop();
    const { recording } = await captured;
    await new Promise((r) => setTimeout(r, 20));

    expect(recording.blob.size).toBeGreaterThan(0);
    expect(onSaved).not.toHaveBeenCalled();
    expect(el.shadowRoot.querySelector('.library')).toBeNull();
    const store = new FzlAudioStore(el.dbName);
    expect(await store.list()).toEqual([]);
    store.close();
  });

  it('pausa e retoma a gravação', async () => {
    await el.start();
    el.pause();
    await el.updateComplete;
    expect(el.shadowRoot.querySelector('.status').textContent).toContain('Pausado');
    el.resume();
    expect(el.isRecording).toBe(true);
    el.stop();
    await waitForEvent(el, 'fzl-audio-saved');
  });

  it('emite fzl-audio-error quando a permissão é negada', async () => {
    media.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    const error = waitForEvent(el, 'fzl-audio-error');
    await el.start();
    expect((await error).error).toContain('Permissão de microfone negada');
    expect(el.isRecording).toBe(false);
  });
});
