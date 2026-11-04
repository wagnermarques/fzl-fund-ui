/**
 * Positioning (`fzlPlace`) and popup stack management (`fzlPopup`) utilities.
 *
 * Inspired by Dijit's `dijit/place` and `dijit/popup` for positioning dropdowns,
 * menus, and floating panels relative to anchor elements with viewport collision flip.
 */

export type FzlPlacementPosition = 'below' | 'above' | 'before' | 'after';

export interface FzlPlaceResult {
  position: FzlPlacementPosition;
  top: number;
  left: number;
}

export const fzlPlace = {
  /**
   * Positions `popupNode` around `anchorNode` trying `positions` in order
   * and choosing the one with the least viewport overflow.
   */
  around(
    popupNode: HTMLElement,
    anchorNode: HTMLElement,
    positions: FzlPlacementPosition[] = ['below', 'above'],
    offset: number = 4
  ): FzlPlaceResult {
    const anchorRect = anchorNode.getBoundingClientRect();
    const popupRect = popupNode.getBoundingClientRect();
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 768;

    let best: FzlPlaceResult = {
      position: positions[0] ?? 'below',
      top: anchorRect.bottom + offset,
      left: anchorRect.left,
    };

    for (const pos of positions) {
      let top = anchorRect.bottom + offset;
      let left = anchorRect.left;

      if (pos === 'above') {
        top = anchorRect.top - popupRect.height - offset;
      } else if (pos === 'before') {
        top = anchorRect.top;
        left = anchorRect.left - popupRect.width - offset;
      } else if (pos === 'after') {
        top = anchorRect.top;
        left = anchorRect.right + offset;
      }

      // Clamp horizontal within viewport
      left = Math.max(4, Math.min(left, vw - popupRect.width - 4));

      const fitsVertically = top >= 0 && top + popupRect.height <= vh;
      best = { position: pos, top, left };
      if (fitsVertically) break;
    }

    popupNode.style.position = 'fixed';
    popupNode.style.top = `${best.top}px`;
    popupNode.style.left = `${best.left}px`;
    return best;
  },
};

export interface FzlPopupEntry {
  popup: HTMLElement;
  anchor?: HTMLElement;
  onClose?: () => void;
}

class FzlPopupManager {
  private _stack: FzlPopupEntry[] = [];
  private _baseZIndex = 1000;

  open(entry: FzlPopupEntry, positions: FzlPlacementPosition[] = ['below', 'above']): void {
    this._stack.push(entry);
    const zIndex = this._baseZIndex + this._stack.length * 2;
    entry.popup.style.zIndex = String(zIndex);
    entry.popup.removeAttribute('hidden');
    if (entry.anchor) {
      fzlPlace.around(entry.popup, entry.anchor, positions);
    }
  }

  close(popup?: HTMLElement): void {
    if (!popup) {
      const top = this._stack.pop();
      if (top) {
        top.popup.setAttribute('hidden', '');
        top.onClose?.();
      }
      return;
    }
    const idx = this._stack.findIndex((it) => it.popup === popup);
    if (idx !== -1) {
      const removed = this._stack.splice(idx);
      for (const item of removed.reverse()) {
        item.popup.setAttribute('hidden', '');
        item.onClose?.();
      }
    }
  }

  get topPopup(): FzlPopupEntry | undefined {
    return this._stack[this._stack.length - 1];
  }
}

export const fzlPopup = new FzlPopupManager();
