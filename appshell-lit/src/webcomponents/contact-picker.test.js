// @vitest-environment happy-dom
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  FzlContactPicker,
  parseVCard,
  isContactPickerSupported,
} from '@fzl/webcomponents-lit/contact-picker';

describe('Contact Picker Helpers', () => {
  const sampleVcf = `BEGIN:VCARD
VERSION:3.0
FN:Carlos Eduardo Silva
ORG:FZL Investimentos;Diretoria
TEL;TYPE=CELL:+55 (11) 99876-5432
EMAIL;TYPE=WORK:carlos.silva@fzlinvest.com.br
NOTE:Cotista preferencial Série A
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Mariana Albuquerque
TEL:+55 (21) 98765-1122
EMAIL:mariana.albuquerque@exemplo.com
END:VCARD`;

  it('faz parse correto de arquivo vCard com múltiplos contatos', () => {
    const contacts = parseVCard(sampleVcf);
    expect(contacts).toHaveLength(2);

    expect(contacts[0].name).toContain('Carlos Eduardo Silva');
    expect(contacts[0].tel).toContain('+55 (11) 99876-5432');
    expect(contacts[0].email).toContain('carlos.silva@fzlinvest.com.br');
    expect(contacts[0].organization).toBe('FZL Investimentos - Diretoria');
    expect(contacts[0].note).toBe('Cotista preferencial Série A');

    expect(contacts[1].name).toContain('Mariana Albuquerque');
    expect(contacts[1].tel).toContain('+55 (21) 98765-1122');
    expect(contacts[1].email).toContain('mariana.albuquerque@exemplo.com');
  });

  it('retorna array vazio para entrada vazia ou inválida', () => {
    expect(parseVCard('')).toEqual([]);
    expect(parseVCard(null)).toEqual([]);
    expect(parseVCard('TEXTO ALEATORIO SEM VCARD')).toEqual([]);
  });

  it('detecta disponibilidade do Contact Picker API', () => {
    // In happy-dom by default navigator.contacts is undefined
    expect(typeof isContactPickerSupported()).toBe('boolean');
  });
});

describe('FzlContactPicker Component', () => {
  let picker;

  beforeEach(async () => {
    picker = new FzlContactPicker();
    document.body.appendChild(picker);
    await picker.updateComplete;
  });

  afterEach(() => {
    if (picker && picker.parentNode) {
      picker.parentNode.removeChild(picker);
    }
  });

  it('renderiza o componente com estado inicial vazio', () => {
    expect(picker).toBeInstanceOf(FzlContactPicker);
    const emptyState = picker.shadowRoot.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('Nenhum contato selecionado');
  });

  it('abre o modal fallback quando a API nativa não está presente', async () => {
    picker.openPicker();
    await picker.updateComplete;

    const modal = picker.shadowRoot.querySelector('.modal-dialog');
    expect(modal).toBeTruthy();
    expect(modal.textContent).toContain('Selecionar / Adicionar Contato');
  });

  it('adiciona contato via método interno e emite evento fzl-contact-select', async () => {
    let selectEventDetail = null;
    picker.addEventListener('fzl-contact-select', (e) => {
      selectEventDetail = e.detail;
    });

    const newContact = {
      id: 'test-1',
      name: ['Roberto Souza'],
      tel: ['+55 11 91234-5678'],
      email: ['roberto@fzlbpms.com'],
      organization: 'Auditoria FZL',
    };

    picker.selectedContacts = [newContact];
    await picker.updateComplete;

    const cards = picker.shadowRoot.querySelectorAll('.contact-card');
    expect(cards.length).toBe(1);
    expect(cards[0].textContent).toContain('Roberto Souza');
    expect(cards[0].textContent).toContain('Auditoria FZL');
  });

  it('remove contato e emite evento fzl-contact-remove', async () => {
    picker.selectedContacts = [
      { id: 'c-1', name: ['Contato 1'] },
      { id: 'c-2', name: ['Contato 2'] },
    ];
    await picker.updateComplete;

    let removedDetail = null;
    picker.addEventListener('fzl-contact-remove', (e) => {
      removedDetail = e.detail;
    });

    picker.removeContact('c-1');
    await picker.updateComplete;

    expect(picker.selectedContacts).toHaveLength(1);
    expect(picker.selectedContacts[0].id).toBe('c-2');
    expect(removedDetail.contact.id).toBe('c-1');
  });

  it('limpa todos os contatos com clear()', async () => {
    picker.selectedContacts = [{ id: 'c-1', name: ['Ana'] }];
    await picker.updateComplete;
    expect(picker.selectedContacts).toHaveLength(1);

    picker.clear();
    await picker.updateComplete;
    expect(picker.selectedContacts).toHaveLength(0);
  });
});
