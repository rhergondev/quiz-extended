import React from 'react';
import Button from './Button';
import Dropdown from './Dropdown';

/**
 * Una barra de acciones y filtros genérica para gestionar recursos.
 *
 * @param {object} props
 * ... (resto de las props)
 * @param {React.ReactNode} [props.children] - Permite pasar componentes de filtro personalizados.
 */
const ResourceActionBar = ({
  title,
  children, // Usaremos children para inyectar los filtros
  buttonText,
  onButtonClick,
  batchActions = [],
  onBatchAction = () => {},
}) => {
  return (
    <div className="flex flex-col p-4 bg-white border-b border-gray-200 space-y-4">
      {/* Fila superior: Título y botón principal */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <Button onClick={onButtonClick} variant="primary">
          {buttonText}
        </Button>
      </div>
      {/* Fila inferior: Filtros y acciones en lote */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* Aquí se renderizarán los filtros que pasemos desde la página */}
          {children}
        </div>
        {batchActions.length > 0 && (
          <Dropdown
            buttonText="Batch Actions"
            options={batchActions}
            onSelect={onBatchAction}
          />
        )}
      </div>
    </div>
  );
};

export default ResourceActionBar;