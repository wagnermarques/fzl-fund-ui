/**
 * @license
 * FZL Software — Headless Reactive Controllers Base
 */

/**
 * Interface mínima compatível com ReactiveControllerHost (Lit) ou hosts headless customizados.
 */
export interface FzlControllerHost {
  addController?(controller: FzlReactiveController): void;
  removeController?(controller: FzlReactiveController): void;
  requestUpdate(name?: PropertyKey, oldValue?: unknown): void;
  readonly updateComplete?: Promise<boolean>;
  dispatchEvent?(event: Event): boolean;
}

/**
 * Interface compatível com ReactiveController do Lit para ciclo de vida automático no host.
 */
export interface FzlReactiveController {
  hostConnected?(): void;
  hostUpdated?(): void;
  hostDisconnected?(): void;
}

/**
 * Classe base extensível para todos os Reactive / Headless Controllers da suíte `@fzl/webcomponents-lit`.
 *
 * Pode ser usada de duas formas:
 * 1. Anexada a um `LitElement` (via `new MeuController(this)`), disparando `requestUpdate()` automaticamente.
 * 2. Em modo headless (sem host DOM), reagindo via `controller.subscribe(() => ...)` em stores, testes ou frameworks externos.
 *
 * Subclasses de aplicação podem herdar diretamente (`class MeuControllerCustom extends FzlCloudUploadController`)
 * e sobrescrever hooks protegidos (`beforeUpload`, `performUpload`, `afterUpload`, etc.).
 */
export class FzlBaseController implements FzlReactiveController {
  protected host: FzlControllerHost | null = null;
  protected connected = false;
  private readonly _subscribers = new Set<() => void>();

  constructor(host?: FzlControllerHost | null) {
    if (host) {
      this.attachHost(host);
    }
  }

  /**
   * Anexa (ou substitui) o host reativo deste controller.
   */
  attachHost(host?: FzlControllerHost | null): this {
    if (this.host && this.host !== host && this.host.removeController) {
      this.host.removeController(this);
    }
    this.host = host ?? null;
    if (this.host?.addController) {
      this.host.addController(this);
    }
    return this;
  }

  /**
   * Remove o vínculo do controller com o host atual.
   */
  detachHost(): void {
    if (this.host?.removeController) {
      this.host.removeController(this);
    }
    this.host = null;
  }

  /**
   * Lifecycle hook invocado quando o host é conectado ao DOM.
   */
  hostConnected(): void {
    this.connected = true;
  }

  /**
   * Lifecycle hook invocado após o host concluir um ciclo de atualização.
   */
  hostUpdated(): void {
    // Extensível em subclasses
  }

  /**
   * Lifecycle hook invocado quando o host é desconectado do DOM.
   */
  hostDisconnected(): void {
    this.connected = false;
  }

  /**
   * Registra um observador para modo headless ou integração com frameworks externos.
   * Retorna a função de cancelamento (unsubscribe).
   */
  subscribe(listener: () => void): () => void {
    this._subscribers.add(listener);
    return () => {
      this._subscribers.delete(listener);
    };
  }

  /**
   * Notifica o host (via `requestUpdate()`) e todos os inscritos via `subscribe()`.
   */
  protected notifyChange(): void {
    this.host?.requestUpdate();
    for (const listener of [...this._subscribers]) {
      listener();
    }
  }

  /**
   * Despacha um `CustomEvent` no host caso ele implemente `dispatchEvent`.
   */
  protected emitHostEvent<T = unknown>(
    type: string,
    detail?: T,
    options?: Omit<CustomEventInit<T>, 'detail'>
  ): CustomEvent<T> {
    const event = new CustomEvent<T>(type, {
      bubbles: true,
      composed: true,
      ...options,
      detail
    });
    this.host?.dispatchEvent?.(event);
    return event;
  }
}
