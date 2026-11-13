// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  catalog,
  componentCategories,
  findCategory,
  hasCategory,
} from '../../demo/components/catalog.js';
import { ComponentsView } from '../../demo/components/components-view.js';

describe('Taxonomia e catálogo de Web Components', () => {
  it('define todas as 8 categorias esperadas', () => {
    const ids = componentCategories.map((c) => c.id);
    expect(ids).toEqual([
      'mobile',
      'forms',
      'data',
      'navigation',
      'multimedia',
      'geo',
      'reader',
      'system',
    ]);
  });

  it('associa todo componente do catálogo a uma categoria válida', () => {
    expect(catalog.length).toBeGreaterThanOrEqual(23);
    for (const item of catalog) {
      expect(typeof item.category).toBe('string');
      expect(item.category.length).toBeGreaterThan(0);
      const resolved = findCategory(item.category);
      expect(resolved).toBeDefined();
      expect(resolved.id).toBe(item.category);
    }
  });

  it('mapeia corretamente componentes representativos de cada domínio', () => {
    const byId = new Map(catalog.map((c) => [c.id, c]));
    expect(byId.get('contact-picker')?.category).toBe('mobile');
    expect(byId.get('camera-capture')?.category).toBe('mobile');
    expect(byId.get('form')?.category).toBe('forms');
    expect(byId.get('data-grid')?.category).toBe('data');
    expect(byId.get('crumb')?.category).toBe('navigation');
    expect(byId.get('interview-transcriber')?.category).toBe('multimedia');
    expect(byId.get('geo-explorer')?.category).toBe('geo');
    expect(byId.get('reader-content')?.category).toBe('reader');
    expect(byId.get('consent-banner')?.category).toBe('system');
    expect(hasCategory(byId.get('document-picker'), 'reader')).toBe(true);
    expect(hasCategory(byId.get('document-picker'), 'mobile')).toBe(true);
  });
});

describe('ComponentsView filtros e busca', () => {
  /** @type {ComponentsView} */
  let el;

  beforeEach(async () => {
    el = document.createElement('components-view');
    document.body.appendChild(el);
    await el.updateComplete;
  });

  afterEach(() => {
    el?.remove();
  });

  it('renderiza a pill Todos mais as 8 pills de categoria', () => {
    const pills = el.shadowRoot.querySelectorAll('.category-pill');
    expect(pills.length).toBe(9);
    expect(pills[0].textContent).toContain('Todos');
    expect(pills[0].getAttribute('aria-selected')).toBe('true');
  });

  it('filtra seções e cards ao clicar na categoria mobile', async () => {
    const pills = Array.from(el.shadowRoot.querySelectorAll('.category-pill'));
    const mobilePill = pills.find((p) => p.textContent.includes('Mobile'));
    expect(mobilePill).toBeDefined();

    mobilePill.click();
    await el.updateComplete;

    expect(mobilePill.getAttribute('aria-selected')).toBe('true');
    const sections = el.shadowRoot.querySelectorAll('section.category-section');
    expect(sections.length).toBe(1);

    const mobileCount = catalog.filter((c) => hasCategory(c, 'mobile')).length;
    const cards = el.shadowRoot.querySelectorAll('a.card');
    expect(cards.length).toBe(mobileCount);
  });

  it('filtra cards em tempo real pela caixa de busca', async () => {
    const input = el.shadowRoot.querySelector('.search-box input');
    expect(input).not.toBeNull();

    input.value = 'data-grid';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    const cards = el.shadowRoot.querySelectorAll('a.card');
    expect(cards.length).toBeGreaterThanOrEqual(1);
    const allMatchGrid = Array.from(cards).some((card) =>
      card.textContent.toLowerCase().includes('grid')
    );
    expect(allMatchGrid).toBe(true);
  });

  it('exibe estado vazio quando não há resultados e restaura ao limpar filtros', async () => {
    const input = el.shadowRoot.querySelector('.search-box input');
    input.value = 'termo-inexistente-xyz-999';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    const empty = el.shadowRoot.querySelector('.empty-catalog');
    expect(empty).not.toBeNull();
    expect(el.shadowRoot.querySelectorAll('a.card').length).toBe(0);

    const resetBtn = empty.querySelector('md-outlined-button');
    expect(resetBtn).not.toBeNull();
    resetBtn.click();
    await el.updateComplete;

    expect(el.shadowRoot.querySelector('.empty-catalog')).toBeNull();
    const cards = Array.from(el.shadowRoot.querySelectorAll('a.card'));
    const uniqueHrefs = new Set(cards.map((c) => c.getAttribute('href')));
    expect(uniqueHrefs.size).toBe(catalog.length);
  });
});
