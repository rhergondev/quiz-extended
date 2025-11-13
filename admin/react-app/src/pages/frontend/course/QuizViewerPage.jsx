import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import Quiz from '../../../components/frontend/Quiz';
import useStudentProgress from '../../../hooks/useStudentProgress';

const QuizViewerPage = ({ quiz, courseId, onClose }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawingEnabled, setIsDrawingEnabled] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(false);
  const [drawingTool, setDrawingTool] = useState('pen');
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingLineWidth, setDrawingLineWidth] = useState(2);

  const {
    isCompleted,
    markComplete,
    loading: progressLoading
  } = useStudentProgress(courseId, false);

  const isQuizCompleted = isCompleted('quiz', quiz?.id);

  const handleQuizComplete = async () => {
    // Marcar el quiz como completado
    if (quiz?.id && !isQuizCompleted) {
      try {
        await markComplete('quiz', quiz.id);
        
        // Disparar evento personalizado para actualizar el progreso en el sidebar
        window.dispatchEvent(new CustomEvent('quiz-completed', {
          detail: { quizId: quiz.id, courseId }
        }));
      } catch (error) {
        console.error('Error marking quiz as complete:', error);
      }
    }
  };

  const handleClearCanvas = () => {
    // Canvas clearing logic handled by DrawingCanvas component
  };

  if (!quiz) {
    return null;
  }

  const quizTitle = quiz?.title?.rendered || quiz?.title || 'Cuestionario';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: `${getColor('primary', '#1a202c')}95` }}
    >
      <div 
        className="w-full h-full flex flex-col overflow-hidden"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        {/* Header */}
        <div 
          className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b"
          style={{ 
            borderColor: `${getColor('primary', '#1a202c')}15`,
            backgroundColor: getColor('background', '#ffffff')
          }}
        >
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h2 
              className="text-xl font-bold truncate"
              style={{ color: getColor('primary', '#1a202c') }}
            >
              {quizTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors duration-200"
              style={{
                backgroundColor: `${getColor('primary', '#1a202c')}10`,
                color: getColor('primary', '#1a202c')
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}10`;
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Quiz
            quizId={quiz.id}
            onQuizComplete={handleQuizComplete}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            isDrawingEnabled={isDrawingEnabled}
            setIsDrawingEnabled={setIsDrawingEnabled}
            showDrawingToolbar={showDrawingToolbar}
            setShowDrawingToolbar={setShowDrawingToolbar}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingLineWidth={drawingLineWidth}
            onClearCanvas={handleClearCanvas}
          />
        </div>
      </div>
    </div>
  );
};

export default QuizViewerPage;
