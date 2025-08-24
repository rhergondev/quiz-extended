import React from 'react';
import InputField from '../../common/InputField';
import WysiwygEditor from '../../common/WysiwygEditor';
import MultipleChoiceEditor from '../../common/MultipleChoiceEditor';

const QuestionArea = ({ questionData, onDataChange, onOptionChange, onSetCorrect, onAddOption, onRemoveOption }) => {
  
  const handleReorder = (reorderedOptions) => {
    // Actualizar IDs para que reflejen el nuevo orden (1, 2, 3, 4...)
    const optionsWithNewIds = reorderedOptions.map((option, index) => ({
      ...option,
      id: index + 1 // IDs secuenciales basados en posición
    }));

    const syntheticEvent = {
      target: {
        name: 'options',
        value: optionsWithNewIds
      }
    };
    onDataChange(syntheticEvent);
  };

  return (
    <div className="flex-grow bg-white p-8 rounded-t-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6">Pregunta</h2>

      <InputField
        label="Enunciado de la Pregunta"
        name="title"
        placeholder="¿Cuál es la capital de España?"
        value={questionData.title}
        onChange={onDataChange}
        required={true}
        maxLength={200}
        helpText="Escribe una pregunta clara y específica (máximo 200 caracteres)"
        error={!questionData.title?.trim() ? "El enunciado es obligatorio" : null}
      />

      <MultipleChoiceEditor
        options={questionData.options}
        onOptionChange={onOptionChange}
        onSetCorrect={onSetCorrect}
        onAddOption={onAddOption}
        onRemoveOption={onRemoveOption}
        onReorder={handleReorder}
      />

      <WysiwygEditor
        label="Explicación / Retroalimentación (Opcional)"
        name="description"
        value={questionData.description}
        onChange={onDataChange}
        placeholder="Explica por qué esta es la respuesta correcta, proporciona contexto adicional o enlaces útiles..."
        maxLength={1000}
        helpText="Esta explicación se mostrará después de que el usuario responda la pregunta"
      />
    </div>
  );
};

export default QuestionArea;