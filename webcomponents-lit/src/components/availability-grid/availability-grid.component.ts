import { LitElement, html, css, unsafeCSS } from 'lit';
import { property, state } from 'lit/decorators.js';
import { fzlDesignTokensCss } from '@fzl/design-tokens';

export type FzlAvailabilityState = 'unavailable' | 'available' | 'preferred';
export type FzlAvailabilityMode = 'edit' | 'readonly' | 'heatmap';
export type FzlAvailabilityPeriod = 'morning' | 'afternoon' | 'evening';

export interface FzlAvailabilityDay {
  id: string;
  label: string;
  shortLabel?: string;
  weekend?: boolean;
}

export interface FzlAvailabilitySlot {
  id: string;
  label: string;
  period?: FzlAvailabilityPeriod;
}

export type FzlAvailabilityMap = Record<string, 'available' | 'preferred'>;

export interface FzlHeatmapCell {
  count: number;
  preferredCount?: number;
  total?: number;
  names?: string[];
}

export type FzlHeatmapData = Record<string, FzlHeatmapCell>;

export const DEFAULT_AVAILABILITY_DAYS: FzlAvailabilityDay[] = [
  { id: 'mon', label: 'Segunda-feira', shortLabel: 'Seg' },
  { id: 'tue', label: 'Terça-feira', shortLabel: 'Ter' },
  { id: 'wed', label: 'Quarta-feira', shortLabel: 'Qua' },
  { id: 'thu', label: 'Quinta-feira', shortLabel: 'Qui' },
  { id: 'fri', label: 'Sexta-feira', shortLabel: 'Sex' },
  { id: 'sat', label: 'Sábado', shortLabel: 'Sáb', weekend: true },
  { id: 'sun', label: 'Domingo', shortLabel: 'Dom', weekend: true },
];

export const DEFAULT_AVAILABILITY_SLOTS: FzlAvailabilitySlot[] = [
  { id: '07:00', label: '07:00 – 08:00', period: 'morning' },
  { id: '08:00', label: '08:00 – 09:00', period: 'morning' },
  { id: '09:00', label: '09:00 – 10:00', period: 'morning' },
  { id: '10:00', label: '10:00 – 11:00', period: 'morning' },
  { id: '11:00', label: '11:00 – 12:00', period: 'morning' },
  { id: '12:00', label: '12:00 – 13:00', period: 'afternoon' },
  { id: '13:00', label: '13:00 – 14:00', period: 'afternoon' },
  { id: '14:00', label: '14:00 – 15:00', period: 'afternoon' },
  { id: '15:00', label: '15:00 – 16:00', period: 'afternoon' },
  { id: '16:00', label: '16:00 – 17:00', period: 'afternoon' },
  { id: '17:00', label: '17:00 – 18:00', period: 'afternoon' },
  { id: '18:00', label: '18:00 – 19:00', period: 'evening' },
  { id: '19:00', label: '19:00 – 20:00', period: 'evening' },
  { id: '20:00', label: '20:00 – 21:00', period: 'evening' },
  { id: '21:00', label: '21:00 – 22:00', period: 'evening' },
];

export function parseFzlAvailabilityDays(
  days: FzlAvailabilityDay[] | string | null | undefined
): FzlAvailabilityDay[] {
  if (Array.isArray(days) && days.length > 0) {
    return days;
  }
  if (typeof days === 'string' && days.trim()) {
    try {
      const parsed = JSON.parse(days);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore parse error
    }
  }
  return DEFAULT_AVAILABILITY_DAYS;
}

export function parseFzlAvailabilitySlots(
  slots: FzlAvailabilitySlot[] | string | null | undefined
): FzlAvailabilitySlot[] {
  if (Array.isArray(slots) && slots.length > 0) {
    return slots;
  }
  if (typeof slots === 'string' && slots.trim()) {
    try {
      const parsed = JSON.parse(slots);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // ignore parse error
    }
  }
  return DEFAULT_AVAILABILITY_SLOTS;
}

export function parseFzlAvailabilityMap(
  value: FzlAvailabilityMap | string | null | undefined
): FzlAvailabilityMap {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...value };
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as FzlAvailabilityMap;
      }
    } catch {
      // ignore parse error
    }
  }
  return {};
}

export function parseFzlHeatmapData(
  data: FzlHeatmapData | string | null | undefined
): FzlHeatmapData {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return { ...data };
  }
  if (typeof data === 'string' && data.trim()) {
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as FzlHeatmapData;
      }
    } catch {
      // ignore parse error
    }
  }
  return {};
}

