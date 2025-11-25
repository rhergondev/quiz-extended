import React, { useState } from 'react';
import { X, Check, Highlighter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../contexts/ThemeContext';
import Quiz from '../../../components/frontend/Quiz';
import DrawingToolbar from '../../../components/frontend/DrawingToolbar';
import useStudentProgress from '../../../hooks/useStudentProgress';

const QuizViewerPage = ({ quiz, courseId, onClose }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const [quizState, setQuizState] = useState('loading'); // 🎯 FOCUS MODE: Track quiz state
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

  // 🎯 FOCUS MODE: Determine if we should show UI elements
  const isFocusMode = quizState === 'in-progress';

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

  const [clearCanvasCallback, setClearCanvasCallback] = useState(null);

  const handleClearCanvas = (callback) => {
    setClearCanvasCallback(() => callback);
  };

  const handleClearCanvasClick = () => {
    if (clearCanvasCallback) {
      clearCanvasCallback();
    }
  };

  const toggleDrawingToolbar = () => {
    const newState = !showDrawingToolbar;
    setShowDrawingToolbar(newState);
    setIsDrawingEnabled(newState);
    if (!newState) {
      // When closing toolbar, keep drawings but disable drawing mode
      setIsDrawingEnabled(false);
    }
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
        {/* Header - Hidden in Focus Mode */}
        {!isFocusMode && (
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
              {/* Drawing Toolbar Toggle */}
              <button
                onClick={toggleDrawingToolbar}
                className="p-2 rounded-lg transition-colors duration-200"
                style={{
                  backgroundColor: showDrawingToolbar ? getColor('primary', '#3b82f6') : `${getColor('primary', '#1a202c')}10`,
                  color: showDrawingToolbar ? '#ffffff' : getColor('primary', '#1a202c')
                }}
                title="Activar/Desactivar Subrayador"
              >
                <Highlighter size={20} />
              </button>

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
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <Quiz
            quizId={quiz.id}
            onQuizComplete={handleQuizComplete}
            onQuizStateChange={setQuizState}
            isDrawingMode={isDrawingMode}
            setIsDrawingMode={setIsDrawingMode}
            isDrawingEnabled={isDrawingEnabled}
            setIsDrawingEnabled={setIsDrawingEnabled}
            showDrawingToolbar={showDrawingToolbar}
            setShowDrawingToolbar={setShowDrawingToolbar}
            drawingTool={drawingTool}
            drawingColor={drawingColor}
            drawingLineWidth={drawingLineWidth}
            onDrawingToolChange={setDrawingTool}
            onDrawingColorChange={setDrawingColor}
            onDrawingLineWidthChange={setDrawingLineWidth}
            onClearCanvas={handleClearCanvas}
          />
        </div>

        {/* Drawing Toolbar */}
        <DrawingToolbar
          isActive={showDrawingToolbar}
          tool={drawingTool}
          onToolChange={setDrawingTool}
          color={drawingColor}
          onColorChange={setDrawingColor}
          lineWidth={drawingLineWidth}
          onLineWidthChange={setDrawingLineWidth}
          onClear={handleClearCanvasClick}
          onClose={toggleDrawingToolbar}
        />
      </div>
    </div>
  );
};

export default QuizViewerPage;
