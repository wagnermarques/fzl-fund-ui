// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  FzlLitRichTextEditor,
  defaultSanitizeHtml,
} from '@fzl/webcomponents-lit/rich-text-editor';

describe('FzlLitRichTextEditor Component', () => {
  it('sanitiza tags perigosas e scripts mantendo tags permitidas e tabelas', () => {
    const dirty = '<p>Texto seguro <b>negrito</b> <script>alert("xss")</script><table border="1"><thead><tr><th>Col 1</th></tr></thead><tbody><tr><td>Val 1</td></tr></tbody></table><a href="javascript:alert(1)">Link malicioso</a></p>';
    const clean = defaultSanitizeHtml(dirty);

    expect(clean).toContain('Texto seguro');
    expect(clean).toContain('<b>negrito</b>');
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('alert("xss")');
    expect(clean).toContain('<table>');
    expect(clean).toContain('<th>Col 1</th>');
    expect(clean).toContain('<td>Val 1</td>');
    expect(clean).not.toContain('href="javascript:');
  });

  it('instancia o componente com valores padrão', async () => {
    const editor = new FzlLitRichTextEditor();
    document.body.appendChild(editor);
    await editor.updateComplete;

    expect(editor.value).toBe('');
    expect(editor.disabled).toBe(false);
    expect(editor.shadowRoot).toBeDefined();

    const editable = editor.shadowRoot.querySelector('.editable');
    expect(editable).not.toBeNull();
    expect(editable.getAttribute('contenteditable')).toBe('true');

    editor.remove();
  });

  it('atualiza o valor e sincroniza com a área editável via setValue()', async () => {
    const editor = new FzlLitRichTextEditor();
    document.body.appendChild(editor);
    await editor.updateComplete;

    editor.setValue('<p>Olá <b>Mundo</b></p>');
    await editor.updateComplete;

    expect(editor.value).toContain('Olá');
    expect(editor.value).toContain('<b>Mundo</b>');

    editor.reset();
    expect(editor.value).toBe('');

    editor.remove();
  });

  it('desabilita a edição quando disabled=true', async () => {
    const editor = new FzlLitRichTextEditor();
    editor.disabled = true;
    document.body.appendChild(editor);
    await editor.updateComplete;

    const editable = editor.shadowRoot.querySelector('.editable');
    expect(editable.getAttribute('contenteditable')).toBe('false');

    editor.remove();
  });
});
