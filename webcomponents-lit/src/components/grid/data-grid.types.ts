/**
 * Data Grid Column Descriptor
 * Inspired by Dojo `dojox/grid/DataGrid` cell/structure definition and `dgrid`.
 */
export interface FzlGridColumn<T = any> {
  /** Field name in the row object (e.g. 'ticker', 'price') */
  field: string;
  /** Header label for the column */
  label?: string;
  /** Dojo compatibility alias for `label` */
  name?: string;
  /** Column width CSS string (e.g. '120px', '20%') */
  width?: string;
  /** Whether the column can be sorted (default: true) */
  sortable?: boolean;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom formatter function for rendering cell content */
  formatter?: (value: any, row: T) => any;
  /** Whether column is hidden */
  hidden?: boolean;
}

export type FzlGridSelectionMode = 'none' | 'single' | 'multiple';

/**
 * Safely parses columns from Array or JSON string (supports Dojo `structure` alias).
 */
export function parseGridColumns(columns: any): FzlGridColumn[] {
  let list: any[] = [];
  if (Array.isArray(columns)) {
    list = columns;
  } else if (typeof columns === 'string' && columns.trim()) {
    try {
      const parsed = JSON.parse(columns);
      if (Array.isArray(parsed)) list = parsed;
    } catch {}
  }

  return list
    .filter((col) => col && typeof col === 'object' && col.field)
    .map((col) => ({
      field: String(col.field),
      label: col.label ?? col.name ?? String(col.field),
      width: col.width,
      sortable: col.sortable !== false,
      align: col.align === 'center' || col.align === 'right' ? col.align : 'left',
      formatter: typeof col.formatter === 'function' ? col.formatter : undefined,
      hidden: Boolean(col.hidden),
    }));
}

/**
 * Safely parses items from Array or JSON string.
 */
export function parseGridItems(items: any): any[] {
  if (Array.isArray(items)) {
    return items;
  }
  if (typeof items === 'string' && items.trim()) {
    try {
      const parsed = JSON.parse(items);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

/**
 * Generates and downloads a CSV export from the given items and columns.
 */
export function exportToCsv(items: any[], columns: FzlGridColumn[], filename: string = 'export.csv'): string {
  const visibleCols = columns.filter((c) => !c.hidden);
  const headers = visibleCols.map((c) => `"${(c.label || c.field).replace(/"/g, '""')}"`).join(';');
  
  const rows = items.map((row) =>
    visibleCols
      .map((col) => {
        let val = row[col.field];
        if (col.formatter) {
          try {
            val = col.formatter(val, row);
          } catch {}
        }
        if (val === null || val === undefined) val = '';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(';')
  );

  const csvContent = [headers, ...rows].join('\r\n');

  if (typeof document !== 'undefined') {
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return csvContent;
}
