import React from 'react';
import { 
  Video, 
  FileText, 
  HelpCircle, 
  PenTool, 
  Radio,
  Clock,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Edit3,
  Copy,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

const LessonsList = ({ 
  lessons, 
  isLoading, 
  onEdit, 
  onDelete, 
  onDuplicate,
  showCourseColumn = true,
  selectedRows = [],
  onSelectionChange,
  onLoadMore
}) => {

  const getLessonTypeIcon = (type) => {
    const icons = {
      video: <Video className="h-4 w-4" />,
      text: <FileText className="h-4 w-4" />,
      quiz: <HelpCircle className="h-4 w-4" />,
      assignment: <PenTool className="h-4 w-4" />,
      live: <Radio className="h-4 w-4" />
    };
    return icons[type] || <FileText className="h-4 w-4" />;
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes === 0) return '-';
    const mins = parseInt(minutes);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'publish':
        return <Eye className="h-4 w-4 text-green-500" />;
      case 'draft':
        return <EyeOff className="h-4 w-4 text-yellow-500" />;
      case 'private':
        return <Lock className="h-4 w-4 text-gray-500" />;
      default:
        return <EyeOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getContentTypeIcon = (contentType) => {
    return contentType === 'premium' 
      ? <Lock className="h-4 w-4 text-purple-500" />
      : <Unlock className="h-4 w-4 text-green-500" />;
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      onSelectionChange?.(lessons.map(lesson => ({ original: lesson })));
    } else {
      onSelectionChange?.([]);
    }
  };

  const handleSelectRow = (lesson, checked) => {
    if (checked) {
      onSelectionChange?.([...selectedRows, { original: lesson }]);
    } else {
      onSelectionChange?.(selectedRows.filter(row => row.original.id !== lesson.id));
    }
  };

  const isSelected = (lessonId) => {
    return selectedRows.some(row => row.original.id === lessonId);
  };

  const allSelected = lessons.length > 0 && selectedRows.length === lessons.length;
  const someSelected = selectedRows.length > 0 && selectedRows.length < lessons.length;

  if (isLoading && lessons.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (lessons.length === 0 && !isLoading) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto h-12 w-12 text-gray-400">
          <FileText className="h-12 w-12" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No lessons found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating a new lesson.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="relative px-6 py-3">
                <input
                  type="checkbox"
                  className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={handleSelectAll}
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lesson
              </th>
              {showCourseColumn && (
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Course
                </th>
              )}
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Content
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Duration
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lessons.map((lesson) => (
              <tr 
                key={lesson.id} 
                className={`hover:bg-gray-50 ${isSelected(lesson.id) ? 'bg-indigo-50' : ''}`}
              >
                <td className="relative px-6 py-4">
                  <input
                    type="checkbox"
                    className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    checked={isSelected(lesson.id)}
                    onChange={(e) => handleSelectRow(lesson, e.target.checked)}
                  />
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lesson.title?.rendered || lesson.title || 'Untitled Lesson'}
                      </p>
                      {lesson.content && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {lesson.excerpt?.rendered || 
                           (lesson.content?.rendered || lesson.content)
                             ?.replace(/<[^>]*>/g, '')
                             ?.substring(0, 100) + '...' || 
                           'No description'}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                {showCourseColumn && (
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {lesson.course_title || lesson.meta?._course_title || 'Unknown Course'}
                    </div>
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-500">
                      {getLessonTypeIcon(lesson.meta?._lesson_type || 'text')}
                    </span>
                    <span className="text-sm text-gray-900 capitalize">
                      {lesson.meta?._lesson_type || 'Text'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2">
                      {getStatusIcon(lesson.status)}
                    </span>
                    <span className="text-sm text-gray-900 capitalize">
                      {lesson.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <span className="mr-2">
                      {getContentTypeIcon(lesson.meta?._content_type || 'free')}
                    </span>
                    <span className="text-sm text-gray-900 capitalize">
                      {lesson.meta?._content_type || 'Free'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-gray-400" />
                    {formatDuration(lesson.meta?._duration_minutes)}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  #{lesson.meta?._lesson_order || lesson.menu_order || 1}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => onEdit?.(lesson)}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                      title="Edit lesson"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDuplicate?.(lesson.id)}
                      className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                      title="Duplicate lesson"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete?.(lesson.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                      title="Delete lesson"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {onLoadMore && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 mr-2"></div>
                Loading more lessons...
              </>
            ) : (
              'Load More Lessons'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default LessonsList;