import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList, Video, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useStudentProgress from '../../hooks/useStudentProgress';

const CompactCourseCard = ({ course }) => {
  const { t } = useTranslation();
  const { getColor, isDarkMode } = useTheme();
  const { id, title, _embedded } = course;
  
  // Colores adaptativos según el modo (mismo patrón que SupportMaterialPage)
  const cardColors = {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: isDarkMode ? getColor('textSecondary', '#9ca3af') : `${getColor('primary', '#1a202c')}70`,
    primary: getColor('primary', '#3b82f6'),
    accent: getColor('accent', '#f59e0b'),
    cardBg: isDarkMode ? getColor('secondaryBackground', '#1f2937') : getColor('background', '#ffffff'),
    hoverBg: isDarkMode ? 'rgba(255,255,255,0.05)' : `${getColor('primary', '#1a202c')}08`,
  };
  
  const { progress } = useStudentProgress(id, true, true);

  const imageUrl = _embedded?.['wp:featuredmedia']?.[0]?.source_url;
  const renderedTitle = title?.rendered || title || t('courses.title');
  const progressPercentage = progress?.percentage || 0;
  
  const stepsByType = progress?.steps_by_type || {
    quiz: { total: 0, completed: 0 },
    video: { total: 0, completed: 0 },
    text: { total: 0, completed: 0 },
    pdf: { total: 0, completed: 0 }
  };

  // Calcular qué tipos de contenido están disponibles (igual que dashboard)
  const availableContentTypes = useMemo(() => {
    const types = [];
    
    if ((stepsByType.quiz?.total || 0) > 0) {
      types.push({
        type: 'quiz',
        completed: stepsByType.quiz.completed,
        total: stepsByType.quiz.total,
        icon: ClipboardList,
        label: t('courses.test')
      });
    }
    
    const materialTotal = (stepsByType.text?.total || 0) + (stepsByType.pdf?.total || 0);
    if (materialTotal > 0) {
      types.push({
        type: 'material',
        completed: (stepsByType.text?.completed || 0) + (stepsByType.pdf?.completed || 0),
        total: materialTotal,
        icon: FileText,
        label: t('courses.material')
      });
    }
    
    if ((stepsByType.video?.total || 0) > 0) {
      types.push({
        type: 'video',
        completed: stepsByType.video.completed,
        total: stepsByType.video.total,
        icon: Video,
        label: t('courses.videos')
      });
    }
    
    return types;
  }, [stepsByType, t]);

  return (
    <div className="rounded-lg shadow-sm overflow-hidden flex flex-col w-full transition-all duration-300 hover:shadow-lg border-2"
      style={{ 
        backgroundColor: cardColors.cardBg,
        borderTopWidth: '2px',
        borderBottomWidth: '2px',
        borderLeftWidth: '8px',
        borderRightWidth: '2px',
        borderColor: cardColors.primary
      }}
    >
      {/* Featured Image */}
      {imageUrl ? (
        <div 
          className="h-56 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        <div 
          className="h-56 flex items-center justify-center"
          style={{ backgroundColor: cardColors.primary }}
        >
          <BookOpen className="w-20 h-20 text-white opacity-50" />
        </div>
      )}

      {/* Card Content - con flex-1 para empujar el botón hacia abajo */}
      <div className="flex flex-col flex-1">
        {/* Progress Bar */}
        <div className="p-4 pb-0">
          <div className="flex justify-between items-center mb-2">
            <span 
              className="text-sm font-semibold"
              style={{ color: cardColors.textMuted }}
            >
              {t('courses.progress')}
            </span>
            <span 
              className="text-lg font-bold"
              style={{ color: cardColors.text }}
            >
              {progressPercentage}%
            </span>
          </div>
          <div 
            className="rounded-full h-3 overflow-hidden"
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${cardColors.primary}15` }}
          >
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: cardColors.primary
              }}
            />
          </div>
        </div>
        
        {/* Content Type Widgets - Estilo Dashboard */}
        {availableContentTypes.length > 0 && (
          <div 
            className="mt-4 overflow-hidden"
            style={{ 
              borderTop: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : `${cardColors.primary}15`}`,
              borderBottom: `2px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : `${cardColors.primary}15`}`
            }}
          >
            <div 
              className="grid h-full"
              style={{ 
                gridTemplateColumns: `repeat(${availableContentTypes.length}, 1fr)`,
                minHeight: '80px'
              }}
            >
              {availableContentTypes.map((contentType, index) => (
                <div 
                  key={contentType.type}
                  className={`flex flex-col items-center justify-center py-3 transition-all duration-200 ${
                    index < availableContentTypes.length - 1 ? 'border-r' : ''
                  }`}
                  style={{ 
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : `${cardColors.primary}15`,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = cardColors.hoverBg}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <contentType.icon 
                    size={20} 
                    style={{ color: cardColors.text }} 
                    className="mb-1" 
                  />
                  <span 
                    className="text-xs font-bold"
                    style={{ color: cardColors.text }}
                  >
                    {contentType.completed}/{contentType.total}
                  </span>
                  <span 
                    className="text-xs mt-0.5"
                    style={{ color: cardColors.textMuted }}
                  >
                    {contentType.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spacer para empujar el botón hacia abajo */}
        <div className="flex-1"></div>

        {/* Course Button with Title - siempre al final */}
        <div className="p-4 pt-4">
          <Link
            to={`/courses/${id}/dashboard`}
            state={{ courseName: renderedTitle }}
            className="block w-full py-3 px-4 text-center text-base font-semibold text-white rounded-lg transition-all shadow-sm hover:shadow-md"
            style={{ backgroundColor: cardColors.primary }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = cardColors.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = cardColors.primary;
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: renderedTitle }} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompactCourseCard;
