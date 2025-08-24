import React, { useState } from 'react';
import QuestionArea from './QuestionArea';
import ConfigSidebar, { generateEmptyConfig } from './ConfigSidebar'; 
import QuestionEditorCabinet from './QuestionEditorCabinet';
import QuestionEditorHeader from './QuestionEditorHeader';

const QuestionEditor = ({ 
  questionId = null, 
  onBack,
  context = 'standalone',
  currentPosition = null,
  totalQuestions = null
}) => {
  const [editorState, setEditorState] = useState({
    title: '',
    description: '',
    options: [
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
    ],
    config: generateEmptyConfig(), // 🎉 Configuración dinámica!
  });

  const [nextId, setNextId] = useState(3);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalState, setOriginalState] = useState(editorState);
  const [isSaving, setIsSaving] = useState(false);

  // Handler para campos simples (título, descripción, opciones reordenadas, y sidebar)
  const handleSimpleChange = (e) => {
    const { name, value } = e.target;
    
    setEditorState(prev => {
      let newState;
      
      // Manejar el caso especial de 'options' para el reordenamiento
      if (name === 'options') {
        newState = { ...prev, options: value };
      } else if (name.startsWith('config.')) {
        newState = { ...prev, config: { ...prev.config, [name.split('.')[1]]: value } };
      } else {
        newState = { ...prev, [name]: value };
      }
      
      // Detectar cambios
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
  };

  // Handlers para las opciones
  const handleOptionTextChange = (id, newText) => {
    setEditorState(prev => {
      const newState = {
        ...prev,
        options: prev.options.map(opt => (opt.id === id ? { ...opt, text: newText } : opt))
      };
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
  };

  const handleSetCorrectOption = (id) => {
    setEditorState(prev => {
      const newState = {
        ...prev,
        options: prev.options.map(opt => (opt.id === id ? { ...opt, isCorrect: true } : { ...opt, isCorrect: false }))
      };
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
  };

  const handleAddOption = () => {
  if (editorState.options.length >= 6) return;
  
  setEditorState(prev => {
    // Calcular el siguiente ID basado en la longitud actual
    const newId = prev.options.length + 1;
    
    const newState = {
      ...prev,
      options: [...prev.options, { id: newId, text: '', isCorrect: false }]
    };
    setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
    return newState;
  });
};

// Actualizar handleRemoveOption para reordenar IDs:
const handleRemoveOption = (id) => {
  if (editorState.options.length <= 2) return;
  
  setEditorState(prev => {
    // Filtrar y reordenar IDs secuencialmente
    const filteredOptions = prev.options
      .filter(opt => opt.id !== id)
      .map((opt, index) => ({
        ...opt,
        id: index + 1 // IDs secuenciales tras eliminar
      }));
    
    const newState = {
      ...prev,
      options: filteredOptions
    };
    setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
    return newState;
  });
};

  // Función de validación
  const validateQuestion = (data) => {
    const errors = [];
    
    // Validar título
    if (!data.title?.trim()) {
      errors.push('El enunciado de la pregunta es obligatorio');
    }
    
    if (data.title?.trim().length > 200) {
      errors.push('El enunciado no puede exceder 200 caracteres');
    }
    
    // Validar opciones
    const validOptions = data.options.filter(opt => opt.text?.trim());
    if (validOptions.length < 2) {
      errors.push('Debe haber al menos 2 opciones con texto');
    }
    
    // Validar respuesta correcta
    const hasCorrectAnswer = data.options.some(opt => opt.isCorrect && opt.text?.trim());
    if (!hasCorrectAnswer) {
      errors.push('Debe marcar al menos una opción como correcta');
    }
    
    // Validar descripción si existe
    if (data.description) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = data.description;
      const textLength = tempDiv.textContent.trim().length;
      if (textLength > 1000) {
        errors.push('La explicación no puede exceder 1000 caracteres');
      }
    }

  if (!data.config.dificultad || data.config.dificultad.trim() === '') {
    errors.push('Debe seleccionar una dificultad');
  }
  
  if (!data.config.categoria || data.config.categoria.trim() === '') {
    errors.push('Debe seleccionar una categoría');
  }
  
  if (!data.config.tema || data.config.tema.trim() === '') {
    errors.push('Debe seleccionar un tema');
  }
  
  if (!data.config.estado || data.config.estado.trim() === '') {
    errors.push('Debe seleccionar un estado');
  }
  
  return errors;
};

  // Función para preparar datos para guardado
const prepareDataForSave = (data) => {
  // Limpiar opciones vacías y reordenar IDs secuencialmente
  const cleanedOptions = data.options
    .filter(opt => opt.text?.trim())
    .map((opt, index) => ({
      id: index + 1, // IDs secuenciales finales
      text: opt.text.trim(),
      isCorrect: opt.isCorrect,
      order: index + 1 // Campo de orden explícito para BD
    }));

  return {
    id: questionId || null, // null para nueva pregunta
    title: data.title.trim(),
    description: data.description?.trim() || '',
    options: cleanedOptions,
    config: data.config, // Toda la configuración (ya validada)
    metadata: {
      createdAt: questionId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }
  };
};

  // Simular guardado (futuro: llamada a API)
  const simulateSave = async (questionData) => {
    console.log('=== GUARDANDO PREGUNTA ===');
    console.log('Datos enviados a la API:');
    console.log(JSON.stringify(questionData, null, 2));
    
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Pregunta guardada exitosamente');
    console.log('ID asignado:', questionData.id || 'NUEVO_ID_GENERADO_' + Date.now());
    
    return {
      success: true,
      id: questionData.id || 'NUEVO_ID_GENERADO_' + Date.now(),
      message: 'Pregunta guardada exitosamente'
    };
  };

  // Handlers para el cabinet
  const handleSave = async () => {
    console.log('🔄 Iniciando proceso de guardado...');
    
    // Validar datos
    const validationErrors = validateQuestion(editorState);
    if (validationErrors.length > 0) {
      console.error('❌ Errores de validación:');
      validationErrors.forEach(error => console.error('  -', error));
      alert('Errores de validación:\n' + validationErrors.join('\n'));
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Preparar datos
      const questionData = prepareDataForSave(editorState);
      
      // Simular guardado
      const result = await simulateSave(questionData);
      
      if (result.success) {
        // Actualizar estado
        setOriginalState(editorState);
        setHasUnsavedChanges(false);
        
        console.log('🎉 Guardado completado. Volviendo a la lista...');
        
        // Volver a la lista después de un momento
        setTimeout(() => {
          if (onBack) onBack();
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('Error al guardar la pregunta. Ver consola para detalles.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSaveAndNew = async () => {
    console.log('🔄 Iniciando proceso de guardar y crear nueva...');
    
    // Validar datos
    const validationErrors = validateQuestion(editorState);
    if (validationErrors.length > 0) {
      console.error('❌ Errores de validación:');
      validationErrors.forEach(error => console.error('  -', error));
      alert('Errores de validación:\n' + validationErrors.join('\n'));
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Preparar datos
      const questionData = prepareDataForSave(editorState);
      
      // Simular guardado
      const result = await simulateSave(questionData);
      
      if (result.success) {
        console.log('🎉 Guardado completado. Preparando nueva pregunta...');
        
        // Resetear para nueva pregunta MANTENIENDO la configuración actual
        const newState = {
          title: '',
          description: '',
          options: [
            { id: 1, text: '', isCorrect: false },
            { id: 2, text: '', isCorrect: false },
          ],
          config: { ...editorState.config }, // 🎉 MANTENER configuración actual!
        };
        
        setEditorState(newState);
        setOriginalState(newState);
        setHasUnsavedChanges(false);
        setNextId(3);
        
        console.log('✨ Listo para crear nueva pregunta con configuración:', newState.config);
      }
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('Error al guardar la pregunta. Ver consola para detalles.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-3/4 h-auto">
      <div className="flex">
        <QuestionArea 
          className="p-6"
          questionData={editorState}
          onDataChange={handleSimpleChange}
          onOptionChange={handleOptionTextChange}
          onSetCorrect={handleSetCorrectOption}
          onAddOption={handleAddOption}
          onRemoveOption={handleRemoveOption}
        />
        <div className="bg-white p-0 shadow-md rounded-t-lg">
          <ConfigSidebar
            configuracion={editorState.config}
            onChange={handleSimpleChange}
          />
        </div>
      </div>
      <QuestionEditorCabinet 
        onSave={handleSave} 
        onSaveAndNew={handleSaveAndNew}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </div>
  );
};

export default QuestionEditor;