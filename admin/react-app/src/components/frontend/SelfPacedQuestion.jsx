import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Check, X, Star, BookOpen,
  AlertCircle, Lightbulb, SkipForward
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { toggleFavoriteQuestion } from '../../api/services/favoriteService';

const SelfPacedQuestion = ({ 
  questions = [], 
  currentIndex = 0, 
  onNavigate,
  onClose,
  onAnswered
}) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();

  const colors = {
    text:       isDarkMode ? getColor('textPrimary', '#f9fafb')       : getColor('textPrimary', '#1f2937'),
    textMuted:  isDarkMode ? getColor('textSecondary', '#9ca3af')     : getColor('textSecondary', '#6b7280'),
    bg:         isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff'),
    border:     isDarkMode ? '#ffffff'                                 : getColor('borderColor', '#e5e7eb'),
    primary:    getColor('primary', '#3b82f6'),
  };
  
  const question = questions[currentIndex];
  
  // Local state
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isFavorite, setIsFavorite] = useState(question?.is_favorite || false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsFavorite(question?.is_favorite || false);
  }, [currentIndex, question?.id]);

  if (!question) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <AlertCircle size={48} style={{ color: getColor('error', '#ef4444'), margin: '0 auto 1rem' }} />
          <p className="text-lg font-medium" style={{ color: getColor('textPrimary', '#1f2937') }}>
            {t('tests.noQuestionsAvailable')}
          </p>
        </div>
      </div>
    );
  }

  const questionType = question.meta?._question_type || 'multiple_choice';
  const options = question.meta?._question_options || [];
  
  // Obtener la respuesta correcta del array de opciones
  const correctOption = options.find(opt => opt.isCorrect === true);
  const correctAnswerId = correctOption?.id;
  
  // Get explanation from meta field
  const explanation = question.meta?._explanation || '';
  const difficulty = question.meta?._difficulty_level || 'medium';

  const isCorrect = showResult && selectedAnswer === correctAnswerId;
  const isWrong = showResult && selectedAnswer !== correctAnswerId && selectedAnswer !== null;

  const handleAnswerSelect = (optionId) => {
    if (!showResult) {
      setSelectedAnswer(optionId);
      // Auto-check answer immediately
      setShowResult(true);
      // Notify parent of answer
      const isCorrect = optionId === correctAnswerId;
      if (onAnswered) {
        onAnswered(question.id, isCorrect);
      }
    }
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer !== null) {
      setShowResult(true);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      onNavigate(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleToggleFavorite = () => {
    if (isTogglingFavorite) return;

    const newValue = !isFavorite;
    setIsFavorite(newValue);
    question.is_favorite = newValue;

    setIsTogglingFavorite(true);
    toggleFavoriteQuestion(question.id)
      .then(result => {
        setIsFavorite(result.is_favorited);
        question.is_favorite = result.is_favorited;
      })
      .catch(error => {
        console.error('Error toggling favorite:', error);
        setIsFavorite(!newValue);
        question.is_favorite = !newValue;
      })
      .finally(() => {
        setIsTogglingFavorite(false);
      });
  };

  const getDifficultyColor = () => {
    switch (difficulty) {
      case 'easy': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return getColor('textSecondary', '#6b7280');
    }
  };

  const getOptionStyle = (option) => {
    const baseStyle = {
      border: `2px solid`,
      transition: 'all 0.2s',
      cursor: showResult ? 'default' : 'pointer'
    };

    if (showResult) {
      // Show correct answer in green
      if (option.id === correctAnswerId) {
        return {
          ...baseStyle,
          borderColor: '#10b981',
          backgroundColor: '#10b98110',
        };
      }
      // Show selected wrong answer in red
      if (option.id === selectedAnswer && selectedAnswer !== correctAnswerId) {
        return {
          ...baseStyle,
          borderColor: '#ef4444',
          backgroundColor: '#ef444410',
        };
      }
      // Grey out other options
      return {
        ...baseStyle,
        borderColor: colors.border,
        backgroundColor: colors.bg,
        opacity: 0.5
      };
    }

    // Before checking answer
    if (selectedAnswer === option.id) {
      return {
        ...baseStyle,
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}10`,
      };
    }

    return {
      ...baseStyle,
      borderColor: colors.border,
      backgroundColor: colors.bg,
    };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Question Header */}
      <div
        className="flex items-center justify-between px-6 py-4 mb-6 rounded-lg border"
        style={{
          backgroundColor: colors.bg,
          borderColor: colors.border
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: colors.text }}>
            {currentIndex + 1} / {questions.length}
          </span>
          <div 
            className="px-2 py-1 rounded text-xs font-medium"
            style={{ 
              backgroundColor: `${getDifficultyColor()}20`,
              color: getDifficultyColor()
            }}
          >
            {t(`common.${difficulty}`)}
          </div>
        </div>

        <button
          onClick={handleToggleFavorite}
          disabled={isTogglingFavorite}
          className="p-2 rounded-lg transition-all"
          style={{ backgroundColor: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          title={isFavorite ? t('common.removeFromFavorites') : t('common.addToFavorites')}
        >
          <Star
            size={20}
            style={{ color: isFavorite ? '#fbbf24' : colors.textMuted }}
            fill={isFavorite ? '#fbbf24' : 'none'}
          />
        </button>
      </div>

      {/* Question Content */}
      <div className="space-y-6">
        {/* Question Text */}
        <div>
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${colors.primary}20` }}
            >
              <BookOpen size={16} style={{ color: isDarkMode ? '#ffffff' : colors.primary }} />
            </div>
            <h3
              className="text-lg font-semibold flex-1"
              style={{ color: colors.text }}
            >
              {question.title?.rendered || question.title}
            </h3>
          </div>
          {question.content?.rendered && (
            <div
              className="prose max-w-none ml-11"
              dangerouslySetInnerHTML={{ __html: question.content.rendered }}
              style={{ color: colors.textMuted }}
            />
          )}
        </div>

        {/* Options */}
        <div className="space-y-3">
          {options.map((option, idx) => (
            <button
              key={option.id}
              onClick={() => handleAnswerSelect(option.id)}
              disabled={showResult}
              className="w-full px-4 py-3 rounded-lg text-left flex items-center gap-3"
              style={getOptionStyle(option)}
            >
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-semibold"
                style={{ 
                  backgroundColor: showResult && option.id === correctAnswerId
                    ? '#10b981'
                    : showResult && option.id === selectedAnswer
                    ? '#ef4444'
                    : selectedAnswer === option.id
                    ? colors.primary
                    : `${colors.textMuted}30`,
                  color: (showResult && (option.id === correctAnswerId || option.id === selectedAnswer)) || selectedAnswer === option.id
                    ? '#ffffff'
                    : colors.text
                }}
              >
                {String.fromCharCode(65 + idx)}
              </div>
              <span
                className="flex-1 text-sm"
                style={{ color: colors.text }}
              >
                {option.text}
              </span>
              {showResult && option.id === correctAnswerId && (
                <Check size={20} style={{ color: '#10b981' }} />
              )}
              {showResult && option.id === selectedAnswer && selectedAnswer !== correctAnswerId && (
                <X size={20} style={{ color: '#ef4444' }} />
              )}
            </button>
          ))}
        </div>

        {/* Result & Explanation */}
        {showResult && (
          <div 
            className="rounded-lg p-4 border-2"
            style={{ 
              borderColor: isCorrect ? '#10b981' : '#ef4444',
              backgroundColor: isCorrect ? '#10b98110' : '#ef444410'
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              {isCorrect ? (
                <Check size={24} style={{ color: '#10b981' }} className="flex-shrink-0" />
              ) : (
                <X size={24} style={{ color: '#ef4444' }} className="flex-shrink-0" />
              )}
              <div>
                <h4 className="font-bold text-base mb-1" style={{ color: isCorrect ? '#10b981' : '#ef4444' }}>
                  {isCorrect ? t('tests.correctAnswer') : t('tests.incorrectAnswer')}
                </h4>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  {isCorrect ? t('tests.wellDone') : t('tests.keepPracticing')}
                </p>
              </div>
            </div>

            {explanation && (
              <div 
                className="mt-3 pt-3 border-t"
                style={{ borderColor: isCorrect ? '#10b98130' : '#ef444430' }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb size={16} style={{ color: getColor('primary', '#3b82f6') }} />
                  <span className="text-xs font-semibold uppercase" style={{ color: colors.textMuted }}>
                    {t('tests.explanation')}
                  </span>
                </div>
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: explanation }}
                  style={{ color: colors.text }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-sm"
          style={{
            backgroundColor: colors.bg,
            color: isDarkMode ? '#ffffff' : colors.primary,
            border: `2px solid ${isDarkMode ? '#ffffff' : colors.primary}`
          }}
        >
          <ChevronLeft size={18} />
          <span>{t('common.previous')}</span>
        </button>

        {!showResult && (
          <button
            onClick={handleSkip}
            className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-medium flex items-center gap-2 transition-all shadow-sm text-sm"
            style={{
              backgroundColor: colors.bg,
              color: isDarkMode ? '#ffffff' : colors.textMuted,
              border: `2px solid ${colors.border}`
            }}
          >
            <SkipForward size={18} />
            <span>{t('common.skip')}</span>
          </button>
        )}

        <button
          onClick={handleNext}
          disabled={currentIndex === questions.length - 1}
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm text-sm"
          style={{
            backgroundColor: getColor('accent', '#f59e0b'),
            color: '#ffffff'
          }}
        >
          <span>{currentIndex === questions.length - 1 ? t('common.finish') : t('common.next')}</span>
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default SelfPacedQuestion;
