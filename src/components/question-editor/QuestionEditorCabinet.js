import React from 'react';
import Button from '../common/Button';

// Este componente es "tonto", solo muestra los botones.
// En el futuro, recibirá las funciones a ejecutar (onSave, onSaveAndNew) como props.
const QuestionEditorCabinet = ({ onSave, onSaveAndNew }) => {
  return (
    <div className="bg-gray-100 p-4 rounded-b-lg border-t border-gray-200 flex justify-end space-x-3">
      <Button type="button" onClick={onSave}>
        Guardar y Salir
      </Button>
      <Button type="button" onClick={onSaveAndNew}>
        Guardar y Crear Nueva
      </Button>
    </div>
  );
};

export default QuestionEditorCabinet;