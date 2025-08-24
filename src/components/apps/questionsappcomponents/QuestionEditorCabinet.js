import React from 'react';
import Button from '../../common/Button';

const QuestionEditorCabinet = ({ 
  onSave, 
  onSaveAndNew, 
  isSaving = false, 
  hasUnsavedChanges = false 
}) => {
  return (
    <div className="bg-gray-100 p-4 rounded-b-lg border-t border-gray-200 flex justify-between items-center">
      
      {/* Indicador de cambios no guardados */}
      <div className="flex items-center">
        {hasUnsavedChanges && (
          <span className="text-sm text-amber-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Cambios sin guardar
          </span>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex space-x-3">
        <Button 
          type="button" 
          onClick={onSave}
          disabled={isSaving}
          variant="secondary"
        >
          {isSaving ? 'Guardando...' : 'Guardar y Salir'}
        </Button>
        
        <Button 
          type="button" 
          onClick={onSaveAndNew}
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : 'Guardar y Crear Nueva'}
        </Button>
      </div>
    </div>
  );
};

export default QuestionEditorCabinet;