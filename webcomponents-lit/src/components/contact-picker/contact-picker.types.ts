/**
 * Contact Picker Types & Helpers for FZL Web Components
 */

export interface FzlContact {
  id: string;
  name?: string[];
  tel?: string[];
  email?: string[];
  address?: string[];
  icon?: (Blob | string)[];
  organization?: string;
  note?: string;
}

export type FzlContactProperty = 'name' | 'tel' | 'email' | 'address' | 'icon';

/**
 * Checks whether the W3C Contact Picker API is supported in the current browser.
 */
export function isContactPickerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof (navigator as any).contacts?.select === 'function'
  );
}

/**
 * Lightweight, robust parser for vCard (.vcf) format (vCard 2.1, 3.0, 4.0)
 */
export function parseVCard(vcfText: string): FzlContact[] {
  if (!vcfText || typeof vcfText !== 'string') return [];

  const contacts: FzlContact[] = [];
  const lines = vcfText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

  let currentContact: Partial<FzlContact> | null = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Handle vCard line unfolding (lines starting with space or tab belong to previous line)
    while (i + 1 < lines.length && (lines[i + 1].startsWith(' ') || lines[i + 1].startsWith('\t'))) {
      i++;
      line += lines[i].trim();
    }

    if (line.toUpperCase() === 'BEGIN:VCARD') {
      currentContact = {
        id: `vcf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: [],
        tel: [],
        email: [],
        address: [],
      };
      continue;
    }

    if (line.toUpperCase() === 'END:VCARD') {
      if (currentContact) {
        // Ensure at least a name or telephone/email is present
        const hasInfo =
          (currentContact.name && currentContact.name.length > 0) ||
          (currentContact.tel && currentContact.tel.length > 0) ||
          (currentContact.email && currentContact.email.length > 0);

        if (hasInfo) {
          contacts.push(currentContact as FzlContact);
        }
      }
      currentContact = null;
      continue;
    }

    if (!currentContact) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const rawKey = line.substring(0, colonIdx);
    const value = line.substring(colonIdx + 1).trim();
    const key = rawKey.split(';')[0].toUpperCase();

    if (key === 'FN' || key === 'N') {
      if (!currentContact.name) currentContact.name = [];
      const cleanName = key === 'N' ? value.split(';').filter(Boolean).reverse().join(' ') : value;
      if (cleanName && !currentContact.name.includes(cleanName)) {
        currentContact.name.push(cleanName);
      }
    } else if (key === 'TEL') {
      if (!currentContact.tel) currentContact.tel = [];
      const cleanTel = value.replace(/[^\d+()\s-]/g, '').trim();
      if (cleanTel && !currentContact.tel.includes(cleanTel)) {
        currentContact.tel.push(cleanTel);
      }
    } else if (key === 'EMAIL') {
      if (!currentContact.email) currentContact.email = [];
      const cleanEmail = value.trim();
      if (cleanEmail && !currentContact.email.includes(cleanEmail)) {
        currentContact.email.push(cleanEmail);
      }
    } else if (key === 'ADR') {
      if (!currentContact.address) currentContact.address = [];
      const cleanAdr = value.split(';').filter(Boolean).join(', ').trim();
      if (cleanAdr) currentContact.address.push(cleanAdr);
    } else if (key === 'ORG') {
      currentContact.organization = value.replace(/;/g, ' - ').trim();
    } else if (key === 'NOTE') {
      currentContact.note = value;
    }
  }

  return contacts;
}
