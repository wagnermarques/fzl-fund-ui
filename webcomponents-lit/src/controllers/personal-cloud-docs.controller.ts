/**
 * @license
 * FZL Software — Personal Cloud Docs (Google Docs & Microsoft OneDrive) Reactive Controller
 */
import type {
  FzlCloudStorageConfig,
  FzlUploadResult
} from '../components/common/cloud-storage';
import type {
  FzlSocialAuthProvider,
  FzlSocialLoginResult,
  FzlSocialUser
} from '../components/social-login/social-login.types';
import type { FzlControllerHost } from './base.controller';
import {
  FzlCloudUploadController,
  type FzlCloudUploadControllerOptions
} from './cloud-upload.controller';
import {
  FzlSocialAuthController,
  type FzlSocialAuthConfig
} from './social-auth.controller';

export interface FzlPersonalCloudDocsControllerOptions
  extends FzlCloudUploadControllerOptions {
  authController?: FzlSocialAuthController;
  authConfig?: FzlSocialAuthConfig;
  convertToGoogleDocs?: boolean;
  googleDriveFolderId?: string;
  oneDriveFolderId?: string;
  autoLoginProvider?: FzlSocialAuthProvider;
}

export interface FzlPersonalCloudUploadOptions {
  autoLoginProvider?: FzlSocialAuthProvider;
  convertToGoogleDocs?: boolean;
  folderId?: string;
  context?: Record<string, unknown>;
}

/**
 * Controller base unificado para envio de documentos diretamente à nuvem pessoal
 * do usuário autenticado (**Google Docs / Google Drive** para contas Google e
 * **Microsoft OneDrive / Word Online** para contas Microsoft).
 *
 * Extensível via herança (`extends FzlPersonalCloudDocsController`) através dos hooks
 * herdados de `FzlCloudUploadController` e de `onUnauthenticatedUpload` / `onPersonalDocUploaded`.
 */
export class FzlPersonalCloudDocsController extends FzlCloudUploadController {
  private readonly _authController: FzlSocialAuthController;
  private readonly _convertToGoogleDocs: boolean;
  private readonly _googleDriveFolderId?: string;
  private readonly _oneDriveFolderId?: string;
  private readonly _autoLoginProvider?: FzlSocialAuthProvider;

  constructor(
    host?: FzlControllerHost | null,
    options: FzlPersonalCloudDocsControllerOptions = {}
  ) {
    super(host, { config: options.config, context: options.context });
    this._authController =
      options.authController ?? new FzlSocialAuthController(host, options.authConfig);
    this._convertToGoogleDocs = options.convertToGoogleDocs ?? true;
    this._googleDriveFolderId = options.googleDriveFolderId;
    this._oneDriveFolderId = options.oneDriveFolderId;
    this._autoLoginProvider = options.autoLoginProvider;

    this.bindSocialAuth(this._authController, {
      convertToGoogleDocs: this._convertToGoogleDocs,
      googleDriveFolderId: this._googleDriveFolderId,
      oneDriveFolderId: this._oneDriveFolderId
    });
  }

  get authController(): FzlSocialAuthController {
    return this._authController;
  }

  get currentUser(): FzlSocialUser | null {
    return this._authController.currentUser;
  }

  get isAuthenticated(): boolean {
    return this._authController.isAuthenticated;
  }

  get loggedProvider(): FzlSocialAuthProvider | null {
    return this._authController.currentUser?.provider ?? null;
  }

  get targetCloudLabel(): string {
    const provider = this.loggedProvider;
    if (provider === 'google') {
      return this._convertToGoogleDocs ? 'Google Docs' : 'Google Drive';
    }
    if (provider === 'microsoft') {
      return 'Microsoft OneDrive';
    }
    return 'Google Docs / OneDrive';
  }

  get lastViewerUrl(): string | null {
    return this.lastResult?.externalViewerUrl ?? this.lastResult?.fileUrl ?? null;
  }

  get lastViewerLabel(): string | null {
    return this.lastResult?.externalViewerLabel ?? null;
  }

  async loginWithGoogle(): Promise<FzlSocialLoginResult | null> {
    return this._authController.loginWithGoogle();
  }

  async loginWithMicrosoft(): Promise<FzlSocialLoginResult | null> {
    return this._authController.loginWithMicrosoft();
  }

  logout(): void {
    this._authController.logout();
    this.notifyChange();
  }

  /**
   * Envia o arquivo para a nuvem pessoal do usuário logado (Google Docs ou OneDrive).
   */
  async uploadToPersonalCloud(
    file: File,
    options: FzlPersonalCloudUploadOptions = {}
  ): Promise<FzlUploadResult> {
    if (!this.isAuthenticated) {
      const autoProvider = options.autoLoginProvider ?? this._autoLoginProvider;
      if (autoProvider === 'google') {
        await this.loginWithGoogle();
      } else if (autoProvider === 'microsoft') {
        await this.loginWithMicrosoft();
      }
    }

    if (!this.isAuthenticated || !this.currentUser) {
      const customFallback = await this.onUnauthenticatedUpload(file);
      if (customFallback) {
        return customFallback;
      }

      const error =
        'Autenticação pessoal Google ou Microsoft necessária para enviar o documento.';
      const failed: FzlUploadResult = {
        success: false,
        provider: this.activeProvider,
        error
      };
      this.emitHostEvent('fzl-personal-cloud-auth-required', { file, error });
      return failed;
    }

    const user = this.currentUser;
    const token = await this._authController.requestCloudAccessToken(user.provider);

    const overrideConfig: Partial<FzlCloudStorageConfig> =
      user.provider === 'google'
        ? {
            provider: 'google-drive',
            googleDriveConvertToDocs:
              options.convertToGoogleDocs ?? this._convertToGoogleDocs,
            googleDriveFolderId: options.folderId ?? this._googleDriveFolderId,
            googleAuthToken: token || undefined
          }
        : {
            provider: 'onedrive',
            oneDriveFolderId: options.folderId ?? this._oneDriveFolderId,
            oneDriveAuthToken: token || undefined
          };

    const result = await this.uploadFile(file, overrideConfig, options.context);

    if (result.success) {
      await this.onPersonalDocUploaded(file, result, user);
      this.emitHostEvent('fzl-personal-cloud-uploaded', { file, result, user });
    }

    return result;
  }

  /**
   * Hook protegido acionado quando há tentativa de upload sem usuário social autenticado.
   * Subclasses podem sobrescrever para abrir modal de login ou aplicar fallback customizado.
   */
  protected async onUnauthenticatedUpload(
    _file: File
  ): Promise<FzlUploadResult | null> {
    return null;
  }

  /**
   * Hook protegido acionado após upload bem-sucedido na nuvem pessoal do usuário.
   */
  protected async onPersonalDocUploaded(
    _file: File,
    _result: FzlUploadResult,
    _user: FzlSocialUser
  ): Promise<void> {
    // Extensível em subclasses
  }
}
