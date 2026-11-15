/**
 * @license
 * FZL Software — Cloud Upload Reactive Controller
 */
import {
  uploadToCloudStorage,
  type FzlCloudStorageConfig,
  type FzlStorageProvider,
  type FzlUploadResult
} from '../components/common/cloud-storage';
import type { FzlDocumentUploadStatus } from '../components/document-picker/document-picker.types';
import { FzlBaseController, type FzlControllerHost } from './base.controller';

export interface FzlCloudUploadControllerOptions {
  config?: FzlCloudStorageConfig;
  context?: Record<string, unknown>;
}

/**
 * Controller reativo e headless para upload de arquivos multi-provedor
 * (`rest`, `google-drive`, `s3`, `onedrive`, `custom`).
 *
 * Pode ser estendido via herança (`extends FzlCloudUploadController`) com
 * hooks protegidos: `beforeUpload`, `performUpload`, `afterUpload` e `onError`.
 */
export class FzlCloudUploadController extends FzlBaseController {
  private _config: FzlCloudStorageConfig;
  private _context: Record<string, unknown>;
  private _status: FzlDocumentUploadStatus = 'idle';
  private _lastResult: FzlUploadResult | null = null;
  private _lastError: string | null = null;
  private _lastFile: File | null = null;
  private _uploadCount = 0;

  constructor(host?: FzlControllerHost | null, options: FzlCloudUploadControllerOptions = {}) {
    super(host);
    this._config = { ...(options.config ?? {}) };
    this._context = { ...(options.context ?? {}) };
  }

  get config(): FzlCloudStorageConfig {
    return this._config;
  }

  get context(): Record<string, unknown> {
    return this._context;
  }

  get activeProvider(): FzlStorageProvider {
    return this._config.provider ?? 'rest';
  }

  get status(): FzlDocumentUploadStatus {
    return this._status;
  }

  get isUploading(): boolean {
    return this._status === 'uploading';
  }

  get lastResult(): FzlUploadResult | null {
    return this._lastResult;
  }

  get lastError(): string | null {
    return this._lastError;
  }

  get lastFile(): File | null {
    return this._lastFile;
  }

  get uploadCount(): number {
    return this._uploadCount;
  }

  /**
   * Atualiza a configuração de cloud storage e notifica observadores.
   */
  setConfig(config: FzlCloudStorageConfig, notify = true): this {
    this._config = { ...config };
    if (notify) {
      this.notifyChange();
    }
    return this;
  }

  /**
   * Atualiza o contexto padrão enviado junto aos uploads.
   */
  setContext(context: Record<string, unknown>): this {
    this._context = { ...context };
    this.notifyChange();
    return this;
  }

  /**
   * Restaura o estado interno de upload para `idle`.
   */
  reset(): void {
    this._status = 'idle';
    this._lastResult = null;
    this._lastError = null;
    this._lastFile = null;
    this.notifyChange();
  }

  /**
   * Executa o fluxo completo de upload com hooks extensíveis para subclasses.
   */
  async uploadFile(
    file: File,
    overrideConfig?: Partial<FzlCloudStorageConfig>,
    overrideContext?: Record<string, unknown>
  ): Promise<FzlUploadResult> {
    const effectiveConfig: FzlCloudStorageConfig = {
      ...this._config,
      ...(overrideConfig ?? {})
    };
    const effectiveContext: Record<string, unknown> = {
      ...this._context,
      ...(overrideContext ?? {})
    };
    const provider: FzlStorageProvider = effectiveConfig.provider ?? 'rest';

    let targetFile = file;
    try {
      const gate = await this.beforeUpload(file, effectiveConfig);
      if (gate === false) {
        const cancelled: FzlUploadResult = {
          success: false,
          provider,
          error: 'Upload cancelado por beforeUpload().'
        };
        this._lastResult = cancelled;
        this._lastError = cancelled.error ?? null;
        this._status = 'idle';
        this.notifyChange();
        return cancelled;
      }
      if (gate instanceof File) {
        targetFile = gate;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failed: FzlUploadResult = {
        success: false,
        provider,
        error: message
      };
      this._lastFile = file;
      this._lastResult = failed;
      this._lastError = message;
      this._status = 'error';
      await this.onError(file, message, failed);
      this.emitHostEvent('fzl-upload-error', { file, error: message, result: failed });
      this.notifyChange();
      return failed;
    }

    this._lastFile = targetFile;
    this._status = 'uploading';
    this._lastError = null;
    this._lastResult = null;
    this.emitHostEvent('fzl-upload-start', { file: targetFile, provider });
    this.notifyChange();

    try {
      const result = await this.performUpload(targetFile, effectiveConfig, effectiveContext);
      this._lastResult = result;

      if (result.success) {
        this._status = 'uploaded';
        this._uploadCount += 1;
        await this.afterUpload(targetFile, result);
        this.emitHostEvent('fzl-upload-success', { file: targetFile, result });
      } else {
        const message = result.error || 'Falha ao enviar arquivo.';
        this._status = 'error';
        this._lastError = message;
        await this.onError(targetFile, message, result);
        this.emitHostEvent('fzl-upload-error', { file: targetFile, error: message, result });
      }

      this.notifyChange();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const failed: FzlUploadResult = {
        success: false,
        provider,
        error: message
      };
      this._status = 'error';
      this._lastResult = failed;
      this._lastError = message;
      await this.onError(targetFile, message, failed);
      this.emitHostEvent('fzl-upload-error', { file: targetFile, error: message, result: failed });
      this.notifyChange();
      return failed;
    }
  }

  /**
   * Hook protegido executado antes do upload.
   * Pode validar, renomear/transformar retornando um novo `File`, ou cancelar retornando `false`.
   */
  protected async beforeUpload(
    file: File,
    _config: FzlCloudStorageConfig
  ): Promise<File | boolean> {
    return file;
  }

  /**
   * Hook protegido que executa o transporte de upload (padrão: `uploadToCloudStorage`).
   * Subclasses podem sobrescrever para adicionar headers de autorização, retry ou chunking.
   */
  protected async performUpload(
    file: File,
    config: FzlCloudStorageConfig,
    context: Record<string, unknown>
  ): Promise<FzlUploadResult> {
    return uploadToCloudStorage(file, config, context);
  }

  /**
   * Hook protegido executado após upload bem-sucedido.
   */
  protected async afterUpload(_file: File, _result: FzlUploadResult): Promise<void> {
    // Extensível em subclasses
  }

  /**
   * Hook protegido executado quando ocorre falha ou exceção no upload.
   */
  protected async onError(
    _file: File,
    _errorMessage: string,
    _result?: FzlUploadResult
  ): Promise<void> {
    // Extensível em subclasses
  }
}
