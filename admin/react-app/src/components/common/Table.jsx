import React from 'react';

/**
 * Un componente de tabla genérico y reutilizable.
 *
 * @param {object} props
 * @param {Array<object>} props.columns - Un array de objetos que definen las columnas.
 * Ejemplo: [{ key: 'title', header: 'Title' }, { key: 'status', header: 'Status' }]
 * @param {Array<object>} props.data - Un array de objetos con los datos a mostrar.
 * @param {boolean} [props.isLoading=false] - Si es true, muestra un estado de carga.
 */
const Table = ({ columns, data, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <p className="text-gray-500">Loading...</p>
        {/* Aquí podrías poner un componente Spinner más elaborado en el futuro */}
      </div>
    );
  }

  if (!data || data.length === 0) {
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
          <tr>
            {/* Checkbox para acciones en lote */}
            <th scope="col" className="p-4">
              <div className="flex items-center">
                <input
                  id="checkbox-all"
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 bg-gray-100 rounded border-gray-300 focus:ring-indigo-500"
                />
                <label htmlFor="checkbox-all" className="sr-only">
                  checkbox
                </label>
              </div>
            </th>
            {/* Columnas dinámicas */}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {/* Checkbox de la fila */}
              <td className="p-4 w-4">
                <div className="flex items-center">
                  <input
                    id={`checkbox-table-${rowIndex}`}
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 bg-gray-100 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <label
                    htmlFor={`checkbox-table-${rowIndex}`}
                    className="sr-only"
                  >
                    checkbox
                  </label>
                </div>
              </td>
              {/* Celdas dinámicas */}
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-700"
                >
                  {/* Si la columna tiene una función de renderizado, la usamos */}
                  {column.render
                    ? column.render(row)
                    : row[column.key]}
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