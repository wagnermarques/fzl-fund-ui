import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { FzlNgButtonComponent } from './components/button/button.component';
import { FzlNgCrumbComponent } from './components/crumb/crumb.component';
import { FzlNgCardListComponent } from './components/card-list/card-list.component';

export * from './components/button/button.component';
export * from './components/crumb/crumb.component';
export * from './components/card-list/card-list.component';

/**
 * Registers all Angular Elements Web Components into customElements registry
 */
export async function registerFzlAngularElements(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Zoneless: widgets are embedded in arbitrary host pages, so we must not require
  // (or globally install) zone.js, which would also clash with Angular hosts' own zone.
  const app = await createApplication({
    providers: [provideExperimentalZonelessChangeDetection()]
  });

  if (!customElements.get('fzl-ng-button')) {
    const ButtonElement = createCustomElement(FzlNgButtonComponent, {
      injector: app.injector
    });
    customElements.define('fzl-ng-button', ButtonElement);
  }

  if (!customElements.get('fzl-ng-crumb')) {
    const CrumbElement = createCustomElement(FzlNgCrumbComponent, {
      injector: app.injector
    });
    customElements.define('fzl-ng-crumb', CrumbElement);
  }

  if (!customElements.get('fzl-ng-card-list')) {
    const CardListElement = createCustomElement(FzlNgCardListComponent, {
      injector: app.injector
    });
    customElements.define('fzl-ng-card-list', CardListElement);
  }
}

// Auto-register in browser environment
if (typeof window !== 'undefined') {
  registerFzlAngularElements().catch(console.error);
}
