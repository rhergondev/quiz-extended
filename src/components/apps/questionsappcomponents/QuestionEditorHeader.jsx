import React from 'react';

const QuestionEditorHeader = ({ 
  questionId, 
  onBack, 
  currentPosition = null, 
  totalQuestions = null,
  context = 'standalone', // 'standalone', 'quiz-sequence', 'bulk-edit'
  hasUnsavedChanges = false 
}) => {
  
  const getContextInfo = () => {
    switch (context) {
      case 'quiz-sequence':
        return {
          title: questionId ? 'Editando Pregunta' : 'Nueva Pregunta',
          subtitle: totalQuestions ? `Pregunta ${currentPosition} de ${totalQuestions}` : 'Secuencia de Quiz',
          icon: '📋'
        };
      case 'bulk-edit':
        return {
          title: 'Edición Masiva',
          subtitle: `Pregunta ${currentPosition} de ${totalQuestions}`,
          icon: '⚡'
        };
      default:
        return {
          title: questionId ? 'Editar Pregunta' : 'Nueva Pregunta',
          subtitle: questionId ? `ID: ${questionId}` : 'Creando nueva pregunta',
          icon: '📝'
        };
    }
  };

  const contextInfo = getContextInfo();

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="px-6 py-4">
        {/* Navegación de vuelta */}
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-3 font-medium transition-colors group"
          >
            <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span>
            <span>
              {context === 'quiz-sequence' ? 'Volver al Quiz' : 
               context === 'bulk-edit' ? 'Volver a Edición Masiva' : 
               'Volver a Questions'}
            </span>
          </button>
        )}

        {/* Header principal */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{contextInfo.icon}</span>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-800">
                  {contextInfo.title}
                </h1>
                {hasUnsavedChanges && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <span className="w-2 h-2 bg-orange-400 rounded-full mr-1.5"></span>
                    Cambios sin guardar
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {contextInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Navegación secuencial si aplica */}
          {(context === 'quiz-sequence' || context === 'bulk-edit') && totalQuestions > 1 && (
            <div className="flex items-center space-x-3">
              <button 
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled={currentPosition <= 1}
              >
                ← Anterior
              </button>
              
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(totalQuestions, 5) }, (_, i) => {
                  const position = i + 1;
                  const isActive = position === currentPosition;
                  const isCompleted = position < currentPosition;
                  
                  return (
                    <div
                      key={position}
                      className={`w-3 h-3 rounded-full ${
                        isActive ? 'bg-blue-600' :
                        isCompleted ? 'bg-green-500' :
                        'bg-gray-300'
                      }`}
                    />
                  );
                })}
                {totalQuestions > 5 && (
                  <span className="text-sm text-gray-500 ml-2">
                    +{totalQuestions - 5} más
                  </span>
                )}
              </div>

              <button 
                className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                disabled={currentPosition >= totalQuestions}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionEditorHeader;
