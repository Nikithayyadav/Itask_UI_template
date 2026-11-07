import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { TableColumnDefinition, TableDefinition } from '../../types/config.types';

type SortState = { key: string; direction: 'ascending' | 'descending' };
type ServerSort<SortField extends string> = { Sort_Field: SortField; Sort_Order: 'ASC' | 'DESC' };

type ServerPagination = {
  Page_Number: number;
  Page_Size: number;
  Total_Records: number;
  Total_Pages: number;
  Has_Next_Page: boolean;
  Has_Previous_Page: boolean;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

type ConfiguredTableProps<Row, SortField extends string> = {
  definition: TableDefinition;
  rows: Row[];
  pageNo: number;
  setPageNo: (page: number) => void;
  itemLabel: string;
  rowKey: (row: Row) => string;
  renderCell: (row: Row, column: TableColumnDefinition) => ReactNode;
  renderHeader?: (column: TableColumnDefinition) => ReactNode;
  bodyState?: ReactNode;
  onRowClick?: (row: Row) => void;
  serverPagination?: ServerPagination;
  serverSorting?: {
    fields: ServerSort<SortField>[];
    onChange: (fields: ServerSort<SortField>[]) => void;
    isSortField: (field: string) => field is SortField;
  };
};

function readValue<Row>(row: Row, key: string): unknown {
  if (typeof row !== 'object' || row === null) return undefined;
  return Reflect.get(row, key);
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  const leftText = String(left ?? '');
  const rightText = String(right ?? '');
  const leftDate = Date.parse(leftText);
  const rightDate = Date.parse(rightText);
  if (!Number.isNaN(leftDate) && !Number.isNaN(rightDate)) return leftDate - rightDate;
  return leftText.localeCompare(rightText, undefined, { numeric: true, sensitivity: 'base' });
}

export function ConfiguredTable<Row, SortField extends string = string>({
  definition,
  rows,
  pageNo,
  setPageNo,
  itemLabel,
  rowKey,
  renderCell,
  renderHeader,
  bodyState,
  onRowClick,
  serverPagination,
  serverSorting,
}: ConfiguredTableProps<Row, SortField>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortedRows = useMemo(() => {
    if (serverSorting || !definition.sorting.enabled || !sort) return rows;
    return [...rows].sort((left, right) => {
      const compared = compareValues(readValue(left, sort.key), readValue(right, sort.key));
      return sort.direction === 'ascending' ? compared : -compared;
    });
  }, [definition.sorting.enabled, rows, serverSorting, sort]);
  const pageSize = definition.pagination.enabled ? definition.pagination.page_size : Math.max(rows.length, 1);
  const pages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(pageNo, pages);
  const visibleRows = serverPagination
    ? rows
    : sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!serverPagination && currentPage !== pageNo) setPageNo(currentPage);
  }, [currentPage, pageNo, serverPagination, setPageNo]);

  function toggleSort(column: TableColumnDefinition, shiftKey: boolean) {
    if (!definition.sorting.enabled || !column.sortable) return;
    if (serverSorting) {
      if (!serverSorting.isSortField(column.key)) return;
      const current = serverSorting.fields;
      const existing = current.find(item => item.Sort_Field === column.key);
      const base = shiftKey ? current.filter(item => item.Sort_Field !== column.key) : [];
      const updated = [
        ...base,
        {
          Sort_Field: column.key,
          Sort_Order: existing?.Sort_Order === 'ASC' ? 'DESC' as const : 'ASC' as const,
        },
      ];
      serverSorting.onChange(updated);
      return;
    }
    setSort(current => ({
      key: column.key,
      direction: current?.key === column.key && current.direction === 'ascending' ? 'descending' : 'ascending',
    }));
    setPageNo(1);
  }

  return <>
    <div className="table-scroll"><table><thead><tr>{definition.columns.map(column => {
      const serverSortIndex = serverSorting?.fields.findIndex(item => item.Sort_Field === column.key) ?? -1;
      const direction = serverSorting
        ? serverSortIndex < 0
          ? undefined
          : serverSorting.fields[serverSortIndex].Sort_Order === 'ASC' ? 'ascending' : 'descending'
        : sort?.key === column.key ? sort.direction : undefined;
      return <th key={column.key} aria-sort={direction}>
        {column.sortable && definition.sorting.enabled
          ? <button type="button" className="table-sort-button" onClick={event => toggleSort(column, event.shiftKey)}>
              {column.label}
              {direction === 'ascending' ? ' ↑' : direction === 'descending' ? ' ↓' : ''}
              {serverSortIndex >= 0 && serverSorting && serverSorting.fields.length > 1 ? <small>{serverSortIndex + 1}</small> : null}
            </button>
          : renderHeader?.(column) ?? column.label}
      </th>;
    })}</tr></thead><tbody>
      {visibleRows.length === 0 && bodyState !== undefined
        ? <tr className="configured-table-state-row"><td colSpan={definition.columns.length}>{bodyState}</td></tr>
        : null}
      {visibleRows.map(row => <tr key={rowKey(row)} onClick={() => onRowClick?.(row)}>
        {definition.columns.map(column => <td key={column.key}>{renderCell(row, column)}</td>)}
      </tr>)}
    </tbody></table></div>
    {definition.pagination.enabled && <div className="table-pagination">
      {serverPagination
        ? <>
          <span>Showing <b>{serverPagination.Total_Records ? (serverPagination.Page_Number - 1) * serverPagination.Page_Size + 1 : 0}–{Math.min(serverPagination.Page_Number * serverPagination.Page_Size, serverPagination.Total_Records)}</b> of <b>{serverPagination.Total_Records}</b> {itemLabel}</span>
          <label className="server-page-size">Rows per page
            <select
              aria-label={`${itemLabel} per page`}
              value={serverPagination.Page_Size}
              disabled={serverPagination.isLoading}
              onChange={event => serverPagination.onPageSizeChange(Number(event.target.value))}
            >
              {[...new Set([10, 20, 50, 100, 200, serverPagination.Page_Size])]
                .sort((left, right) => left - right)
                .map(size => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
        </>
        : <span>Showing <b>{sortedRows.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, sortedRows.length)}</b> of <b>{sortedRows.length}</b> {itemLabel}</span>}
      <div>
        <button
          disabled={serverPagination
            ? serverPagination.isLoading || !serverPagination.Has_Previous_Page
            : currentPage === 1}
          onClick={() => serverPagination
            ? serverPagination.onPageChange(serverPagination.Page_Number - 1)
            : setPageNo(currentPage - 1)}
          aria-label={`Previous ${itemLabel} page`}
        >‹</button>
        <button className="current-page" aria-current="page">
          {serverPagination ? `${serverPagination.Page_Number} / ${serverPagination.Total_Pages}` : currentPage}
        </button>
        <button
          disabled={serverPagination
            ? serverPagination.isLoading || !serverPagination.Has_Next_Page
            : currentPage === pages}
          onClick={() => serverPagination
            ? serverPagination.onPageChange(serverPagination.Page_Number + 1)
            : setPageNo(currentPage + 1)}
          aria-label={`Next ${itemLabel} page`}
        >›</button>
      </div>
    </div>}
  </>;
}