/**
 * Multi-Engine Weekly Availability Grid Custom Element (`fzl-lit-availability-grid`)
 * Supports interactive slot painting (`edit`), visualization (`readonly`), and aggregated student availability (`heatmap`).
 *
 * @customElement fzl-lit-availability-grid
 * @tag fzl-lit-availability-grid
 *
 * @fires {CustomEvent<{ value: FzlAvailabilityMap; changedKeys: string[]; activeState: FzlAvailabilityState }>} fzl-availability-change - Dispatched when availability map changes in edit mode
 * @fires {CustomEvent<{ key: string; dayId: string; slotId: string; day: FzlAvailabilityDay; slot: FzlAvailabilitySlot; state: FzlAvailabilityState; heatmap?: FzlHeatmapCell; originalEvent: Event }>} fzl-cell-select - Dispatched when a grid cell is clicked/selected
 *
 * @csspart container - Outer wrapper container
 * @csspart toolbar - Top brush & quick actions toolbar
 * @csspart legend - Heatmap legend bar
 * @csspart grid-wrapper - Horizontal scroll container for the grid
 * @csspart grid - The availability grid table element
 * @csspart header-cell - Day column header cell
 * @csspart slot-cell - Sticky time slot row header cell
 * @csspart cell - Individual availability slot cell
 * @csspart summary - Footer summary bar
 */
