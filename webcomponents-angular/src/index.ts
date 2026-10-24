import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { FzlNgButtonComponent } from './components/button/button.component';

export * from './components/button/button.component';

/**
 * Registers all Angular Elements Web Components into customElements registry
 */
export async function registerFzlAngularElements(): Promise<void> {
  if (typeof window === 'undefined') return;

  const app = await createApplication({ providers: [] });

  if (!customElements.get('fzl-ng-button')) {
    const ButtonElement = createCustomElement(FzlNgButtonComponent, {
      injector: app.injector
    });
    customElements.define('fzl-ng-button', ButtonElement);
  }
}

// Auto-register in browser environment
if (typeof window !== 'undefined') {
  registerFzlAngularElements().catch(console.error);
}
