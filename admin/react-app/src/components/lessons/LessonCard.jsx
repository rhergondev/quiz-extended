import React, { useState } from 'react';
import { 
  Edit, Trash2, Copy, Eye, Clock, PlayCircle, FileText, 
  Download, HelpCircle, ChevronDown, ChevronUp, BookOpen,
  Video, FileImage, Volume2, CheckCircle, AlertCircle
} from 'lucide-react';

const LessonCard = ({ lesson, onEdit, onDelete, onDuplicate, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const title = lesson.title?.rendered || lesson.title || 'Untitled Lesson';
  const courseId = lesson.meta?._course_id || 'N/A';
  const lessonType = lesson.meta?._lesson_type || 'mixed';
  const stepsCount = lesson.steps_count || 0;
  const estimatedDuration = lesson.estimated_duration || 0;
  const steps = lesson.meta?._lesson_steps || [];
  const isRequired = lesson.meta?._is_required === 'yes';
  const description = lesson.excerpt?.rendered || lesson.content?.rendered?.substring(0, 150) || 'No description available';

  // Helper functions
  const formatDuration = (seconds) => {
    if (!seconds) return 'No time set';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const getStepIcon = (stepType) => {
    const iconProps = { className: "w-4 h-4" };
    switch (stepType) {
      case 'video': return <Video {...iconProps} />;
      case 'text': return <FileText {...iconProps} />;
      case 'pdf': return <Download {...iconProps} />;
      case 'quiz': return <HelpCircle {...iconProps} />;
      case 'image': return <FileImage {...iconProps} />;
      case 'audio': return <Volume2 {...iconProps} />;
      default: return <BookOpen {...iconProps} />;
    }
  };

  const getStepTypeColor = (stepType) => {
    switch (stepType) {
      case 'video': return 'text-blue-600 bg-blue-50';
      case 'text': return 'text-green-600 bg-green-50';
      case 'pdf': return 'text-red-600 bg-red-50';
      case 'quiz': return 'text-purple-600 bg-purple-50';
      case 'image': return 'text-orange-600 bg-orange-50';
      case 'audio': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const lessonTypeColors = {
    video: 'bg-blue-100 text-blue-800',
    text: 'bg-green-100 text-green-800',
    mixed: 'bg-purple-100 text-purple-800',
    quiz: 'bg-red-100 text-red-800',
    interactive: 'bg-orange-100 text-orange-800'
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Clean description text
  const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

  return (
    <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1 cursor-pointer" onClick={onClick}>
            <div className="flex items-start gap-3 mb-3">
              <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2 flex-1">
                {title}
              </h3>
              {isRequired && (
                <div className="flex items-center gap-1 bg-green-50 px-2 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Required</span>
                </div>
              )}
            </div>

            {/* Description */}
            {cleanDescription && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {cleanDescription}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${lessonTypeColors[lessonType] || 'bg-gray-100 text-gray-800'}`}>
                {lessonType.charAt(0).toUpperCase() + lessonType.slice(1)} Lesson
              </span>
              <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800">
                Course #{courseId}
              </span>
              {lesson.status === 'draft' && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Draft
                </span>
              )}
              {lesson.status === 'private' && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  Private
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-6 bg-gray-50">
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{stepsCount}</span>
              <span className="text-gray-500 ml-1">{stepsCount === 1 ? 'step' : 'steps'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{formatDuration(estimatedDuration)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <PlayCircle className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium capitalize">{lesson.status}</span>
            </div>
          </div>
        </div>

        {/* Steps Preview Toggle */}
        {stepsCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={handleToggleExpand}
              className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>Preview Steps</span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Expandable Steps Section */}
      {isExpanded && stepsCount > 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Lesson Steps ({stepsCount})
            </h4>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {steps.map((step, index) => (
                <div
                  key={step.id || index}
                  className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100"
                >
                  {/* Step Number */}
                  <div className="flex items-center justify-center w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium flex-shrink-0">
                    {step.order || index + 1}
                  </div>
                  
                  {/* Step Type Icon */}
                  <div className={`p-2 rounded-lg ${getStepTypeColor(step.type)} flex-shrink-0`}>
                    {getStepIcon(step.type)}
                  </div>
                  
                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-800 mb-1">
                          {step.title || `Step ${index + 1}`}
                        </h5>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="capitalize font-medium">
                            {step.type}
                          </span>
                          {step.required && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span className="text-green-600">Required</span>
                            </div>
                          )}
                          {step.type === 'video' && step.data?.duration && (
                            <span>{formatDuration(step.data.duration)}</span>
                          )}
                          {step.type === 'quiz' && step.data?.quiz_id && (
                            <span>Quiz ID: {step.data.quiz_id}</span>
                          )}
                        </div>
                        {step.data?.content && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">
                            {step.data.content.replace(/<[^>]*>/g, '').substring(0, 100)}...
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State for Steps */}
      {isExpanded && stepsCount === 0 && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-6">
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium mb-1">No steps defined yet</p>
              <p className="text-xs text-gray-400">
                Edit this lesson to add content steps
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          title="View"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Edit"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default LessonCard;