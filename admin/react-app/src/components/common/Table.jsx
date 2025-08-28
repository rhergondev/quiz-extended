import React from 'react';
import { flexRender } from '@tanstack/react-table';

/**
 * Un componente de tabla "headless" genérico y reutilizable.
 * Renderiza una tabla basada en la instancia de tabla proporcionada por @tanstack/react-table.
 *
 * @param {object} props
 * @param {import('@tanstack/react-table').Table} props.table - La instancia de la tabla de TanStack.
 * @param {boolean} [props.isLoading=false] - Si es true, muestra un estado de carga.
 */
const Table = ({ table, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-gray-500">Loading data...</p>
      </div>
    );
  }

  // Usamos el modelo de filas de la tabla para comprobar si hay datos
  if (table.getRowModel().rows.length === 0) {
    return (
      <div className="flex justify-center items-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">No data available.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto shadow-md sm:rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
   <thead className="bg-gray-50">
  {table.getHeaderGroups().map((headerGroup) => (
    <tr key={headerGroup.id}>
      {headerGroup.headers.map((header) => (
        <th
          key={header.id}
          scope="col"
          // --- CAMBIO: Añadimos padding a todas las cabeceras ---
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
          // --- CAMBIO ADICIONAL PARA ALINEAR CHECKBOX ---
          style={{ paddingLeft: header.id === 'select' ? '1rem' : undefined, paddingRight: header.id === 'select' ? '1rem' : undefined }}
        >
          {header.isPlaceholder
            ? null
            : flexRender(
                header.column.columnDef.header,
                header.getContext()
              )}
        </th>
      ))}
    </tr>
  ))}
</thead>
<tbody className="bg-white divide-y divide-gray-200">
  {table.getRowModel().rows.map((row) => (
    <tr key={row.id} className="hover:bg-gray-50">
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"

           style={{ paddingLeft: cell.column.id === 'select' ? '1rem' : undefined, paddingRight: cell.column.id === 'select' ? '1rem' : undefined }}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </td>
      ))}
    </tr>
  ))}
</tbody>
      </table>
    </div>
  );
};

export default Table;