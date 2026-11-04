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

const template = document.createElement('template');
template.innerHTML = `
  <style>
    ${fzlDesignTokensCss}

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
  </style>
  <div class="fzl-avail-container" part="container"></div>
`;

/**
 * Pure ES6 Custom Element (`fzl-es6-availability-grid`)
 * Weekly availability grid supporting edit, readonly, and heatmap modes.
 *
 * @customElement fzl-es6-availability-grid
 * @tag fzl-es6-availability-grid
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
export class FzlEs6AvailabilityGrid extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'mode',
      'days',
      'slots',
      'value',
      'heatmap-data',
      'active-state',
      'show-quick-actions',
      'include-weekend',
      'selected-key',
    ];
  }

  private _mode: FzlAvailabilityMode = 'edit';
  private _days: FzlAvailabilityDay[] = DEFAULT_AVAILABILITY_DAYS;
  private _slots: FzlAvailabilitySlot[] = DEFAULT_AVAILABILITY_SLOTS;
  private _value: FzlAvailabilityMap = {};
  private _heatmapData: FzlHeatmapData = {};
  private _activeState: FzlAvailabilityState = 'available';
  private _showQuickActions: boolean = true;
  private _includeWeekend: boolean = true;
  private _selectedKey: string = '';

  private _isPainting: boolean = false;
  private _paintTargetState: FzlAvailabilityState = 'available';

  private readonly _root: ShadowRoot;
  private readonly _containerEl: HTMLDivElement;

  private _boundPointerUp = () => {
    this._isPainting = false;
  };

  constructor() {
    super();
    this._root = this.attachShadow({ mode: 'open' });
    this._root.appendChild(template.content.cloneNode(true));
    this._containerEl = this._root.querySelector('.fzl-avail-container') as HTMLDivElement;
  }

  get mode(): FzlAvailabilityMode {
    return this._mode;
  }
  set mode(val: FzlAvailabilityMode) {
    this._mode = val || 'edit';
    this._render();
  }

  get days(): FzlAvailabilityDay[] | string {
    return this._days;
  }
  set days(val: FzlAvailabilityDay[] | string) {
    this._days = parseFzlAvailabilityDays(val);
    this._render();
  }

  get slots(): FzlAvailabilitySlot[] | string {
    return this._slots;
  }
  set slots(val: FzlAvailabilitySlot[] | string) {
    this._slots = parseFzlAvailabilitySlots(val);
    this._render();
  }

  get value(): FzlAvailabilityMap | string {
    return this._value;
  }
  set value(val: FzlAvailabilityMap | string) {
    this._value = parseFzlAvailabilityMap(val);
    this._render();
  }

  get heatmapData(): FzlHeatmapData | string {
    return this._heatmapData;
  }
  set heatmapData(val: FzlHeatmapData | string) {
    this._heatmapData = parseFzlHeatmapData(val);
    this._render();
  }

  get activeState(): FzlAvailabilityState {
    return this._activeState;
  }
  set activeState(val: FzlAvailabilityState) {
    this._activeState = val || 'available';
    this._render();
  }

  get showQuickActions(): boolean {
    return this._showQuickActions;
  }
  set showQuickActions(val: boolean) {
    this._showQuickActions = Boolean(val);
    this._render();
  }

  get includeWeekend(): boolean {
    return this._includeWeekend;
  }
  set includeWeekend(val: boolean) {
    this._includeWeekend = Boolean(val);
    this._render();
  }

  get selectedKey(): string {
    return this._selectedKey;
  }
  set selectedKey(val: string) {
    this._selectedKey = val || '';
    this._render();
  }

  connectedCallback(): void {
    window.addEventListener('pointerup', this._boundPointerUp);
    window.addEventListener('pointercancel', this._boundPointerUp);
    this._render();
  }

  disconnectedCallback(): void {
    window.removeEventListener('pointerup', this._boundPointerUp);
    window.removeEventListener('pointercancel', this._boundPointerUp);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    switch (name) {
      case 'mode':
        this._mode = (newValue as FzlAvailabilityMode) || 'edit';
        break;
      case 'days':
        this._days = parseFzlAvailabilityDays(newValue);
        break;
      case 'slots':
        this._slots = parseFzlAvailabilitySlots(newValue);
        break;
      case 'value':
        this._value = parseFzlAvailabilityMap(newValue);
        break;
      case 'heatmap-data':
        this._heatmapData = parseFzlHeatmapData(newValue);
        break;
      case 'active-state':
        this._activeState = (newValue as FzlAvailabilityState) || 'available';
        break;
      case 'show-quick-actions':
        this._showQuickActions = newValue !== 'false';
        break;
      case 'include-weekend':
        this._includeWeekend = newValue !== 'false';
        break;
      case 'selected-key':
        this._selectedKey = newValue || '';
        break;
    }
    this._render();
  }

  private _getVisibleDays(): FzlAvailabilityDay[] {
    return this._includeWeekend ? this._days : this._days.filter((d) => !d.weekend);
  }

  private _commitValue(nextMap: FzlAvailabilityMap, changedKeys: string[]): void {
    this._value = { ...nextMap };
    this.dispatchEvent(
      new CustomEvent('fzl-availability-change', {
        detail: {
          value: { ...nextMap },
          changedKeys,
          activeState: this._activeState,
        },
        bubbles: true,
        composed: true,
      })
    );
    this._render();
  }

  private _applyKeysState(keys: string[], targetState: FzlAvailabilityState): void {
    if (keys.length === 0) return;
    const current = { ...this._value };
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

  private _toggleGroupKeys(keys: string[]): void {
    if (this._mode !== 'edit' || keys.length === 0) return;
    const allMatchBrush = keys.every((k) => (this._value[k] ?? 'unavailable') === this._activeState);
    const target: FzlAvailabilityState = allMatchBrush ? 'unavailable' : this._activeState;
    this._applyKeysState(keys, target);
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

  private _render(): void {
    if (!this._containerEl) return;
    this._containerEl.innerHTML = '';

    const visibleDays = this._getVisibleDays();
    const slots = this._slots;
    const valueMap = this._value;
    const heatmapMap = this._heatmapData;

    // 1. Toolbar (edit mode)
    if (this._mode === 'edit' && this._showQuickActions) {
      const toolbar = document.createElement('div');
      toolbar.className = 'fzl-avail-toolbar';
      toolbar.setAttribute('part', 'toolbar');
      toolbar.setAttribute('role', 'toolbar');
      toolbar.setAttribute('aria-label', 'Ferramentas de disponibilidade');

      const brushSection = document.createElement('div');
      brushSection.className = 'fzl-toolbar-section';

      const brushLabel = document.createElement('span');
      brushLabel.className = 'fzl-toolbar-label';
      brushLabel.textContent = 'Pincel:';
      brushSection.appendChild(brushLabel);

      const brushes: { state: FzlAvailabilityState; text: string; cls: string }[] = [
        { state: 'available', text: 'Disponível', cls: 'brush-available' },
        { state: 'preferred', text: 'Preferencial ★', cls: 'brush-preferred' },
        { state: 'unavailable', text: 'Indisponível / Apagar', cls: 'brush-unavailable' },
      ];

      for (const b of brushes) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `fzl-brush-btn ${b.cls} ${this._activeState === b.state ? 'active' : ''}`.trim();
        btn.setAttribute('aria-pressed', this._activeState === b.state ? 'true' : 'false');

        const dot = document.createElement('span');
        dot.className = 'fzl-brush-dot';
        btn.appendChild(dot);
        btn.appendChild(document.createTextNode(b.text));

        btn.addEventListener('click', () => {
          this._activeState = b.state;
          this._render();
        });
        brushSection.appendChild(btn);
      }

      const quickSection = document.createElement('div');
      quickSection.className = 'fzl-toolbar-section';

      const quickLabel = document.createElement('span');
      quickLabel.className = 'fzl-toolbar-label';
      quickLabel.textContent = 'Atalhos:';
      quickSection.appendChild(quickLabel);

      const periodButtons: { period: FzlAvailabilityPeriod; text: string }[] = [
        { period: 'morning', text: '☀️ Manhã (07h–12h)' },
        { period: 'afternoon', text: '🌤️ Tarde (12h–18h)' },
        { period: 'evening', text: '🌙 Noite (18h–22h)' },
      ];

      for (const pb of periodButtons) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fzl-quick-btn';
        btn.textContent = pb.text;
        btn.addEventListener('click', () => {
          const periodSlots = slots.filter((s) => s.period === pb.period);
          const keys: string[] = [];
          for (const d of visibleDays) {
            for (const s of periodSlots) {
              keys.push(`${d.id}:${s.id}`);
            }
          }
          this._toggleGroupKeys(keys);
        });
        quickSection.appendChild(btn);
      }

      const weekdaysBtn = document.createElement('button');
      weekdaysBtn.type = 'button';
      weekdaysBtn.className = 'fzl-quick-btn';
      weekdaysBtn.textContent = '📅 Dias Úteis';
      weekdaysBtn.addEventListener('click', () => {
        const wkDays = visibleDays.filter((d) => !d.weekend);
        const keys: string[] = [];
        for (const d of wkDays) {
          for (const s of slots) {
            keys.push(`${d.id}:${s.id}`);
          }
        }
        this._toggleGroupKeys(keys);
      });
      quickSection.appendChild(weekdaysBtn);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'fzl-quick-btn danger';
      clearBtn.textContent = '🗑️ Limpar Tudo';
      clearBtn.addEventListener('click', () => {
        const keys = Object.keys(this._value);
        if (keys.length > 0) {
          this._commitValue({}, keys);
        }
      });
      quickSection.appendChild(clearBtn);

      toolbar.appendChild(brushSection);
      toolbar.appendChild(quickSection);
      this._containerEl.appendChild(toolbar);
    }

    // 2. Legend (heatmap mode)
    if (this._mode === 'heatmap') {
      const legend = document.createElement('div');
      legend.className = 'fzl-heatmap-legend';
      legend.setAttribute('part', 'legend');
      legend.setAttribute('aria-label', 'Legenda de intensidade do mapa de calor');
      legend.innerHTML = `
        <div class="fzl-legend-items">
          <span class="fzl-toolbar-label">Adesão da Turma:</span>
          <span class="fzl-legend-item"><span class="fzl-legend-swatch level-0"></span> 0%</span>
          <span class="fzl-legend-item"><span class="fzl-legend-swatch level-1"></span> 1–25%</span>
          <span class="fzl-legend-item"><span class="fzl-legend-swatch level-2"></span> 26–50%</span>
          <span class="fzl-legend-item"><span class="fzl-legend-swatch level-3"></span> 51–75%</span>
          <span class="fzl-legend-item"><span class="fzl-legend-swatch level-4"></span> 76–100%</span>
        </div>
        <span>★ Indica alunos que marcaram o horário como preferencial</span>
      `;
      this._containerEl.appendChild(legend);
    }

    // 3. Grid Table
    let maxTotal = 1;
    for (const cell of Object.values(heatmapMap)) {
      if (cell.total && cell.total > maxTotal) maxTotal = cell.total;
      if (cell.count > maxTotal) maxTotal = cell.count;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'fzl-grid-wrapper';
    wrapper.setAttribute('part', 'grid-wrapper');

    const table = document.createElement('table');
    table.className = 'fzl-avail-table';
    table.setAttribute('part', 'grid');
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', 'Grade Semanal de Disponibilidade');

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    headRow.setAttribute('role', 'row');

    const cornerTh = document.createElement('th');
    cornerTh.className = 'fzl-corner-cell';
    cornerTh.setAttribute('scope', 'col');
    cornerTh.textContent = 'Horário / Dia';
    headRow.appendChild(cornerTh);

    for (const day of visibleDays) {
      const th = document.createElement('th');
      th.className = `fzl-day-header ${this._mode === 'edit' ? 'interactive' : ''}`.trim();
      th.setAttribute('part', 'header-cell');
      th.setAttribute('scope', 'col');
      th.tabIndex = this._mode === 'edit' ? 0 : -1;
      th.title = this._mode === 'edit' ? `Clique para alternar ${day.label}` : day.label;

      const content = document.createElement('div');
      content.className = 'fzl-day-header-content';

      const shortSpan = document.createElement('span');
      shortSpan.className = 'fzl-day-short';
      shortSpan.textContent = day.shortLabel || day.label;

      const fullSpan = document.createElement('span');
      fullSpan.className = 'fzl-day-full';
      fullSpan.textContent = day.label;

      content.appendChild(shortSpan);
      content.appendChild(fullSpan);
      th.appendChild(content);

      if (this._mode === 'edit') {
        th.addEventListener('click', () => {
          const keys = slots.map((s) => `${day.id}:${s.id}`);
          this._toggleGroupKeys(keys);
        });
      }
      headRow.appendChild(th);
    }

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    for (const slot of slots) {
      const tr = document.createElement('tr');
      tr.setAttribute('role', 'row');

      const slotTh = document.createElement('th');
      slotTh.className = `fzl-slot-header ${this._mode === 'edit' ? 'interactive' : ''}`.trim();
      slotTh.setAttribute('part', 'slot-cell');
      slotTh.setAttribute('scope', 'row');
      slotTh.tabIndex = this._mode === 'edit' ? 0 : -1;
      slotTh.title = this._mode === 'edit' ? `Clique para alternar faixa ${slot.label}` : slot.label;

      const inner = document.createElement('div');
      inner.className = 'fzl-slot-header-inner';

      const labelSpan = document.createElement('span');
      labelSpan.textContent = slot.label;
      inner.appendChild(labelSpan);

      const periodSpan = document.createElement('span');
      periodSpan.className = 'fzl-period-dot';
      periodSpan.setAttribute('aria-hidden', 'true');
      periodSpan.textContent = this._getPeriodIcon(slot.period);
      inner.appendChild(periodSpan);

      slotTh.appendChild(inner);

      if (this._mode === 'edit') {
        slotTh.addEventListener('click', () => {
          const keys = visibleDays.map((d) => `${d.id}:${slot.id}`);
          this._toggleGroupKeys(keys);
        });
      }
      tr.appendChild(slotTh);

      for (const day of visibleDays) {
        const key = `${day.id}:${slot.id}`;
        const cellState: FzlAvailabilityState =
          (valueMap[key] as FzlAvailabilityState | undefined) ?? 'unavailable';
        const isSelected = this._selectedKey === key;

        const td = document.createElement('td');
        td.setAttribute('part', 'cell');
        td.setAttribute('role', 'gridcell');
        td.tabIndex = 0;

        if (this._mode === 'heatmap') {
          const hm = heatmapMap[key];
          const count = hm?.count ?? 0;
          const prefCount = hm?.preferredCount ?? 0;
          const cellTotal = hm?.total ?? maxTotal;
          const level = this._getHeatmapLevel(count, cellTotal);

          td.className = `fzl-grid-cell interactive heatmap-level-${level} ${isSelected ? 'selected' : ''}`.trim();
          td.setAttribute('aria-label', `${day.label}, ${slot.label}: ${count} disponíveis`);

          if (count > 0) {
            const hmContent = document.createElement('div');
            hmContent.className = 'fzl-heatmap-cell-content';

            const countSpan = document.createElement('span');
            countSpan.className = 'fzl-heatmap-count';
            countSpan.textContent = hm?.total ? `${count}/${hm.total}` : `${count}`;
            hmContent.appendChild(countSpan);

            if (prefCount > 0) {
              const prefSpan = document.createElement('span');
              prefSpan.className = 'fzl-heatmap-pref';
              prefSpan.textContent = `★ ${prefCount}`;
              hmContent.appendChild(prefSpan);
            }
            td.appendChild(hmContent);
          } else {
            const dash = document.createElement('span');
            dash.style.opacity = '0.3';
            dash.style.fontSize = '0.7rem';
            dash.textContent = '—';
            td.appendChild(dash);
          }
        } else {
          td.className = `fzl-grid-cell ${this._mode === 'edit' ? 'interactive' : ''} state-${cellState} ${isSelected ? 'selected' : ''}`.trim();
          td.setAttribute('aria-selected', cellState !== 'unavailable' ? 'true' : 'false');

          if (cellState === 'preferred') {
            const badge = document.createElement('span');
            badge.className = 'fzl-cell-badge';
            badge.textContent = '★ Pref';
            td.appendChild(badge);
          } else if (cellState === 'available') {
            const badge = document.createElement('span');
            badge.className = 'fzl-cell-badge';
            badge.textContent = '✓ Disp';
            td.appendChild(badge);
          }
        }

        td.addEventListener('pointerdown', (e: PointerEvent) => {
          const currentState: FzlAvailabilityState = this._value[key] ?? 'unavailable';
          if (this._mode === 'edit') {
            e.preventDefault();
            this._isPainting = true;
            const targetState: FzlAvailabilityState =
              currentState === this._activeState ? 'unavailable' : this._activeState;
            this._paintTargetState = targetState;
            this._selectedKey = key;
            this._applyKeysState([key], targetState);
          } else {
            this._selectedKey = key;
            this._render();
          }

          const stateAfter: FzlAvailabilityState = this._value[key] ?? 'unavailable';
          this.dispatchEvent(
            new CustomEvent('fzl-cell-select', {
              detail: {
                key,
                dayId: day.id,
                slotId: slot.id,
                day,
                slot,
                state: stateAfter,
                heatmap: this._heatmapData[key],
                originalEvent: e,
              },
              bubbles: true,
              composed: true,
            })
          );
        });

        td.addEventListener('pointerenter', () => {
          if (this._mode !== 'edit' || !this._isPainting) return;
          this._applyKeysState([key], this._paintTargetState);
        });

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrapper.appendChild(table);
    this._containerEl.appendChild(wrapper);

    // 4. Summary Footer
    let totalAvailable = 0;
    let totalPreferred = 0;
    for (const val of Object.values(valueMap)) {
      if (val === 'available') totalAvailable++;
      if (val === 'preferred') {
        totalAvailable++;
        totalPreferred++;
      }
    }

    const summary = document.createElement('div');
    summary.className = 'fzl-avail-summary';
    summary.setAttribute('part', 'summary');

    if (this._mode === 'heatmap') {
      summary.innerHTML = `
        <span>Clique em um horário para ver os alunos disponíveis</span>
        <div class="fzl-summary-counts">
          <span>Total de faixas: ${visibleDays.length * slots.length}</span>
        </div>
      `;
    } else {
      const tipText =
        this._mode === 'edit'
          ? 'Dica: clique e arraste pelas células ou clique no cabeçalho do dia/horário para preencher rapidamente.'
          : 'Visualização somente leitura da disponibilidade semanal.';
      summary.innerHTML = `
        <span>${tipText}</span>
        <div class="fzl-summary-counts">
          <span>${totalAvailable} horários disponíveis (${totalPreferred} preferenciais)</span>
        </div>
      `;
    }

    this._containerEl.appendChild(summary);
  }
}

if (!customElements.get('fzl-es6-availability-grid')) {
  customElements.define('fzl-es6-availability-grid', FzlEs6AvailabilityGrid);
}

declare global {
  interface HTMLElementTagNameMap {
    'fzl-es6-availability-grid': FzlEs6AvailabilityGrid;
  }
}
