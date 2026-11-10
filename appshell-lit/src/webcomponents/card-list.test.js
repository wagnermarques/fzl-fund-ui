// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest'
import {
  filterFzlCardItems,
  parseFzlCardItems,
  sortFzlCardItems,
  applyPersistedCardOrder,
  FzlLitCard,
} from '@fzl/webcomponents-lit/card-list'
import { FzlEs6CardList, FzlEs6Card } from '@fzl/webcomponents-es6'

describe('CardList Helper Functions', () => {
  const sampleItems = [
    {
      id: 'task-1',
      title: 'Revisar módulo Camel',
      description: 'Rotas OSGi',
      category: 'Cursos',
      priority: 'ALTA',
      status: 'EM_ANDAMENTO',
      date: '2026-10-31',
      tags: ['camel', 'karaf'],
    },
    {
      id: 'task-2',
      title: 'Pagamento Cloud',
      description: 'Fatura mensal',
      category: 'Financeiro',
      priority: 'MEDIA',
      status: 'PENDENTE',
      date: '2026-11-05',
      tags: ['cloud'],
    },
    {
      id: 'task-3',
      title: 'Comprar itens de mercado',
      description: 'Frutas e café',
      category: 'Pessoal',
      priority: 'BAIXA',
      status: 'CONCLUIDA',
      date: '2026-11-02',
      tags: ['mercado'],
    },
    {
      id: 'task-4',
      title: 'Deploy no cluster',
      description: 'Publicação urgente',
      category: 'DevOps',
      priority: 'URGENTE',
      status: 'PENDENTE',
      date: '2026-10-25',
      tags: ['deploy'],
    },
  ]

  describe('parseFzlCardItems', () => {
    it('retorna array como veio se já for array', () => {
      expect(parseFzlCardItems(sampleItems)).toEqual(sampleItems)
    })

    it('faz parse de string JSON válida', () => {
      const json = JSON.stringify([{ id: '1', title: 'Teste' }])
      expect(parseFzlCardItems(json)).toEqual([{ id: '1', title: 'Teste' }])
    })

    it('retorna array vazio para entrada inválida ou nula', () => {
      expect(parseFzlCardItems(null)).toEqual([])
      expect(parseFzlCardItems('')).toEqual([])
      expect(parseFzlCardItems('invalid json')).toEqual([])
    })
  })

  describe('sortFzlCardItems', () => {
    it('não altera a ordem se sortBy estiver vazio', () => {
      const sorted = sortFzlCardItems(sampleItems, '')
      expect(sorted.map((i) => i.id)).toEqual(['task-1', 'task-2', 'task-3', 'task-4'])
    })

    it('ordena por título em ordem ascendente e descendente', () => {
      const asc = sortFzlCardItems(sampleItems, 'title', 'asc')
      expect(asc[0].title).toBe('Comprar itens de mercado')
      expect(asc[asc.length - 1].title).toBe('Revisar módulo Camel')

      const desc = sortFzlCardItems(sampleItems, 'title', 'desc')
      expect(desc[0].title).toBe('Revisar módulo Camel')
      expect(desc[desc.length - 1].title).toBe('Comprar itens de mercado')
    })

    it('ordena por prioridade considerando pesos semânticos', () => {
      const asc = sortFzlCardItems(sampleItems, 'priority', 'asc')
      // BAIXA (1), MEDIA (2), ALTA (3), URGENTE (4)
      expect(asc.map((i) => i.priority)).toEqual(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE'])

      const desc = sortFzlCardItems(sampleItems, 'priority', 'desc')
      expect(desc.map((i) => i.priority)).toEqual(['URGENTE', 'ALTA', 'MEDIA', 'BAIXA'])
    })

    it('ordena por data cronológica', () => {
      const asc = sortFzlCardItems(sampleItems, 'date', 'asc')
      expect(asc[0].date).toBe('2026-10-25')
      expect(asc[asc.length - 1].date).toBe('2026-11-05')

      const desc = sortFzlCardItems(sampleItems, 'date', 'desc')
      expect(desc[0].date).toBe('2026-11-05')
      expect(desc[desc.length - 1].date).toBe('2026-10-25')
    })
  })

  describe('filterFzlCardItems', () => {
    it('retorna todos os itens quando a query estiver vazia', () => {
      expect(filterFzlCardItems(sampleItems, '')).toEqual(sampleItems)
      expect(filterFzlCardItems(sampleItems, '   ')).toEqual(sampleItems)
    })

    it('filtra por título, descrição, categoria e tags', () => {
      const byTitle = filterFzlCardItems(sampleItems, 'mercado')
      expect(byTitle.length).toBe(1)
      expect(byTitle[0].id).toBe('task-3')

      const byTag = filterFzlCardItems(sampleItems, 'karaf')
      expect(byTag.length).toBe(1)
      expect(byTag[0].id).toBe('task-1')

      const byCat = filterFzlCardItems(sampleItems, 'financeiro')
      expect(byCat.length).toBe(1)
      expect(byCat[0].id).toBe('task-2')
    })
  })

  describe('Card Reordering and Manual Order Management', () => {
    it('reordena os cards movendo para cima e para baixo corretamente', () => {
      const items = [...sampleItems]
      // Simula reordenação: move index 2 (task-3) para index 1
      const [moved] = items.splice(2, 1)
      items.splice(1, 0, moved)

      expect(items.map((i) => i.id)).toEqual(['task-1', 'task-3', 'task-2', 'task-4'])
    })

    it('emite evento com payload contendo lista atualizada, fromIndex, toIndex e item', () => {
      let eventPayload = null
      const handleReorder = (e) => {
        eventPayload = e.detail
      }

      // Simula despacho do evento customizado
      const fromIndex = 0
      const toIndex = 3
      const updated = [...sampleItems]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)

      const event = new CustomEvent('fzl-cards-reorder', {
        detail: {
          items: updated,
          fromIndex,
          toIndex,
          item: moved,
        },
      })

      handleReorder(event)

      expect(eventPayload).not.toBeNull()
      expect(eventPayload.fromIndex).toBe(0)
      expect(eventPayload.toIndex).toBe(3)
      expect(eventPayload.item.id).toBe('task-1')
      expect(eventPayload.items[3].id).toBe('task-1')
      expect(eventPayload.items[0].id).toBe('task-2')
    })

    it('valida lógica de reordenação manual e contrato do evento', () => {
      const items = [...sampleItems]
      // Simula reordenação: mover item do topo para a posição 2
      const [moved] = items.splice(0, 1)
      items.splice(2, 0, moved)

      expect(items[0].id).toBe('task-2')
      expect(items[1].id).toBe('task-3')
      expect(items[2].id).toBe('task-1')
      expect(items[3].id).toBe('task-4')

      // Valida estrutura do payload de evento fzl-cards-reorder
      const payload = {
        items,
        orderIds: items.map((i) => i.id),
        fromIndex: 0,
        toIndex: 2,
        item: moved,
      }
      expect(payload.fromIndex).toBe(0)
      expect(payload.toIndex).toBe(2)
      expect(payload.item.title).toBe('Revisar módulo Camel')
      expect(payload.orderIds).toEqual(['task-2', 'task-3', 'task-1', 'task-4'])
    })
  })

  describe('Card Order Persistence (Dijit / Storage Strategies)', () => {
    beforeEach(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    it('applyPersistedCardOrder() reordena os itens de acordo com a lista de IDs persistida', () => {
      const savedIds = ['task-4', 'task-2', 'task-1']
      const reordered = applyPersistedCardOrder(sampleItems, savedIds)

      // task-4, task-2 e task-1 primeiro na ordem salva, task-3 (não listado) ao final
      expect(reordered.map((i) => i.id)).toEqual(['task-4', 'task-2', 'task-1', 'task-3'])
    })

    it('applyPersistedCardOrder() ignora com segurança IDs inexistentes e arrays vazios', () => {
      const withGhostIds = ['id-inexistente', 'task-3', 'task-1']
      const reordered = applyPersistedCardOrder(sampleItems, withGhostIds)

      // task-3, task-1 seguidos pelos itens restantes (task-2, task-4)
      expect(reordered.map((i) => i.id)).toEqual(['task-3', 'task-1', 'task-2', 'task-4'])

      // Array vazio retorna a lista original intacta
      expect(applyPersistedCardOrder(sampleItems, [])).toEqual(sampleItems)
    })

    it('persiste orderIds no localStorage quando storage-key está configurado', async () => {
      const el = document.createElement('fzl-lit-card-list')
      el.storageKey = 'test-dashboard-tasks'
      el.allowReorder = true
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      let reorderDetail = null
      el.addEventListener('fzl-cards-reorder', (e) => {
        reorderDetail = e.detail
      })

      // Move task-1 (index 0) para o final (index 3)
      el._reorderCards(0, 3)
      await el.updateComplete

      expect(reorderDetail).not.toBeNull()
      expect(reorderDetail.orderIds).toEqual(['task-2', 'task-3', 'task-4', 'task-1'])

      // Valida que foi gravado no localStorage
      const saved = JSON.parse(localStorage.getItem('test-dashboard-tasks'))
      expect(saved).toEqual(['task-2', 'task-3', 'task-4', 'task-1'])

      document.body.removeChild(el)
    })

    it('restaura automaticamente a ordem salva no localStorage ao inicializar novo componente', async () => {
      // Pré-grava a ordem preferida pelo usuário
      localStorage.setItem('user-saved-order', JSON.stringify(['task-3', 'task-1', 'task-4', 'task-2']))

      const el = document.createElement('fzl-lit-card-list')
      el.storageKey = 'user-saved-order'
      el.allowReorder = true
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      const displayedTitles = Array.from(el.renderRoot.querySelectorAll('.fzl-card-title')).map((t) => t.textContent)
      expect(displayedTitles[0]).toBe('Comprar itens de mercado') // task-3
      expect(displayedTitles[1]).toBe('Revisar módulo Camel')      // task-1
      expect(displayedTitles[2]).toBe('Deploy no cluster')         // task-4
      expect(displayedTitles[3]).toBe('Pagamento Cloud')           // task-2

      document.body.removeChild(el)
    })

    it('suporta sessionStorage quando storage-type="session"', async () => {
      sessionStorage.setItem('session-tasks', JSON.stringify(['task-4', 'task-1', 'task-2', 'task-3']))

      const el = document.createElement('fzl-lit-card-list')
      el.storageKey = 'session-tasks'
      el.storageType = 'session'
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      const displayedTitles = Array.from(el.renderRoot.querySelectorAll('.fzl-card-title')).map((t) => t.textContent)
      expect(displayedTitles[0]).toBe('Deploy no cluster') // task-4

      document.body.removeChild(el)
    })

    it('clearPersistedOrder() limpa o storage e restaura a ordem inicial dos itens', async () => {
      localStorage.setItem('clear-test-key', JSON.stringify(['task-4', 'task-3', 'task-2', 'task-1']))

      const el = document.createElement('fzl-lit-card-list')
      el.storageKey = 'clear-test-key'
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      // Confirma que carregou na ordem salva
      expect(localStorage.getItem('clear-test-key')).not.toBeNull()

      // Limpa persistência
      el.clearPersistedOrder()
      await el.updateComplete

      expect(localStorage.getItem('clear-test-key')).toBeNull()

      // Ordem voltou ao padrão inicial
      const displayedTitles = Array.from(el.renderRoot.querySelectorAll('.fzl-card-title')).map((t) => t.textContent)
      expect(displayedTitles[0]).toBe('Revisar módulo Camel') // task-1

      document.body.removeChild(el)
    })
  })

  describe('Card Accordion / Collapsible Variation', () => {
    it('com collapsible-cards=true, cards iniciam colapsados com chevron e título', async () => {
      const el = document.createElement('fzl-lit-card-list')
      el.collapsibleCards = true
      el.cardBodyMaxHeight = '160px'
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      const firstCard = el.renderRoot.querySelector('.fzl-card')
      expect(firstCard.classList.contains('collapsible')).toBe(true)
      expect(firstCard.classList.contains('collapsed')).toBe(true)

      const chevron = firstCard.querySelector('.fzl-card-accordion-chevron')
      expect(chevron).not.toBeNull()
      expect(chevron.textContent).toBe('▾')

      const title = firstCard.querySelector('.fzl-card-title')
      expect(title.textContent).toBe('Revisar módulo Camel')

      // Body possui scrollable e respeita max-height configurado
      const body = firstCard.querySelector('.fzl-card-body')
      expect(body.classList.contains('scrollable')).toBe(true)
      expect(body.style.maxHeight).toBe('160px')

      document.body.removeChild(el)
    })

    it('clicar no título expande o card colapsado e emite fzl-card-toggle', async () => {
      const el = document.createElement('fzl-lit-card-list')
      el.collapsibleCards = true
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      let toggleDetail = null
      el.addEventListener('fzl-card-toggle', (e) => {
        toggleDetail = e.detail
      })

      const firstCard = el.renderRoot.querySelector('.fzl-card')
      const titleGroup = firstCard.querySelector('.fzl-card-title-group')

      // Simula clique no título
      titleGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await el.updateComplete

      expect(toggleDetail).not.toBeNull()
      expect(toggleDetail.item.id).toBe('task-1')
      expect(toggleDetail.expanded).toBe(true)
      expect(firstCard.classList.contains('expanded')).toBe(true)
      expect(firstCard.classList.contains('collapsed')).toBe(false)

      // Clica novamente para fechar
      titleGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await el.updateComplete

      expect(toggleDetail.expanded).toBe(false)
      expect(firstCard.classList.contains('collapsed')).toBe(true)

      document.body.removeChild(el)
    })

    it('teclas Enter e Space no título alternam o estado expandido/colapsado (A11y)', async () => {
      const el = document.createElement('fzl-lit-card-list')
      el.collapsibleCards = true
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      const firstCard = el.renderRoot.querySelector('.fzl-card')
      const titleGroup = firstCard.querySelector('.fzl-card-title-group')

      expect(titleGroup.getAttribute('role')).toBe('button')
      expect(titleGroup.getAttribute('aria-expanded')).toBe('false')

      // Pressiona Enter
      titleGroup.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      await el.updateComplete

      expect(titleGroup.getAttribute('aria-expanded')).toBe('true')
      expect(firstCard.classList.contains('expanded')).toBe(true)

      // Pressiona Space
      titleGroup.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      await el.updateComplete

      expect(titleGroup.getAttribute('aria-expanded')).toBe('false')
      expect(firstCard.classList.contains('collapsed')).toBe(true)

      document.body.removeChild(el)
    })

    it('suporta card colapsável individual via item.collapsible', async () => {
      const mixedItems = [
        { id: 'c-1', title: 'Card Normal', description: 'Curto' },
        { id: 'c-2', title: 'Card Longo com Acordeão', description: 'Texto longo...', collapsible: true },
      ]

      const el = document.createElement('fzl-lit-card-list')
      el.items = mixedItems
      document.body.appendChild(el)
      await el.updateComplete

      const cards = el.renderRoot.querySelectorAll('.fzl-card')
      expect(cards[0].classList.contains('collapsible')).toBe(false)
      expect(cards[1].classList.contains('collapsible')).toBe(true)
      expect(cards[1].classList.contains('collapsed')).toBe(true)

      document.body.removeChild(el)
    })

    it('expandAllCards() e collapseAllCards() alternam todos os cards programaticamente', async () => {
      const el = document.createElement('fzl-lit-card-list')
      el.collapsibleCards = true
      el.items = sampleItems
      document.body.appendChild(el)
      await el.updateComplete

      el.expandAllCards()
      await el.updateComplete

      const cardsAfterExpand = el.renderRoot.querySelectorAll('.fzl-card')
      cardsAfterExpand.forEach((c) => {
        expect(c.classList.contains('expanded')).toBe(true)
      })

      el.collapseAllCards()
      await el.updateComplete

      const cardsAfterCollapse = el.renderRoot.querySelectorAll('.fzl-card')
      cardsAfterCollapse.forEach((c) => {
        expect(c.classList.contains('collapsed')).toBe(true)
      })

      document.body.removeChild(el)
    })

    it('componente avulso <fzl-lit-card> funciona de forma independente', async () => {
      const card = document.createElement('fzl-lit-card')
      card.title = 'Termo de Adesão'
      card.subtitle = 'Regulamento do Fundo'
      card.badge = 'Obrigatório'
      card.badgeVariant = 'warning'
      card.collapsible = true
      card.bodyMaxHeight = '150px'
      card.innerHTML = '<p>Texto extenso de termos e condições com barra de rolagem.</p>'
      document.body.appendChild(card)
      await card.updateComplete

      const inner = card.renderRoot.querySelector('.fzl-card')
      expect(inner.classList.contains('collapsible')).toBe(true)
      expect(inner.classList.contains('collapsed')).toBe(true)

      // Alterna via método .toggle()
      card.toggle()
      await card.updateComplete

      expect(inner.classList.contains('expanded')).toBe(true)
      const body = card.renderRoot.querySelector('.fzl-card-body')
      expect(body.classList.contains('scrollable')).toBe(true)
      expect(body.style.maxHeight).toBe('150px')

      document.body.removeChild(card)
    })

    it('implementação Vanilla ES6 <fzl-es6-card-list> suporta collapsible-cards e acordeão', () => {
      const el = document.createElement('fzl-es6-card-list')
      el.collapsibleCards = true
      el.cardBodyMaxHeight = '150px'
      el.items = sampleItems
      document.body.appendChild(el)

      const firstCard = el.shadowRoot.querySelector('.fzl-card')
      expect(firstCard.classList.contains('collapsible')).toBe(true)
      expect(firstCard.classList.contains('collapsed')).toBe(true)

      const chevron = firstCard.querySelector('.fzl-card-accordion-chevron')
      expect(chevron).not.toBeNull()

      // Título e clique
      const titleGroup = firstCard.querySelector('.fzl-card-title-group')
      let toggleDetail = null
      el.addEventListener('fzl-card-toggle', (e) => {
        toggleDetail = e.detail
      })

      titleGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(toggleDetail).not.toBeNull()
      expect(toggleDetail.expanded).toBe(true)
      expect(el.isCardExpanded(sampleItems[0])).toBe(true)

      document.body.removeChild(el)
    })

    it('componente avulso Vanilla ES6 <fzl-es6-card> suporta modo colapsável e toggle', () => {
      const card = document.createElement('fzl-es6-card')
      card.title = 'Regras de Compliance'
      card.subtitle = 'Normas BACEN'
      card.collapsible = true
      card.bodyMaxHeight = '140px'
      card.innerHTML = '<p>Conteúdo extenso de compliance...</p>'
      document.body.appendChild(card)

      const inner = card.shadowRoot.querySelector('.fzl-card')
      expect(inner.classList.contains('collapsible')).toBe(true)
      expect(inner.classList.contains('collapsed')).toBe(true)

      card.toggle()
      expect(inner.classList.contains('expanded')).toBe(true)

      document.body.removeChild(card)
    })
  })
})
