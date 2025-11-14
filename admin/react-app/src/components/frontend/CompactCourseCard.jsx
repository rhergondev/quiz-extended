import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList, Video, FileText } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import useStudentProgress from '../../hooks/useStudentProgress';

const CompactCourseCard = ({ course }) => {
  const { t } = useTranslation();
  const { getColor } = useTheme();
  const { id, title, _embedded } = course;
  
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
        backgroundColor: getColor('background', '#ffffff'),
        borderTopWidth: '2px',
        borderBottomWidth: '2px',
        borderLeftWidth: '8px',
        borderRightWidth: '8px',
        borderColor: getColor('borderColor', '#3b82f6')
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
          style={{ backgroundColor: getColor('primary', '#1a202c') }}
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
              style={{ color: getColor('textSecondary', '#6b7280') }}
            >
              {t('courses.progress')}
            </span>
            <span 
              className="text-lg font-bold"
              style={{ color: getColor('textPrimary', '#111827') }}
            >
              {progressPercentage}%
            </span>
          </div>
          <div 
            className="rounded-full h-3 overflow-hidden"
            style={{ backgroundColor: `${getColor('primary', '#1a202c')}15` }}
          >
            <div 
              className="h-full transition-all duration-500 rounded-full"
              style={{ 
                width: `${progressPercentage}%`,
                backgroundColor: getColor('primary', '#1a202c')
              }}
            />
          </div>
        </div>
        
        {/* Content Type Widgets - Estilo Dashboard */}
        {availableContentTypes.length > 0 && (
          <div 
            className="mt-4 overflow-hidden"
            style={{ 
              borderTop: `2px solid ${getColor('borderColor', '#3b82f6')}15`,
              borderBottom: `2px solid ${getColor('borderColor', '#3b82f6')}15`
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
                    borderColor: `${getColor('borderColor', '#3b82f6')}15`,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${getColor('primary', '#1a202c')}08`}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <contentType.icon 
                    size={20} 
                    style={{ color: getColor('primary', '#1a202c') }} 
                    className="mb-1" 
                  />
                  <span 
                    className="text-xs font-bold"
                    style={{ color: getColor('textPrimary', '#111827') }}
                  >
                    {contentType.completed}/{contentType.total}
                  </span>
                  <span 
                    className="text-xs mt-0.5"
                    style={{ color: getColor('textSecondary', '#6b7280') }}
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
            style={{ backgroundColor: getColor('primary', '#1a202c') }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = getColor('hoverColor', '#f59e0b');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getColor('primary', '#1a202c');
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
