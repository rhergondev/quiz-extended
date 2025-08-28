import React from 'react';
import Button from './Button';
import Dropdown from './Dropdown';

/**
 * Una barra de acciones genérica para gestionar recursos (Cursos, Quizzes, etc.).
 *
 * @param {object} props
 * @param {string} props.title - El título de la página (ej. "Courses").
 * @param {string} props.buttonText - El texto para el botón de acción principal (ej. "New Course").
 * @param {function(): void} props.onButtonClick - Callback para el clic del botón principal.
 * @param {Array<object>} [props.batchActions=[]] - Opciones para el dropdown de acciones en lote.
 * @param {function(string): void} [props.onBatchAction=() => {}] - Callback para la selección de una acción en lote.
 */
const ResourceActionBar = ({
  title,
  buttonText,
  onButtonClick,
  batchActions = [],
  onBatchAction = () => {},
}) => {
  return (
    <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {batchActions.length > 0 && (
          <Dropdown
            buttonText="Batch Actions"
            options={batchActions}
            onSelect={onBatchAction}
          />
        )}
      </div>
      <div>
        <Button onClick={onButtonClick} variant="primary">
          {buttonText}
        </Button>
      </div>
    </div>
  );
};

export default ResourceActionBar;