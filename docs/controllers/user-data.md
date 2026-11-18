# FzlUserDataController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/user-data.controller.ts`  
> **Herda de:** `FzlBaseController`

Isola os dados locais do navegador (IndexedDB e `localStorage`) **por usuário** e aplica uma política de limpeza no logout. É a base para qualquer app que guarda dados do usuário no navegador: o próximo usuário que entrar no mesmo navegador nunca vê os dados do anterior.

## Por que existe

IndexedDB e `localStorage` pertencem à *origem* (o site), não ao usuário. Se o app abre `indexedDB.open('arquivos')`, todo mundo que logar naquele navegador vê os mesmos arquivos. Limpar no logout **não basta**: se a aba é fechada sem logout, ou o token expira, nada é limpo.

Por isso o controller faz duas coisas:

1. **Separação (sempre):** cada usuário recebe um *escopo* e todo banco ou chave aberto por ele leva esse prefixo: `fzl-ud:<appId>:<hash do usuário>:<nome>`. O id do usuário nunca aparece em claro no nome. Sem usuário logado não há escopo, e os dados ficam fechados.
2. **Limpeza no logout (configurável):** a política decide se os dados de quem saiu são apagados.

## Política de logout

| `logoutPolicy` | Comportamento |
| --- | --- |
| `'purge'` (padrão) | Apaga os dados de quem saiu. Se houver registros **não sincronizados**, pergunta antes (`confirmPurge`); sem resposta positiva, mantém. |
| `'ask'` | Sempre pergunta (`confirmPurge`). |
| `'keep'` | Nunca apaga: os dados ficam isolados no escopo até o mesmo usuário voltar. |

Em todas as políticas:
- **Sem `confirmPurge`, nada não sincronizado é apagado.** Dados nunca são perdidos em silêncio.
- **Sessão expirada (`reason: 'expired'`) não apaga.** Expirar não é sair por vontade própria.

## Uso

```ts
import { FzlUserDataController, FzlSocialAuthController } from '@fzl/webcomponents-lit/controllers';

const auth = new FzlSocialAuthController(null, { googleClientId: '…' });

const userData = new FzlUserDataController(null, {
  appId: 'caqdas',
  logoutPolicy: 'purge',
  confirmPurge: ({ unsynced }) =>
    confirm(`${unsynced} arquivo(s) ainda não foram enviados ao Drive. Apagar mesmo assim?`)
});

// Segue o login/logout (FzlSocialAuthController, authService do appshell ou similar)
userData.bindAuth(auth);
```

Com o `authService` do appshell:

```js
import { authService } from 'fzl-fund-appshell--lit'
userData.bindAuth(authService) // usa getCurrentUser() e o motivo (signOut, expired…)
```

### Bancos e chaves do usuário

```ts
const db = await userData.openDatabase('arquivos', 1, (db) => {
  db.createObjectStore('items', { keyPath: 'id' });
});

userData.setItem('rascunho', '…');          // chave já com o escopo
userData.scopedName('fzl-audio-capture');    // nome para componentes que aceitam db-name
```

Componentes com banco próprio recebem o nome do escopo:

```js
audioCapture.dbName = userData.scopedName('audio') // <fzl-audio-capture>
```

Controllers que aceitam a opção `userData` passam a usar o escopo automaticamente: `FzlBookmarksController`, `FzlCrudBaseController` e `FzlIndexedDbCrudAdapter`.

## Participantes

Quem guarda dados no escopo pode se registrar para informar quantos registros ainda não foram sincronizados e para ser avisado quando o escopo for apagado:

```ts
userData.registerParticipant({
  countUnsynced: () => fila.length,
  purge: (scope) => fila.clear()
});
```

O `FzlCrudBaseController` faz isso sozinho quando recebe `userData`.

## API

| Membro | Descrição |
| --- | --- |
| `user`, `scope`, `isActive` | Usuário e escopo atuais (`null` sem ninguém logado). |
| `setUser(user, reason?)` / `logout(reason?)` | Troca o usuário. As transições são serializadas: a política de logout termina antes do novo escopo valer. |
| `whenReady()` | Promise da transição em andamento. |
| `bindAuth(source, mapUser?)` | Segue uma fonte de autenticação com `subscribe()`. |
| `scopedName(name)` / `tryScopedName(name)` | Nome com o prefixo do escopo (o segundo devolve `null` sem usuário). |
| `openDatabase(name, version, upgrade)` | Abre um IndexedDB do escopo; registra o banco para a limpeza. |
| `getItem` / `setItem` / `removeItem` | `Storage` com o prefixo do escopo. |
| `registerParticipant(p)` | Registra um participante; devolve a função para cancelar. |
| `getUnsyncedCount()` | Soma dos não sincronizados de todos os participantes. |
| `purge(scope?)` | Apaga bancos e chaves de um escopo (padrão: o atual). |
| `listKnownScopes()` | Escopos com dados neste navegador. |
| `setLogoutPolicy(policy)` | Muda a política. |

## Hooks protegidos (`extends`)

| Hook | Padrão |
| --- | --- |
| `toIdentity(raw)` | Lê `id`/`sub`/`uid`, `provider`, `email`, `name`. |
| `resolveUserScope(user)` | `u` + hash de `provider:id`. |
| `countUnsynced()` | `0` (soma-se aos participantes). |
| `shouldPurgeOnLogout(request)` | `policy !== 'keep' && reason !== 'expired'`. |
| `confirmPurge(request)` | Opção `confirmPurge`, senão `false`. |
| `onBeforePurge(scope)` / `onAfterPurge(scope, dbs)` | — |
| `onUserChanged(previous, next)` | — |

```ts
class CaqdasUserData extends FzlUserDataController {
  protected override shouldPurgeOnLogout(req) {
    // Em computador compartilhado (definido pelo usuário), sempre limpar
    return localStorage.getItem('caqdas:computador-compartilhado') === '1' || super.shouldPurgeOnLogout(req);
  }
}
```

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-user-data-scope-change` | `{ previousScope, scope, user, reason }` |
| `fzl-user-data-purged` | `{ scope, databases }` |
| `fzl-user-data-kept` | `FzlPurgeRequest` (logout em que os dados foram mantidos) |
