import React from 'react';
import InputField from '../../common/InputField';
import WysiwygEditor from '../../common/WysiwygEditor';
import MultipleChoiceEditor from '../../common/MultipleChoiceEditor';

// Este componente ahora es solo de presentación, no tiene lógica propia.
const QuestionArea = ({ questionData, onDataChange, onOptionChange, onSetCorrect, onAddOption, onRemoveOption }) => {
  return (
    // Contenedor del área de la pregunta, con flex-grow para que ocupe el espacio disponible
    <div className="flex-grow bg-white p-8 rounded-t-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Pregunta</h2>

      <InputField
        label="Enunciado:"
        name="title" // Usamos 'title' para que coincida con el estado del padre
        placeholder="Escribe aquí el enunciado de la pregunta..."
        value={questionData.title}
        onChange={onDataChange} // Un único handler para los campos simples
      />

      <MultipleChoiceEditor
        options={questionData.options}
        onOptionChange={onOptionChange}
        onSetCorrect={onSetCorrect}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
      />

      <WysiwygEditor
        label="Explicación / Retroalimentación (Opcional):"
        name="description" // Usamos 'description'
        value={questionData.description}
        onChange={onDataChange}
      />
    </div>
  );
};

export default QuestionArea;