export class FzlLitAvailabilityGrid extends LitElement {
  static override styles = [
    unsafeCSS(fzlDesignTokensCss),
    css`
      :host {
        display: block;
        font-family: var(--_fzl-font-family);
        color: var(--_fzl-color-text);
        box-sizing: border-box;
        user-select: none;
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      .fzl-avail-container {
        display: flex;
        flex-direction: column;
        gap: var(--_fzl-space-3);
        width: 100%;
      }

      /* Toolbar */
      .fzl-avail-toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--_fzl-space-3);
        padding: var(--_fzl-space-3);
        background-color: var(--_fzl-color-surface-muted);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
      }

      .fzl-toolbar-section {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--_fzl-space-2);
      }

      .fzl-toolbar-label {
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-semibold);
        color: var(--_fzl-color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-right: var(--_fzl-space-1);
      }

      /* Brush Pills */
      .fzl-brush-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        padding: 6px 12px;
        border-radius: 999px;
        border: 1.5px solid var(--_fzl-color-border);
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        cursor: pointer;
        transition: all var(--_fzl-transition-fast);
      }

      .fzl-brush-btn:hover {
        border-color: var(--_fzl-color-border-hover);
      }

      .fzl-brush-btn:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      .fzl-brush-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
      }

      .fzl-brush-btn.brush-available .fzl-brush-dot {
        background-color: var(--_fzl-color-success);
      }

      .fzl-brush-btn.brush-preferred .fzl-brush-dot {
        background-color: var(--_fzl-color-warning);
      }

      .fzl-brush-btn.brush-unavailable .fzl-brush-dot {
        background-color: var(--_fzl-color-border-hover);
      }

      .fzl-brush-btn.active.brush-available {
        background-color: var(--_fzl-color-success);
        border-color: var(--_fzl-color-success);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(21, 128, 61, 0.25);
      }

      .fzl-brush-btn.active.brush-available .fzl-brush-dot {
        background-color: #ffffff;
      }

      .fzl-brush-btn.active.brush-preferred {
        background-color: var(--_fzl-color-warning);
        border-color: var(--_fzl-color-warning);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(180, 83, 9, 0.25);
      }

      .fzl-brush-btn.active.brush-preferred .fzl-brush-dot {
        background-color: #ffffff;
      }

      .fzl-brush-btn.active.brush-unavailable {
        background-color: var(--_fzl-color-danger);
        border-color: var(--_fzl-color-danger);
        color: #ffffff;
        box-shadow: 0 2px 6px rgba(185, 28, 28, 0.25);
      }

      .fzl-brush-btn.active.brush-unavailable .fzl-brush-dot {
        background-color: #ffffff;
      }

      /* Quick Action Buttons */
      .fzl-quick-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-family: inherit;
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        padding: 5px 10px;
        border-radius: var(--_fzl-radius-sm);
        border: 1px solid var(--_fzl-color-border);
        background-color: var(--_fzl-color-surface);
        color: var(--_fzl-color-text);
        cursor: pointer;
        transition: background-color var(--_fzl-transition-fast), border-color var(--_fzl-transition-fast);
      }

      .fzl-quick-btn:hover {
        background-color: var(--_fzl-color-surface-muted);
        border-color: var(--_fzl-color-primary);
      }

      .fzl-quick-btn:focus-visible {
        outline: none;
        box-shadow: var(--_fzl-focus-ring);
      }

      .fzl-quick-btn.danger:hover {
        border-color: var(--_fzl-color-danger);
        color: var(--_fzl-color-danger);
      }

      /* Heatmap Legend */
      .fzl-heatmap-legend {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--_fzl-space-3);
        padding: var(--_fzl-space-2) var(--_fzl-space-3);
        background-color: var(--_fzl-color-surface-muted);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        font-size: var(--_fzl-font-size-xs);
      }

      .fzl-legend-items {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--_fzl-space-3);
      }

      .fzl-legend-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--_fzl-color-text);
      }

      .fzl-legend-swatch {
        width: 14px;
        height: 14px;
        border-radius: 3px;
        border: 1px solid var(--_fzl-color-border);
      }

      .fzl-legend-swatch.level-0 {
        background-color: var(--_fzl-color-surface);
      }

      .fzl-legend-swatch.level-1 {
        background-color: rgba(29, 78, 216, 0.16);
      }

      .fzl-legend-swatch.level-2 {
        background-color: rgba(29, 78, 216, 0.36);
      }

      .fzl-legend-swatch.level-3 {
        background-color: rgba(21, 128, 61, 0.52);
      }

      .fzl-legend-swatch.level-4 {
        background-color: rgba(21, 128, 61, 0.82);
      }

      /* Grid Wrapper */
      .fzl-grid-wrapper {
        width: 100%;
        overflow-x: auto;
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        background-color: var(--_fzl-color-surface);
      }

      .fzl-avail-table {
        width: 100%;
        min-width: 600px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }

      .fzl-avail-table th,
      .fzl-avail-table td {
        border-bottom: 1px solid var(--_fzl-color-border);
        border-right: 1px solid var(--_fzl-color-border);
        padding: 0;
        margin: 0;
      }

      .fzl-avail-table tr:last-child td,
      .fzl-avail-table tr:last-child th {
        border-bottom: none;
      }

      .fzl-avail-table th:last-child,
      .fzl-avail-table td:last-child {
        border-right: none;
      }

      /* Corner & Sticky Slot Header */
      .fzl-corner-cell {
        width: 128px;
        min-width: 128px;
        position: sticky;
        left: 0;
        z-index: 3;
        background-color: var(--_fzl-color-surface-muted);
        padding: var(--_fzl-space-2);
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-semibold);
        color: var(--_fzl-color-text-muted);
        text-align: center;
      }

      .fzl-day-header {
        background-color: var(--_fzl-color-surface-muted);
        padding: var(--_fzl-space-2) var(--_fzl-space-1);
        text-align: center;
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-semibold);
        color: var(--_fzl-color-text);
        transition: background-color var(--_fzl-transition-fast);
      }

      .fzl-day-header.interactive {
        cursor: pointer;
      }

      .fzl-day-header.interactive:hover {
        background-color: rgba(29, 78, 216, 0.1);
      }

      .fzl-day-header-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }

      .fzl-day-short {
        font-size: var(--_fzl-font-size-sm);
        font-weight: var(--_fzl-font-weight-semibold);
      }

      .fzl-day-full {
        font-size: 0.68rem;
        color: var(--_fzl-color-text-muted);
        font-weight: var(--_fzl-font-weight-regular);
      }

      /* Slot Row Header */
      .fzl-slot-header {
        width: 128px;
        min-width: 128px;
        position: sticky;
        left: 0;
        z-index: 2;
        background-color: var(--_fzl-color-surface-muted);
        padding: 6px var(--_fzl-space-2);
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-medium);
        color: var(--_fzl-color-text);
        text-align: left;
        white-space: nowrap;
        transition: background-color var(--_fzl-transition-fast);
      }

      .fzl-slot-header.interactive {
        cursor: pointer;
      }

      .fzl-slot-header.interactive:hover {
        background-color: rgba(29, 78, 216, 0.1);
      }

      .fzl-slot-header-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
      }

      .fzl-period-dot {
        font-size: 0.7rem;
        opacity: 0.75;
      }

      /* Grid Cell */
      .fzl-grid-cell {
        height: 40px;
        position: relative;
        text-align: center;
        vertical-align: middle;
        background-color: var(--_fzl-color-surface);
        transition: background-color 100ms ease, transform 80ms ease;
        outline: none;
      }

      .fzl-grid-cell.interactive {
        cursor: pointer;
      }

      .fzl-grid-cell.interactive:hover {
        filter: brightness(0.96);
      }

      .fzl-grid-cell:focus-visible {
        z-index: 1;
        box-shadow: inset 0 0 0 2px var(--_fzl-color-primary);
      }

      .fzl-grid-cell.selected {
        z-index: 1;
        box-shadow: inset 0 0 0 2.5px var(--_fzl-color-primary);
      }

      /* States in edit / readonly mode */
      .fzl-grid-cell.state-available {
        background-color: rgba(21, 128, 61, 0.18);
        color: var(--_fzl-color-success);
      }

      .fzl-grid-cell.state-preferred {
        background-color: rgba(180, 83, 9, 0.22);
        color: var(--_fzl-color-warning);
      }

      .fzl-cell-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 3px;
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-semibold);
        line-height: 1;
      }

      /* Heatmap Cell Styling */
      .fzl-grid-cell.heatmap-level-0 {
        background-color: var(--_fzl-color-surface);
      }

      .fzl-grid-cell.heatmap-level-1 {
        background-color: rgba(29, 78, 216, 0.16);
      }

      .fzl-grid-cell.heatmap-level-2 {
        background-color: rgba(29, 78, 216, 0.34);
      }

      .fzl-grid-cell.heatmap-level-3 {
        background-color: rgba(21, 128, 61, 0.48);
      }

      .fzl-grid-cell.heatmap-level-4 {
        background-color: rgba(21, 128, 61, 0.78);
        color: #ffffff;
      }

      .fzl-heatmap-cell-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 2px 4px;
        height: 100%;
      }

      .fzl-heatmap-count {
        font-size: var(--_fzl-font-size-xs);
        font-weight: var(--_fzl-font-weight-semibold);
        line-height: 1.1;
      }

      .fzl-heatmap-pref {
        font-size: 0.65rem;
        font-weight: var(--_fzl-font-weight-medium);
        opacity: 0.9;
        line-height: 1;
      }

      /* Footer Summary */
      .fzl-avail-summary {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--_fzl-space-2);
        padding: var(--_fzl-space-2) var(--_fzl-space-3);
        background-color: var(--_fzl-color-surface-muted);
        border: 1px solid var(--_fzl-color-border);
        border-radius: var(--_fzl-radius-md);
        font-size: var(--_fzl-font-size-xs);
        color: var(--_fzl-color-text-muted);
      }

      .fzl-summary-counts {
        display: flex;
        align-items: center;
        gap: var(--_fzl-space-3);
        font-weight: var(--_fzl-font-weight-medium);
        color: var(--_fzl-color-text);
      }

      @media (max-width: 640px) {
        .fzl-day-full {
          display: none;
        }
        .fzl-corner-cell,
        .fzl-slot-header {
          width: 96px;
          min-width: 96px;
          font-size: 0.7rem;
        }
      }
    `,
  ];

