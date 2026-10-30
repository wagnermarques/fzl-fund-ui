import { describe, expect, it } from 'vitest'
import {
  filterFzlCardItems,
  parseFzlCardItems,
  sortFzlCardItems,
} from '@fzl/webcomponents-lit/card-list'

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
})
