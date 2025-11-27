// admin/react-app/src/components/frontend/statistics/WeakLessonsPanel.jsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { AlertTriangle, BookOpen, TrendingDown, AlertCircle } from 'lucide-react';

const WeakLessonsPanel = ({ 
  selectedCourse,
  compact = false,
  isDarkMode = false,
  pageColors = null 
}) => {
  const { getColor } = useTheme();
  const [weakLessons, setWeakLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    accent: getColor('accent', '#f59e0b'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

  useEffect(() => {
    fetchWeakLessons();
  }, [selectedCourse]);

  const fetchWeakLessons = async () => {
    setLoading(true);
    
    setTimeout(() => {
      const fakeData = [
        {
          id: 1,
          lesson_title: 'Derecho Constitucional - Artículos 1-10',
          course_title: 'Curso de Oposiciones',
          total_questions: 45,
          failed_questions: 18,
          accuracy: 60.0,
        },
        {
          id: 2,
          lesson_title: 'Matemáticas Financieras Avanzadas',
          course_title: 'Matemáticas para Oposiciones',
          total_questions: 32,
          failed_questions: 14,
          accuracy: 56.3,
        },
        {
          id: 3,
          lesson_title: 'Legislación Laboral - Contratos',
          course_title: 'Derecho Laboral',
          total_questions: 28,
          failed_questions: 11,
          accuracy: 60.7,
        },
      ];

      const filteredData = selectedCourse 
        ? fakeData.filter(lesson => lesson.course_title === 'Curso seleccionado')
        : fakeData;

      setWeakLessons(filteredData);
      setLoading(false);
    }, 500);
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 70) return '#10b981';
    if (accuracy >= 50) return colors.accent;
    return '#ef4444';
  };

  const getUrgencyLevel = (accuracy) => {
    if (accuracy < 50) return { label: 'Urgente', color: '#ef4444' };
    if (accuracy < 65) return { label: 'Importante', color: colors.accent };
    return { label: 'Revisar', color: colors.primary };
  };

  if (loading) {
    return (
      <div 
        className="p-4 rounded-lg border animate-pulse"
        style={{ 
          backgroundColor: colors.background,
          borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
        }}
      >
        <div className="h-4 rounded mb-3 w-1/2" style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#e5e7eb' }}></div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded" style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#e5e7eb' }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`p-4 rounded-lg border ${compact ? '' : 'shadow-lg'}`}
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <AlertTriangle className="w-4 h-4" style={{ color: colors.accent }} />
        <h2 className="text-sm font-semibold" style={{ color: colors.text }}>Lecciones a Repasar</h2>
      </div>

      {weakLessons.length === 0 ? (
        <div className="text-center py-6">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" style={{ color: colors.textMuted }} />
          <p className="text-sm font-medium" style={{ color: colors.text }}>¡Excelente!</p>
          <p className="text-xs" style={{ color: colors.textMuted }}>
            No tienes lecciones que repasar
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {weakLessons.map((lesson, index) => {
            const urgency = getUrgencyLevel(lesson.accuracy);
            const accuracyColor = getAccuracyColor(lesson.accuracy);
            
            return (
              <div 
                key={lesson.id}
                className="p-2.5 rounded border-l-2 transition-all hover:shadow-sm cursor-pointer"
                style={{ 
                  backgroundColor: isDarkMode ? colors.primary + '08' : '#fafafa',
                  borderLeftColor: urgency.color
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ 
                          backgroundColor: urgency.color + '20',
                          color: urgency.color
                        }}
                      >
                        {index + 1}
                      </span>
                      <h3 className="font-medium text-xs truncate" style={{ color: colors.text }}>
                        {lesson.lesson_title}
                      </h3>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 ml-7">
                      <div className="flex items-center gap-1">
                        <span className="text-xs" style={{ color: colors.textMuted }}>Falladas:</span>
                        <span className="text-xs font-bold" style={{ color: '#ef4444' }}>
                          {lesson.failed_questions}
                        </span>
                      </div>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDarkMode ? colors.primary + '20' : '#e5e7eb' }}>
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${lesson.accuracy}%`,
                            backgroundColor: accuracyColor
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold" style={{ color: accuracyColor }}>
                        {lesson.accuracy}%
                      </span>
                    </div>
                  </div>

                  {/* Urgency badge */}
                  <div 
                    className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{ 
                      backgroundColor: urgency.color + '20',
                      color: urgency.color
                    }}
                  >
                    {urgency.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tip - Compact */}
      {weakLessons.length > 0 && (
        <div className="mt-3 p-2 rounded border-l-2" style={{ 
          backgroundColor: isDarkMode ? colors.primary + '10' : '#f0f9ff',
          borderLeftColor: colors.primary
        }}>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5" style={{ color: colors.primary }} />
            <p className="text-xs" style={{ color: colors.text }}>
              💡 Enfócate en las lecciones marcadas como "Urgente"
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeakLessonsPanel;