  /** Mode: 'edit' | 'readonly' | 'heatmap' */
  @property({ type: String, reflect: true })
  mode: FzlAvailabilityMode = 'edit';

  /** Days configuration array or JSON string */
  @property({ type: Array })
  days: FzlAvailabilityDay[] | string = DEFAULT_AVAILABILITY_DAYS;

  /** Time slots configuration array or JSON string */
  @property({ type: Array })
  slots: FzlAvailabilitySlot[] | string = DEFAULT_AVAILABILITY_SLOTS;

  /** Map of "${dayId}:${slotId}" -> 'available' | 'preferred' */
  @property({ type: Object })
  value: FzlAvailabilityMap | string = {};

  /** Aggregated heatmap data map or JSON string */
  @property({ type: Object, attribute: 'heatmap-data' })
  heatmapData: FzlHeatmapData | string = {};

  /** Active brush state in edit mode */
  @property({ type: String, attribute: 'active-state' })
  activeState: FzlAvailabilityState = 'available';

  /** Whether to show the top quick actions toolbar in edit mode */
  @property({ type: Boolean, attribute: 'show-quick-actions' })
  showQuickActions: boolean = true;

  /** Whether to include weekend columns */
  @property({ type: Boolean, attribute: 'include-weekend' })
  includeWeekend: boolean = true;

