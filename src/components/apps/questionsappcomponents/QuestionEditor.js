import React, { useState } from 'react';
import QuestionArea from './QuestionArea';
import ConfigSidebar from './ConfigSidebar'; 
import QuestionEditorCabinet from './QuestionEditorCabinet';
import QuestionEditorHeader from './QuestionEditorHeader';

const QuestionEditor = ({ 
  questionId = null, 
  onBack,
  context = 'standalone', // 'standalone', 'quiz-sequence', 'bulk-edit'
  currentPosition = null,
  totalQuestions = null
}) => {
  // --- ESTADO ÚNICO Y CENTRALIZADO ---
  // Contiene los datos de la pregunta y la configuración de la sidebar
  const [editorState, setEditorState] = useState({
    title: '',
    description: '',
    options: [
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
    ],
    config: {
      tipoPregunta: 'opcion_multiple',
      dificultad: 'media',
      categoria: 'ciencia',
      tiempoLimite: '30',
      estado: 'borrador',
    },
  });

  const [nextId, setNextId] = useState(3);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalState, setOriginalState] = useState(editorState);

  // --- MANEJADORES DE LÓGICA ---

  // Handler para campos simples (título, descripción, y toda la sidebar)
  const handleSimpleChange = (e) => {
    const { name, value } = e.target;
    
    setEditorState(prev => {
      const newState = name.startsWith('config.') 
        ? { ...prev, config: { ...prev.config, [name.split('.')[1]]: value } }
        : { ...prev, [name]: value };
      
      // Detectar cambios
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
  };  // Handlers para las opciones (ahora detectan cambios)
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
    setEditorState(prev => {
      const newState = {
        ...prev,
        options: [...prev.options, { id: nextId, text: '', isCorrect: false }]
      };
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
    setNextId(nextId + 1);
  };
  
  const handleRemoveOption = (id) => {
    if (editorState.options.length <= 2) return;
    setEditorState(prev => {
      const newState = {
        ...prev,
        options: prev.options.filter(opt => opt.id !== id)
      };
      setHasUnsavedChanges(JSON.stringify(newState) !== JSON.stringify(originalState));
      return newState;
    });
  };

  // Handlers para el cabinet
  const handleSave = () => {
    console.log("Guardando estado:", editorState);
    // Aquí harías la llamada a la API
    setOriginalState(editorState);
    setHasUnsavedChanges(false);
    if (onBack) onBack(); // Volver a la lista
  };
  
  const handleSaveAndNew = () => {
    console.log("Guardando y creando nuevo. Estado actual:", editorState);
    // Aquí harías la llamada a la API y limpiarías el estado para una nueva pregunta
    const newState = {
      title: '',
      description: '',
      options: [
        { id: 1, text: '', isCorrect: false },
        { id: 2, text: '', isCorrect: false },
      ],
      config: {
        tipoPregunta: 'opcion_multiple',
        dificultad: 'media',
        categoria: 'ciencia',
        tiempoLimite: '30',
        estado: 'borrador',
      },
    };
    setEditorState(newState);
    setOriginalState(newState);
    setHasUnsavedChanges(false);
    setNextId(3);
  };

  return (
    <div className="w-full">
        {/* Header inteligente con contexto */}
        <QuestionEditorHeader
          questionId={questionId}
          onBack={onBack}
          context={context}
          currentPosition={currentPosition}
          totalQuestions={totalQuestions}
          hasUnsavedChanges={hasUnsavedChanges}
        />
        
        {/* Contenedor Flex para el área principal y la sidebar */}
        <div className="flex">
            {/* El área de la pregunta ahora recibe todo por props */}
            <QuestionArea
                questionData={editorState}
                onDataChange={handleSimpleChange}
                onOptionChange={handleOptionTextChange}
                onSetCorrect={handleSetCorrectOption}
                onAddOption={handleAddOption}
                onRemoveOption={handleRemoveOption}
            />
            {/* La sidebar también debe ser controlada */}
            <div className="w-80 bg-white p-6 shadow-md rounded-t-lg">
                <ConfigSidebar
                    configuracion={editorState.config}
                    onChange={handleSimpleChange}
                />
            </div>
        </div>
        {/* El cabinet se renderiza debajo del contenedor flex */}
        <QuestionEditorCabinet onSave={handleSave} onSaveAndNew={handleSaveAndNew} />
    </div>
  );
};

export default QuestionEditor;