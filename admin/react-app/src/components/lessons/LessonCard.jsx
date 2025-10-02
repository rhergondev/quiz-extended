// src/components/lessons/LessonCard.jsx (Refactored)

import React, { useState } from 'react';
import { 
  Edit, Trash2, Copy, BookOpen, Clock, Target, CheckCircle, 
  ChevronDown, ChevronUp, Video, FileText, Download, HelpCircle, 
  FileImage, Volume2 
} from 'lucide-react';
import BaseCard from '../common/BaseCard'; // <-- Import our new BaseCard

/**
 * A specific card component for displaying Lesson information, built upon BaseCard.
 * It defines the content for the header, stats, and footer slots of the BaseCard.
 *
 * @param {object} props
 * @param {object} props.lesson - The lesson data object from the API.
 * @param {string} props.viewMode - The current view mode ('cards' or 'list').
 * @param {Function} props.onEdit - Callback for the edit action.
 * @param {Function} props.onDelete - Callback for the delete action.
 * @param {Function} props.onDuplicate - Callback for the duplicate action.
 * @param {Function} props.onClick - Callback for clicking the card.
 */
const LessonCard = ({ lesson, viewMode, onEdit, onDelete, onDuplicate, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // --- Data Extraction and Helpers ---
  const {
    title = 'Untitled Lesson',
    meta = {},
    status = 'draft',
    excerpt = { rendered: 'No description available.' }
  } = lesson;

  const {
    _course_id: courseId = 'N/A',
    _lesson_type: lessonType = 'mixed',
    _lesson_steps: steps = [],
    _duration_minutes: duration = 0,
    _is_required: isRequired = false,
  } = meta;

  const stepsCount = Array.isArray(steps) ? steps.length : 0;
  const cleanDescription = (excerpt.rendered || '').replace(/<[^>]*>/g, '');

  const lessonTypeColors = {
    video: 'bg-blue-100 text-blue-800',
    text: 'bg-green-100 text-green-800',
    mixed: 'bg-purple-100 text-purple-800',
    quiz: 'bg-red-100 text-red-800',
  };

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
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${lessonTypeColors[lessonType] || 'bg-gray-100'}`}>
          {lessonType}
        </span>
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
          Course #{courseId}
        </span>
        {isRequired && (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Required
          </span>
        )}
      </div>
    </>
  );

  const statsContent = (
    <div className="grid grid-cols-3 gap-4 text-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <BookOpen className="w-4 h-4" />
        <span>{stepsCount} {stepsCount === 1 ? 'step' : 'steps'}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-600">
        <Clock className="w-4 h-4" />
        <span>{duration > 0 ? `${duration} min` : 'N/A'}</span>
      </div>
       <div className="flex items-center gap-2 text-gray-600 capitalize">
        <Target className="w-4 h-4" />
        <span>{status}</span>
      </div>
    </div>
  );

  const mainContent = (
    <p className="text-sm text-gray-600 line-clamp-2">
      {cleanDescription}
    </p>
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
    >
      {mainContent}
    </BaseCard>
  );
};

export default LessonCard;