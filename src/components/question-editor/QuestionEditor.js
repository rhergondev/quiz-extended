import React, { useState } from 'react';
import QuestionArea from './QuestionArea';
import ConfigSidebar from './ConfigSidebar'; 
import QuestionEditorCabinet from './QuestionEditorCabinet';

const QuestionEditor = () => {
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

  // --- MANEJADORES DE LÓGICA ---

  // Handler para campos simples (título, descripción, y toda la sidebar)
  const handleSimpleChange = (e) => {
    const { name, value } = e.target;
    // Comprobamos si el campo pertenece a la config o a la pregunta
    if (name in editorState.config) {
      setEditorState(prev => ({
        ...prev,
        config: { ...prev.config, [name]: value },
      }));
    } else {
      setEditorState(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handlers para las opciones (estos no cambian)
  const handleOptionTextChange = (id, newText) => {
    setEditorState(prev => ({
        ...prev,
        options: prev.options.map(opt => (opt.id === id ? { ...opt, text: newText } : opt))
    }));
  };

  const handleSetCorrectOption = (id) => {
    setEditorState(prev => ({
        ...prev,
        options: prev.options.map(opt => (opt.id === id ? { ...opt, isCorrect: true } : { ...opt, isCorrect: false }))
    }));
  };

  const handleAddOption = () => {
    setEditorState(prev => ({
        ...prev,
        options: [...prev.options, { id: nextId, text: '', isCorrect: false }]
    }));
    setNextId(nextId + 1);
  };
  
  const handleRemoveOption = (id) => {
    if (editorState.options.length <= 2) return;
    setEditorState(prev => ({
        ...prev,
        options: prev.options.filter(opt => opt.id !== id)
    }));
  };

  // Handlers para el cabinet
  const handleSave = () => console.log("Guardando estado:", editorState);
  const handleSaveAndNew = () => console.log("Guardando y creando nuevo. Estado actual:", editorState);

  return (
    <div className="w-full">
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