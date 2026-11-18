# FzlBookmarksController

> **Status:** Ready  
> **Arquivo:** `webcomponents-lit/src/controllers/bookmarks.controller.ts`  
> **Herda de:** `FzlBaseController`

Favoritos de documentos com tags e notas, persistidos em `Storage` e sincronizados entre abas. Com a opção `userData`, os favoritos são **por usuário**.

## Uso

```ts
const bookmarks = new FzlBookmarksController(this, {
  storageKey: 'favoritos',
  userData            // FzlUserDataController: cada usuário com os seus
});
bookmarks.addBookmark({ id: doc.id, name: doc.name });
bookmarks.addTag(doc.id, 'metodologia');
```

## API

| Membro | Descrição |
| --- | --- |
| `items`, `count`, `isBookmarked(id)`, `get(id)` | Leitura. |
| `toggleBookmark(item, force?)` / `addBookmark` / `removeBookmark` | Favoritar. |
| `addTag` / `removeTag` / `setNotes` / `clear()` | Tags e notas. |
| `bindUserData(userData)` / `unbindUserData()` | Isolamento por usuário. |
| `load()` / `save()` / `setStorageKey(key)` | Persistência. |

## Hooks protegidos (`extends`)

| Hook | Uso |
| --- | --- |
| `validateTag(tag)` | Normaliza; `null` rejeita. |
| `serializeBookmark(item)` | Formato persistido. |
| `getStorage()` | Backend de `Storage`. |

## Eventos (no host)

| Evento | `detail` |
| --- | --- |
| `fzl-bookmarks-loaded` | — |
| `fzl-bookmark-add` | — |
| `fzl-bookmark-remove` | — |
| `fzl-bookmark-tag-change` | — |
| `fzl-bookmarks-cleared` | — |