  /** Selected cell key ("${dayId}:${slotId}") */
  @property({ type: String, attribute: 'selected-key' })
  selectedKey: string = '';

  @state()
  private _isPainting: boolean = false;

  @state()
  private _paintTargetState: FzlAvailabilityState = 'available';

  private _boundPointerUp = () => {
    this._isPainting = false;
  };

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('pointerup', this._boundPointerUp);
    window.addEventListener('pointercancel', this._boundPointerUp);
  }

  override disconnectedCallback() {
    window.removeEventListener('pointerup', this._boundPointerUp);
    window.removeEventListener('pointercancel', this._boundPointerUp);
    super.disconnectedCallback();
  }

  private _getVisibleDays(): FzlAvailabilityDay[] {
    const allDays = parseFzlAvailabilityDays(this.days);
    return this.includeWeekend ? allDays : allDays.filter((d) => !d.weekend);
  }

  private _getSlots(): FzlAvailabilitySlot[] {
    return parseFzlAvailabilitySlots(this.slots);
  }

  private _getValueMap(): FzlAvailabilityMap {
    return parseFzlAvailabilityMap(this.value);
  }

  private _getHeatmapMap(): FzlHeatmapData {
    return parseFzlHeatmapData(this.heatmapData);
  }

  private _commitValue(nextMap: FzlAvailabilityMap, changedKeys: string[]) {
    if (typeof this.value === 'string') {
      this.value = JSON.stringify(nextMap);
    } else {
      this.value = { ...nextMap };
    }

    this.dispatchEvent(
      new CustomEvent('fzl-availability-change', {
        detail: {
          value: { ...nextMap },
          changedKeys,
          activeState: this.activeState,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _applyKeysState(keys: string[], targetState: FzlAvailabilityState) {
    if (keys.length === 0) return;
    const current = this._getValueMap();
    const changed: string[] = [];

    for (const key of keys) {
      const prev = current[key] ?? 'unavailable';
      if (prev !== targetState) {
        if (targetState === 'unavailable') {
          delete current[key];
        } else {
          current[key] = targetState;
        }
        changed.push(key);
      }
    }

    if (changed.length > 0) {
      this._commitValue(current, changed);
    }
  }

  private _toggleGroupKeys(keys: string[]) {
    if (this.mode !== 'edit' || keys.length === 0) return;
    const current = this._getValueMap();
    const brush = this.activeState;

    const allMatchBrush = keys.every((k) => (current[k] ?? 'unavailable') === brush);
    const target: FzlAvailabilityState = allMatchBrush ? 'unavailable' : brush;
    this._applyKeysState(keys, target);
  }

  private _handlePeriodQuickAction(period: FzlAvailabilityPeriod) {
    const days = this._getVisibleDays();
    const slots = this._getSlots().filter((s) => s.period === period);
    const keys: string[] = [];
    for (const d of days) {
      for (const s of slots) {
        keys.push(`${d.id}:${s.id}`);
      }
    }
    this._toggleGroupKeys(keys);
  }

  private _handleWeekdaysQuickAction() {
    const days = this._getVisibleDays().filter((d) => !d.weekend);
    const slots = this._getSlots();
    const keys: string[] = [];
    for (const d of days) {
      for (const s of slots) {
        keys.push(`${d.id}:${s.id}`);
      }
    }
    this._toggleGroupKeys(keys);
  }

  private _handleClearAll() {
    if (this.mode !== 'edit') return;
    const current = this._getValueMap();
    const changedKeys = Object.keys(current);
    if (changedKeys.length === 0) return;
    this._commitValue({}, changedKeys);
  }

  private _handleDayHeaderClick(day: FzlAvailabilityDay) {
    if (this.mode !== 'edit') return;
    const slots = this._getSlots();
    const keys = slots.map((s) => `${day.id}:${s.id}`);
    this._toggleGroupKeys(keys);
  }

  private _handleSlotHeaderClick(slot: FzlAvailabilitySlot) {
    if (this.mode !== 'edit') return;
    const days = this._getVisibleDays();
    const keys = days.map((d) => `${d.id}:${slot.id}`);
    this._toggleGroupKeys(keys);
  }

  private _handleCellPointerDown(day: FzlAvailabilityDay, slot: FzlAvailabilitySlot, event: PointerEvent) {
    const key = `${day.id}:${slot.id}`;
    const currentMap = this._getValueMap();
    const currentState: FzlAvailabilityState = currentMap[key] ?? 'unavailable';

    if (this.mode === 'edit') {
      event.preventDefault();
      this._isPainting = true;
      const targetState: FzlAvailabilityState =
        currentState === this.activeState ? 'unavailable' : this.activeState;
      this._paintTargetState = targetState;
      this._applyKeysState([key], targetState);
    }

    this.selectedKey = key;
    const updatedMap = this._getValueMap();
    const stateAfter: FzlAvailabilityState = updatedMap[key] ?? 'unavailable';
    const heatmap = this._getHeatmapMap()[key];

    this.dispatchEvent(
      new CustomEvent('fzl-cell-select', {
        detail: {
          key,
          dayId: day.id,
          slotId: slot.id,
          day,
          slot,
          state: stateAfter,
          heatmap,
          originalEvent: event,
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleCellPointerEnter(day: FzlAvailabilityDay, slot: FzlAvailabilitySlot) {
    if (this.mode !== 'edit' || !this._isPainting) return;
    const key = `${day.id}:${slot.id}`;
    this._applyKeysState([key], this._paintTargetState);
  }

  private _handleCellKeyDown(day: FzlAvailabilityDay, slot: FzlAvailabilitySlot, event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const key = `${day.id}:${slot.id}`;
      const currentMap = this._getValueMap();
      const currentState: FzlAvailabilityState = currentMap[key] ?? 'unavailable';

      if (this.mode === 'edit') {
        const targetState: FzlAvailabilityState =
          currentState === this.activeState ? 'unavailable' : this.activeState;
        this._applyKeysState([key], targetState);
      }

      this.selectedKey = key;
      const updatedMap = this._getValueMap();
      const stateAfter: FzlAvailabilityState = updatedMap[key] ?? 'unavailable';
      const heatmap = this._getHeatmapMap()[key];

      this.dispatchEvent(
        new CustomEvent('fzl-cell-select', {
          detail: {
            key,
            dayId: day.id,
            slotId: slot.id,
            day,
            slot,
            state: stateAfter,
            heatmap,
            originalEvent: event,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _getHeatmapLevel(count: number, maxTotal: number): number {
    if (!count || count <= 0 || maxTotal <= 0) return 0;
    const ratio = count / maxTotal;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
  }

  private _getPeriodIcon(period?: FzlAvailabilityPeriod): string {
    if (period === 'morning') return '☀️';
    if (period === 'afternoon') return '🌤️';
    if (period === 'evening') return '🌙';
    return '';
  }

  override render() {
    const visibleDays = this._getVisibleDays();
    const slots = this._getSlots();
    const valueMap = this._getValueMap();
    const heatmapMap = this._getHeatmapMap();

    let totalAvailable = 0;
    let totalPreferred = 0;
    for (const val of Object.values(valueMap)) {
      if (val === 'available') totalAvailable++;
      if (val === 'preferred') {
        totalAvailable++;
        totalPreferred++;
      }
    }

    let maxTotal = 1;
    for (const cell of Object.values(heatmapMap)) {
      if (cell.total && cell.total > maxTotal) maxTotal = cell.total;
      if (cell.count > maxTotal) maxTotal = cell.count;
    }

    return html`
      <div class="fzl-avail-container" part="container">
        ${this.mode === 'edit' && this.showQuickActions
          ? html`
              <div class="fzl-avail-toolbar" part="toolbar" role="toolbar" aria-label="Ferramentas de disponibilidade">
                <div class="fzl-toolbar-section">
                  <span class="fzl-toolbar-label">Pincel:</span>
                  <button
                    type="button"
                    class="fzl-brush-btn brush-available ${this.activeState === 'available' ? 'active' : ''}"
                    @click=${() => {
                      this.activeState = 'available';
                    }}
                    aria-pressed=${this.activeState === 'available' ? 'true' : 'false'}
                  >
                    <span class="fzl-brush-dot"></span>
                    Disponível
                  </button>
                  <button
                    type="button"
                    class="fzl-brush-btn brush-preferred ${this.activeState === 'preferred' ? 'active' : ''}"
                    @click=${() => {
                      this.activeState = 'preferred';
                    }}
                    aria-pressed=${this.activeState === 'preferred' ? 'true' : 'false'}
                  >
                    <span class="fzl-brush-dot"></span>
                    Preferencial ★
                  </button>
                  <button
                    type="button"
                    class="fzl-brush-btn brush-unavailable ${this.activeState === 'unavailable' ? 'active' : ''}"
                    @click=${() => {
                      this.activeState = 'unavailable';
                    }}
                    aria-pressed=${this.activeState === 'unavailable' ? 'true' : 'false'}
                  >
                    <span class="fzl-brush-dot"></span>
                    Indisponível / Apagar
                  </button>
                </div>

                <div class="fzl-toolbar-section">
                  <span class="fzl-toolbar-label">Atalhos:</span>
                  <button
                    type="button"
                    class="fzl-quick-btn"
                    @click=${() => this._handlePeriodQuickAction('morning')}
                    title="Preencher ou limpar turno da manhã"
                  >
                    ☀️ Manhã (07h–12h)
                  </button>
                  <button
                    type="button"
                    class="fzl-quick-btn"
                    @click=${() => this._handlePeriodQuickAction('afternoon')}
                    title="Preencher ou limpar turno da tarde"
                  >
                    🌤️ Tarde (12h–18h)
                  </button>
                  <button
                    type="button"
                    class="fzl-quick-btn"
                    @click=${() => this._handlePeriodQuickAction('evening')}
                    title="Preencher ou limpar turno da noite"
                  >
                    🌙 Noite (18h–22h)
                  </button>
                  <button
                    type="button"
                    class="fzl-quick-btn"
                    @click=${this._handleWeekdaysQuickAction}
                    title="Preencher ou limpar segunda a sexta"
                  >
                    📅 Dias Úteis
                  </button>
                  <button
                    type="button"
                    class="fzl-quick-btn danger"
                    @click=${this._handleClearAll}
                    title="Limpar todos os horários marcados"
                  >
                    🗑️ Limpar Tudo
                  </button>
                </div>
              </div>
            `
          : ''}

        ${this.mode === 'heatmap'
          ? html`
              <div class="fzl-heatmap-legend" part="legend" aria-label="Legenda de intensidade do mapa de calor">
                <div class="fzl-legend-items">
                  <span class="fzl-toolbar-label">Adesão da Turma:</span>
                  <span class="fzl-legend-item">
                    <span class="fzl-legend-swatch level-0"></span> 0%
                  </span>
                  <span class="fzl-legend-item">
                    <span class="fzl-legend-swatch level-1"></span> 1–25%
                  </span>
                  <span class="fzl-legend-item">
                    <span class="fzl-legend-swatch level-2"></span> 26–50%
                  </span>
                  <span class="fzl-legend-item">
                    <span class="fzl-legend-swatch level-3"></span> 51–75%
                  </span>
                  <span class="fzl-legend-item">
                    <span class="fzl-legend-swatch level-4"></span> 76–100%
                  </span>
                </div>
                <span>★ Indica alunos que marcaram o horário como preferencial</span>
              </div>
            `
          : ''}

        <div class="fzl-grid-wrapper" part="grid-wrapper">
          <table class="fzl-avail-table" part="grid" role="grid" aria-label="Grade Semanal de Disponibilidade">
            <thead>
              <tr role="row">
                <th class="fzl-corner-cell" scope="col">Horário / Dia</th>
                ${visibleDays.map(
                  (day) => html`
                    <th
                      class="fzl-day-header ${this.mode === 'edit' ? 'interactive' : ''}"
                      part="header-cell"
                      scope="col"
                      tabindex=${this.mode === 'edit' ? '0' : '-1'}
                      title=${this.mode === 'edit' ? `Clique para alternar ${day.label}` : day.label}
                      @click=${() => this._handleDayHeaderClick(day)}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          this._handleDayHeaderClick(day);
                        }
                      }}
                    >
                      <div class="fzl-day-header-content">
                        <span class="fzl-day-short">${day.shortLabel || day.label}</span>
                        <span class="fzl-day-full">${day.label}</span>
                      </div>
                    </th>
                  `
                )}
              </tr>
            </thead>
            <tbody>
              ${slots.map(
                (slot) => html`
                  <tr role="row">
                    <th
                      class="fzl-slot-header ${this.mode === 'edit' ? 'interactive' : ''}"
                      part="slot-cell"
                      scope="row"
                      tabindex=${this.mode === 'edit' ? '0' : '-1'}
                      title=${this.mode === 'edit' ? `Clique para alternar faixa ${slot.label}` : slot.label}
                      @click=${() => this._handleSlotHeaderClick(slot)}
                      @keydown=${(e: KeyboardEvent) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          this._handleSlotHeaderClick(slot);
                        }
                      }}
                    >
                      <div class="fzl-slot-header-inner">
                        <span>${slot.label}</span>
                        <span class="fzl-period-dot" aria-hidden="true">${this._getPeriodIcon(slot.period)}</span>
                      </div>
                    </th>
                    ${visibleDays.map((day) => {
                      const key = `${day.id}:${slot.id}`;
                      const cellState: FzlAvailabilityState =
                        (valueMap[key] as FzlAvailabilityState | undefined) ?? 'unavailable';
                      const isSelected = this.selectedKey === key;

                      if (this.mode === 'heatmap') {
                        const hm = heatmapMap[key];
                        const count = hm?.count ?? 0;
                        const prefCount = hm?.preferredCount ?? 0;
                        const cellTotal = hm?.total ?? maxTotal;
                        const level = this._getHeatmapLevel(count, cellTotal);

                        return html`
                          <td
                            class="fzl-grid-cell interactive heatmap-level-${level} ${isSelected ? 'selected' : ''}"
                            part="cell"
                            role="gridcell"
                            tabindex="0"
                            aria-label="${day.label}, ${slot.label}: ${count} disponíveis"
                            @pointerdown=${(e: PointerEvent) => this._handleCellPointerDown(day, slot, e)}
                            @keydown=${(e: KeyboardEvent) => this._handleCellKeyDown(day, slot, e)}
                          >
                            ${count > 0
                              ? html`
                                  <div class="fzl-heatmap-cell-content">
                                    <span class="fzl-heatmap-count">
                                      ${hm?.total ? `${count}/${hm.total}` : `${count}`}
                                    </span>
                                    ${prefCount > 0
                                      ? html`<span class="fzl-heatmap-pref">★ ${prefCount}</span>`
                                      : ''}
                                  </div>
                                `
                              : html`<span style="opacity: 0.3; font-size: 0.7rem;">—</span>`}
                          </td>
                        `;
                      }

                      return html`
                        <td
                          class="fzl-grid-cell ${this.mode === 'edit' ? 'interactive' : ''} state-${cellState} ${isSelected ? 'selected' : ''}"
                          part="cell"
                          role="gridcell"
                          tabindex="0"
                          aria-selected=${cellState !== 'unavailable' ? 'true' : 'false'}
                          aria-label="${day.label}, ${slot.label}: ${cellState === 'preferred'
                            ? 'Preferencial'
                            : cellState === 'available'
                              ? 'Disponível'
                              : 'Indisponível'}"
                          @pointerdown=${(e: PointerEvent) => this._handleCellPointerDown(day, slot, e)}
                          @pointerenter=${() => this._handleCellPointerEnter(day, slot)}
                          @keydown=${(e: KeyboardEvent) => this._handleCellKeyDown(day, slot, e)}
                        >
                          ${cellState === 'preferred'
                            ? html`<span class="fzl-cell-badge">★ Pref</span>`
                            : cellState === 'available'
                              ? html`<span class="fzl-cell-badge">✓ Disp</span>`
                              : ''}
                        </td>
                      `;
                    })}
                  </tr>
                `
              )}
            </tbody>
          </table>
        </div>

        <div class="fzl-avail-summary" part="summary">
          ${this.mode === 'heatmap'
            ? html`
                <span>Clique em um horário para ver os alunos disponíveis</span>
                <div class="fzl-summary-counts">
                  <span>Total de faixas: ${visibleDays.length * slots.length}</span>
                </div>
              `
            : html`
                <span>
                  ${this.mode === 'edit'
                    ? 'Dica: clique e arraste pelas células ou clique no cabeçalho do dia/horário para preencher rapidamente.'
                    : 'Visualização somente leitura da disponibilidade semanal.'}
                </span>
                <div class="fzl-summary-counts">
                  <span>${totalAvailable} horários disponíveis (${totalPreferred} preferenciais)</span>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

if (!customElements.get('fzl-lit-availability-grid')) {
  customElements.define('fzl-lit-availability-grid', FzlLitAvailabilityGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-lit-availability-grid': FzlLitAvailabilityGrid;
  }
}
