// src/components/lessons/LessonCard.jsx (Refactorizado con vista de lista)

import React, { useState, useMemo } from 'react';
import { 
  Edit, Trash2, Copy, BookOpen, ChevronDown, ChevronUp, Video, 
  FileText, Download, HelpCircle, FileImage, Volume2, CheckCircle
} from 'lucide-react';
import BaseCard from '../common/BaseCard';

/**
 * A specific card component for displaying Lesson information, built upon BaseCard.
 *
 * @param {object} props
 * @param {object} props.lesson - The lesson data object from the API.
 * @param {Array} [props.courses=[]] - Array of available courses to find the course name.
 * @param {string} props.viewMode - The current view mode ('cards' or 'list').
 * @param {Function} props.onEdit - Callback for the edit action.
 * @param {Function} props.onDelete - Callback for the delete action.
 * @param {Function} props.onDuplicate - Callback for the duplicate action.
 * @param {Function} props.onClick - Callback for clicking the card.
 */
const LessonCard = ({ lesson, courses = [], viewMode, onEdit, onDelete, onDuplicate, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Data Extraction and Helpers ---
  const {
    title = 'Untitled Lesson',
    meta = {},
    excerpt = { rendered: 'No description available.' }
  } = lesson;

  const {
    _course_id: courseId = 'N/A',
    _lesson_steps: steps = [],
    _is_required: isRequired = false,
  } = meta;

  const courseName = useMemo(() => {
    if (!courseId || courses.length === 0) return `Course #${courseId}`;
    const course = courses.find(c => c.id.toString() === courseId.toString());
    return course?.title?.rendered || course?.title || `Course #${courseId}`;
  }, [courseId, courses]);

  const stepsCount = Array.isArray(steps) ? steps.length : 0;
  const cleanDescription = (excerpt.rendered || '').replace(/<[^>]*>/g, '');

  const getStepIcon = (stepType) => {
    const iconProps = { className: "w-4 h-4" };
    const typeMap = {
      video: <Video {...iconProps} />,
      text: <FileText {...iconProps} />,
      pdf: <Download {...iconProps} />,
      quiz: <HelpCircle {...iconProps} />,
      image: <FileImage {...iconProps} />,
      audio: <Volume2 {...iconProps} />,
    };
    return typeMap[stepType] || <BookOpen {...iconProps} />;
  };

  // --- Slot Content Definitions ---

  const headerContent = (
    <>
      <div className="flex items-start justify-between">
        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 pr-12">
          {title}
        </h3>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
          {courseName}
        </span>
        {isRequired && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Required
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
        {cleanDescription}
      </p>
    </>
  );

  const mainContent = (<></>);
  
  const statsContent = (
    <div className="flex items-center gap-2 text-gray-600 text-sm">
      <BookOpen className="w-4 h-4" />
      <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
    </div>
  );

  const footerContent = (
    stepsCount > 0 && (
      <div className="border-t border-gray-200">
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 p-4 transition-colors"
        >
          <span className="font-medium">Preview Steps</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2 max-h-48 overflow-y-auto">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 text-sm p-2 bg-white rounded">
                <div className="flex-shrink-0">{getStepIcon(step.type)}</div>
                <div className="flex-1 truncate" title={step.title}>{step.title || `Step ${index + 1}`}</div>
                <span className="text-xs text-gray-400 capitalize">{step.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  );
  
  // 🔥 NUEVO: Definición del contenido para el modo 'list'
  const listContent = (
    <div className="flex items-center w-full gap-4">
      {/* Icono de Lección */}
      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <BookOpen className="w-5 h-5 text-blue-600" />
      </div>

      {/* Info Principal */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate" title={title}>
          {title}
        </p>
        <p className="text-sm text-gray-500 truncate mt-1">
          {cleanDescription || 'No description.'}
        </p>
      </div>

      {/* Stats para Vista de Lista */}
      <div className="hidden md:flex items-center gap-6 text-sm flex-shrink-0">
        <div className="flex items-center gap-2 text-gray-600" title="Course">
          <span className="font-medium">{courseName}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-600" title="Steps">
          <BookOpen className="w-4 h-4" />
          <span>{stepsCount}</span>
        </div>
      </div>
    </div>
  );

  const cardActions = [
    { label: 'Edit', icon: Edit, onClick: () => onEdit(lesson) },
    { label: 'Duplicate', icon: Copy, onClick: () => onDuplicate(lesson) },
    { label: 'Delete', icon: Trash2, onClick: () => onDelete(lesson), color: 'text-red-500' },
  ];

  return (
    <BaseCard
      viewMode={viewMode}
      actions={cardActions}
      onClick={() => onClick(lesson)}
      header={headerContent}
      stats={statsContent}
      footer={footerContent}
      listContent={listContent} // 🔥 AÑADIDO: Pasamos el contenido de la lista a BaseCard
    >
      {mainContent}
    </BaseCard>
  );
};

export default LessonCard;