/**
 * Normalized mouse/keyboard repeat controller ("Typematic").
 *
 * Inspired by Dijit's `dijit/typematic`: fires a callback immediately on press
 * and repeats it at an accelerating rate while the button or key remains held down.
 */

export interface FzlTypematicOptions {
  /** Initial delay in ms before the first repeat fires (default: 400ms) */
  initialDelay?: number;
  /** Minimum delay in ms at maximum acceleration (default: 60ms) */
  minDelay?: number;
  /** Decay factor applied after each tick (default: 0.85) */
  subsequentDelayFactor?: number;
}

export type FzlTypematicCallback = (count: number, event: MouseEvent | KeyboardEvent) => void;

export class FzlTypematicController {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _count = 0;
  private _active = false;

  /**
   * Starts repeating `callback` until `stop()` is called.
   */
  start(
    event: MouseEvent | KeyboardEvent,
    callback: FzlTypematicCallback,
    options: FzlTypematicOptions = {}
  ): void {
    this.stop();
    const initialDelay = options.initialDelay ?? 400;
    const minDelay = options.minDelay ?? 60;
    const factor = options.subsequentDelayFactor ?? 0.85;

    this._active = true;
    this._count = 0;

    // Trigger initial press (count = 0)
    callback(this._count++, event);

    let currentDelay = initialDelay;
    const scheduleNext = () => {
      if (!this._active) return;
      this._timer = setTimeout(() => {
        if (!this._active) return;
        callback(this._count++, event);
        currentDelay = Math.max(minDelay, Math.floor(currentDelay * factor));
        scheduleNext();
      }, currentDelay);
    };

    scheduleNext();
  }

  /**
   * Stops any active typematic repeat timer.
   */
  stop(): void {
    this._active = false;
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  get isActive(): boolean {
    return this._active;
  }
}

/**
 * Attaches mouse and keyboard (`Enter`/`Space`) typematic repeat behavior to an HTML element.
 * Returns a cleanup function that removes all listeners and stops timers.
 */
export function addTypematicListener(
  element: HTMLElement,
  callback: FzlTypematicCallback,
  options: FzlTypematicOptions = {}
): () => void {
  const controller = new FzlTypematicController();

  const onPointerDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if ((element as HTMLButtonElement).disabled || element.hasAttribute('disabled')) return;
    controller.start(e, callback, options);
  };

  const onPointerStop = () => {
    controller.stop();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    if ((element as HTMLButtonElement).disabled || element.hasAttribute('disabled')) return;
    e.preventDefault();
    controller.start(e, callback, options);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      controller.stop();
    }
  };

  element.addEventListener('mousedown', onPointerDown);
  element.addEventListener('mouseup', onPointerStop);
  element.addEventListener('mouseleave', onPointerStop);
  element.addEventListener('blur', onPointerStop);
  element.addEventListener('keydown', onKeyDown);
  element.addEventListener('keyup', onKeyUp);

  return () => {
    controller.stop();
    element.removeEventListener('mousedown', onPointerDown);
    element.removeEventListener('mouseup', onPointerStop);
    element.removeEventListener('mouseleave', onPointerStop);
    element.removeEventListener('blur', onPointerStop);
    element.removeEventListener('keydown', onKeyDown);
    element.removeEventListener('keyup', onKeyUp);
  };
}

export const fzlTypematic = {
  FzlTypematicController,
  addListener: addTypematicListener,
};
