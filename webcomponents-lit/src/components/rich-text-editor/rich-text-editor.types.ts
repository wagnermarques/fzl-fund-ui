/**
 * Types and interfaces for the FZL Rich Text Editor web component.
 */

export interface FzlRichTextEditorChangeEvent {
  value: string;
}

export type FzlRichTextFormatCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'removeFormat';

export type FzlRichTextSanitizerFn = (dirtyHtml: string) => string;
