import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Clock, X, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import quizAutosaveService from '../../api/services/quizAutosaveService';

// Helper function to decode HTML entities
const decodeHtmlEntities = (text) => {
  if (!text) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

/**
 * Banner component that shows when user has an unfinished quiz
 * Displays in the course dashboard to remind users to continue
 */
const PendingQuizBanner = ({ courseId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getColor, isDarkMode } = useTheme();
  
  const [autosaveData, setAutosaveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  // Colores adaptativos
  const colors = {
    text: isDarkMode ? '#ffffff' : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? 'rgba(255,255,255,0.7)' : getColor('textMuted', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#1a202c'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : '#ffffff',
    border: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
  };

  useEffect(() => {
    const checkPendingQuiz = async () => {
      try {
        const data = await quizAutosaveService.getLatestAutosave();
        console.log('🔍 PendingQuizBanner - Autosave data:', data, 'courseId:', courseId);
        
        // Show if there's autosave data
        if (data) {
          // Try to find course ID from multiple possible locations
          const quizCourseId = data.course_id || 
                              data.quiz_data?.course_id || 
                              data.quiz_data?.meta?._quiz_course_id ||
                              data.quiz_data?.meta?.course_id;
          
          console.log('🔍 Quiz course ID found:', quizCourseId, 'Current course:', courseId);
          
          // If courseId is provided, filter by course
          if (courseId && quizCourseId) {
            if (String(quizCourseId) === String(courseId)) {
              setAutosaveData(data);
            }
          } else {
            // No courseId filter or no quiz course ID, show the pending quiz
            setAutosaveData(data);
          }
        }
      } catch (error) {
        console.error('Error checking pending quiz:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPendingQuiz();
  }, [courseId]);

  // Calculate progress
  const getProgress = () => {
    if (!autosaveData) return { answered: 0, total: 0, percent: 0 };
    
    const totalQuestions = autosaveData.quiz_data?.meta?._quiz_question_ids?.length || 0;
    const answeredQuestions = Object.keys(autosaveData.answers || {}).length;
    const percent = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
    
    return { answered: answeredQuestions, total: totalQuestions, percent };
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle continue quiz
  const handleContinue = () => {
    const quizId = autosaveData.quiz_id;
    // Use the current courseId prop since we're in that course's dashboard
    const targetCourseId = courseId;
    
    console.log('🚀 PendingQuizBanner - Continuing quiz:', { quizId, targetCourseId });
    
    // Navigate to the quiz page with state to resume
    if (targetCourseId) {
      navigate(`/courses/${targetCourseId}/tests`, { 
        state: { 
          selectedQuizId: quizId, 
          scrollToQuiz: true,
          resumeAutosave: true  // Flag to indicate we want to resume
        } 
      });
    } else {
      // Fallback: try to get course from autosave data
      const fallbackCourseId = autosaveData.course_id || 
                               autosaveData.quiz_data?.course_id || 
                               autosaveData.quiz_data?.meta?._quiz_course_id;
      
      if (fallbackCourseId) {
        navigate(`/courses/${fallbackCourseId}/tests`, { 
          state: { 
            selectedQuizId: quizId, 
            scrollToQuiz: true,
            resumeAutosave: true
          } 
        });
      } else {
        console.error('❌ PendingQuizBanner - No course ID available');
      }
    }
  };

  // Handle dismiss
  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
  };

  // Don't render if loading, no data, or dismissed
  if (loading || !autosaveData || dismissed) {
    return null;
  }

  const progress = getProgress();
  const quizTitle = decodeHtmlEntities(autosaveData.quiz_title) || t('common.untitled');

  // Border color: accent in dark mode, primary in light mode
  const borderColor = isDarkMode ? colors.accent : colors.primary;

  return (
    <div 
      className="rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg"
      style={{ 
        backgroundColor: colors.cardBg,
        border: `1px solid ${isDarkMode ? colors.border : borderColor}`
      }}
      onClick={handleContinue}
    >
      {/* Header accent bar - removed, using left border instead */}
      
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icon - smaller */}
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${borderColor}15` }}
          >
            <PlayCircle className="w-4 h-4" style={{ color: borderColor }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold truncate" style={{ color: colors.text }}>
                    {t('quizzes.quiz.inProgress')}
                  </h4>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ 
                    backgroundColor: `${borderColor}15`, 
                    color: borderColor 
                  }}>
                    {progress.answered}/{progress.total}
                  </span>
                </div>
                <p className="text-xs truncate" style={{ color: colors.textMuted }}>
                  {quizTitle}
                </p>
              </div>
              
              {/* Time remaining if exists */}
              {autosaveData.time_remaining && (
                <span className="text-xs flex items-center gap-1 flex-shrink-0" style={{ color: borderColor }}>
                  <Clock size={12} />
                  {formatTimeRemaining(autosaveData.time_remaining)}
                </span>
              )}

              {/* Continue button */}
              <div 
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-all flex-shrink-0"
                style={{ backgroundColor: borderColor }}
              >
                {t('common.continue')}
                <ChevronRight size={14} />
              </div>
              
              {/* Dismiss button */}
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg transition-all flex-shrink-0 opacity-50 hover:opacity-100"
                style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
              >
                <X size={12} style={{ color: colors.text }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingQuizBanner;
