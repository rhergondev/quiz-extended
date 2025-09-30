import React, { useState } from 'react';
import { 
  Edit, Trash2, Copy, Eye, Clock, Users, BookOpen,
  DollarSign, Star, TrendingUp, ChevronDown, ChevronUp,
  GraduationCap, Target, BarChart3
} from 'lucide-react';

const CourseCard = ({ course, onEdit, onDelete, onDuplicate, onClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const title = course.title?.rendered || course.title || 'Untitled Course';
  const description = course.excerpt?.rendered || course.content?.rendered?.substring(0, 150) || 'No description available';
  
  // Course data
  const price = course.price || parseFloat(course.meta?._course_price || 0);
  const difficulty = course.difficulty || course.meta?._course_difficulty || 'intermediate';
  const category = course.category || course.meta?._course_category || 'general';
  const lessonCount = course.lesson_count || course.meta?._lesson_count || 0;
  const studentCount = course.student_count || course.meta?._student_count || 0;
  const completionRate = course.completion_rate || course.meta?._completion_rate || 0;
  const durationHours = course.duration_hours || course.meta?._course_duration || 0;

  // Helper functions
  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return `$${price.toFixed(2)}`;
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'advanced': return 'bg-orange-100 text-orange-800';
      case 'expert': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'programming': return 'bg-purple-100 text-purple-800';
      case 'design': return 'bg-pink-100 text-pink-800';
      case 'business': return 'bg-indigo-100 text-indigo-800';
      case 'marketing': return 'bg-yellow-100 text-yellow-800';
      case 'photography': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriceColor = (price) => {
    if (price === 0) return 'bg-green-100 text-green-800';
    if (price < 50) return 'bg-blue-100 text-blue-800';
    if (price < 100) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
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
              <div className={`px-3 py-1 text-sm font-bold rounded-full ${getPriceColor(price)}`}>
                {formatPrice(price)}
              </div>
            </div>

            {/* Description */}
            {cleanDescription && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {cleanDescription}
              </p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getDifficultyColor(difficulty)}`}>
                {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </span>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getCategoryColor(category)}`}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
              {course.status === 'draft' && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                  Draft
                </span>
              )}
              {course.status === 'private' && (
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
        <div className="grid grid-cols-2 gap-6 text-sm">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{lessonCount}</span>
              <span className="text-gray-500 ml-1">{lessonCount === 1 ? 'lesson' : 'lessons'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{studentCount}</span>
              <span className="text-gray-500 ml-1">{studentCount === 1 ? 'student' : 'students'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{durationHours}h</span>
              <span className="text-gray-500 ml-1">duration</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-gray-500" />
            <div>
              <span className="text-gray-700 font-medium">{completionRate}%</span>
              <span className="text-gray-500 ml-1">completion</span>
            </div>
          </div>
        </div>

        {/* Course Details Toggle */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleToggleExpand}
            className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Course Details</span>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expandable Details Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-white">
          <div className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Course Analytics
            </h4>
            
            <div className="space-y-4">
              {/* Revenue */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Total Revenue</p>
                    <p className="text-xs text-gray-500">Price × Students</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ${(price * studentCount).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Completion Rate Details */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Completed Students</p>
                    <p className="text-xs text-gray-500">Students who finished</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(studentCount * (completionRate / 100))}
                  </p>
                  <p className="text-xs text-gray-500">of {studentCount}</p>
                </div>
              </div>

              {/* Average per Lesson */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Avg. Duration/Lesson</p>
                    <p className="text-xs text-gray-500">Hours per lesson</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">
                    {lessonCount > 0 ? (durationHours / lessonCount).toFixed(1) : '0'}h
                  </p>
                </div>
              </div>

              {/* Status Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Course Status</p>
                    <p className="text-xs text-gray-500">Current publication status</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    course.status === 'publish' ? 'bg-green-100 text-green-800' :
                    course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                  </span>
                </div>
              </div>
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

export default CourseCard;