import { useState, useMemo, useCallback } from 'react';

export interface EditableColumn {
  key: string;
  label: string;
  editable: boolean;
  type: 'number' | 'text' | 'date';
  width?: string;
}

interface EditablePreviewTableProps {
  rows: Record<string, unknown>[];
  columns: EditableColumn[];
  rowKeyField: string;
  onModify: (rowKey: string, field: string, value: unknown) => void;
  onDelete: (rowKey: string) => void;
  onUndoDelete: (rowKey: string) => void;
  modifications: Map<string, Record<string, unknown>>;
  deletions: Set<string>;
  pageSize?: number;
}

type SortDir = 'asc' | 'desc';

interface EditingCell {
  rowKey: string;
  field: string;
}

export function EditablePreviewTable({
  rows,
  columns,
  rowKeyField,
  onModify,
  onDelete,
  onUndoDelete,
  modifications,
  deletions,
  pageSize = 25,
}: EditablePreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');

  // Get the display value for a cell (modified value or original)
  const getCellValue = useCallback(
    (row: Record<string, unknown>, field: string): unknown => {
      const rowKey = String(row[rowKeyField] ?? '');
      const mods = modifications.get(rowKey);
      if (mods && field in mods) {
        return mods[field];
      }
      return row[field];
    },
    [rowKeyField, modifications]
  );

  // Filter rows by search term (matches against SKU column or first text column)
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const term = searchTerm.toLowerCase();
    // Find SKU or first text column
    const textColumns = columns.filter((c) => c.type === 'text').map((c) => c.key);
    return rows.filter((row) =>
      textColumns.some((col) => {
        const val = getCellValue(row, col);
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }, [rows, searchTerm, columns, getCellValue]);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;
    const sorted = [...filteredRows].sort((a, b) => {
      const aVal = getCellValue(a, sortColumn);
      const bVal = getCellValue(b, sortColumn);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sorted;
  }, [filteredRows, sortColumn, sortDir, getCellValue]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = sortedRows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Counts for summary
  const modifiedCount = modifications.size;
  const deletedCount = deletions.size;

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(colKey);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const handleCellClick = (rowKey: string, col: EditableColumn) => {
    if (!col.editable) return;
    if (deletions.has(rowKey)) return;
    const row = rows.find((r) => String(r[rowKeyField]) === rowKey);
    if (!row) return;
    const currentVal = getCellValue(row, col.key);
    setEditingCell({ rowKey, field: col.key });
    setEditValue(currentVal != null ? String(currentVal) : '');
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    const col = columns.find((c) => c.key === editingCell.field);
    if (!col) return;

    let parsedValue: unknown = editValue;
    if (col.type === 'number') {
      const num = parseFloat(editValue);
      if (isNaN(num) || num < 0) {
        // Invalid — cancel edit
        setEditingCell(null);
        return;
      }
      parsedValue = Math.round(num * 100) / 100; // 2 decimal places
    }

    onModify(editingCell.rowKey, editingCell.field, parsedValue);
    setEditingCell(null);
  };

  const handleCellCancel = () => {
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellSave();
    } else if (e.key === 'Escape') {
      handleCellCancel();
    }
  };

  const isCellModified = (rowKey: string, field: string): boolean => {
    const mods = modifications.get(rowKey);
    return mods != null && field in mods;
  };

  return (
    <div className="space-y-3">
      {/* Search + Summary Bar */}
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Buscar por SKU..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
        />
        <div className="text-sm text-gray-500">
          {sortedRows.length} filas
          {modifiedCount > 0 && (
            <span className="ml-2 text-amber-600 font-medium">
              | {modifiedCount} modificada{modifiedCount !== 1 ? 's' : ''}
            </span>
          )}
          {deletedCount > 0 && (
            <span className="ml-2 text-red-600 font-medium">
              | {deletedCount} eliminada{deletedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto border border-gray-200 rounded-lg max-h-[50vh]">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left font-medium text-gray-700 cursor-pointer select-none hover:bg-gray-200 ${col.width ?? ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {sortColumn === col.key && (
                      <span className="text-blue-600">
                        {sortDir === 'asc' ? '\u25B2' : '\u25BC'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedRows.map((row) => {
              const rowKey = String(row[rowKeyField] ?? '');
              const isDeleted = deletions.has(rowKey);
              return (
                <tr
                  key={rowKey}
                  className={
                    isDeleted
                      ? 'bg-red-50 opacity-50'
                      : 'hover:bg-gray-50'
                  }
                >
                  {columns.map((col) => {
                    const isEditing =
                      editingCell?.rowKey === rowKey && editingCell?.field === col.key;
                    const cellVal = getCellValue(row, col.key);
                    const modified = isCellModified(rowKey, col.key);

                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-1.5 ${col.width ?? ''} ${
                          isDeleted ? 'line-through' : ''
                        } ${
                          modified && !isDeleted
                            ? 'bg-amber-50 ring-1 ring-inset ring-amber-400'
                            : ''
                        } ${
                          col.editable && !isDeleted ? 'cursor-pointer' : ''
                        } ${col.type === 'number' ? 'text-right' : 'text-left'}`}
                        onClick={() => handleCellClick(rowKey, col)}
                      >
                        {isEditing ? (
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellSave}
                            onKeyDown={handleKeyDown}
                            className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            min={col.type === 'number' ? 0 : undefined}
                            step={col.type === 'number' ? '0.01' : undefined}
                          />
                        ) : (
                          <span>
                            {col.type === 'number' && cellVal != null
                              ? Number(cellVal).toLocaleString('es-CO', {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 2,
                                })
                              : cellVal != null
                                ? String(cellVal)
                                : ''}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1.5 text-center">
                    {isDeleted ? (
                      <button
                        onClick={() => onUndoDelete(rowKey)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                        title="Deshacer"
                      >
                        Deshacer
                      </button>
                    ) : (
                      <button
                        onClick={() => onDelete(rowKey)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Eliminar fila"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {paginatedRows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-8 text-center text-gray-400"
                >
                  No se encontraron filas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Mostrando {(safeCurrentPage - 1) * pageSize + 1}-
            {Math.min(safeCurrentPage * pageSize, sortedRows.length)} de{' '}
            {sortedRows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safeCurrentPage === 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              &laquo;
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              &lsaquo;
            </button>
            <span className="px-3 py-1 text-gray-700 font-medium">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              &rsaquo;
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="px-2 py-1 rounded border border-gray-300 disabled:opacity-40 hover:bg-gray-100 disabled:hover:bg-transparent"
            >
              &raquo;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
