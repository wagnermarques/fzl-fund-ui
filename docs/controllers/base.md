# FzlBaseController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/base.controller.ts`  
> **Herda de:** —

Classe base de todos os controllers. Implementa o protocolo de `ReactiveController` do Lit e funciona também sem DOM (modo *headless*).

## Uso

```ts
import { FzlBaseController } from '@fzl/webcomponents-lit/controllers';

export class ContadorController extends FzlBaseController {
  private _valor = 0;
  get valor() { return this._valor; }
  incrementar() {
    this._valor++;
    this.emitHostEvent('contador-change', { valor: this._valor });
    this.notifyChange(); // requestUpdate() no host + subscribe()
  }
}

// Em um LitElement
private contador = new ContadorController(this);

// Sem DOM (serviços, testes)
const c = new ContadorController(null);
const off = c.subscribe(() => console.log(c.valor));
```

## API

| Membro | Descrição |
| --- | --- |
| `attachHost(host)` / `detachHost()` | Liga ou desliga o controller de um host reativo. |
| `subscribe(listener)` | Observa mudanças sem DOM; devolve a função para cancelar. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `notifyChange()` | Chama `requestUpdate()` no host e avisa os inscritos. |
| `emitHostEvent(type, detail)` | Despacha um `CustomEvent` (bubbles + composed) no host. |
| `hostConnected()` / `hostUpdated()` / `hostDisconnected()` | Ciclo de vida do host. |
