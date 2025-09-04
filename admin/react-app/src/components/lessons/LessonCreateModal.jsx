import React, { useState, useEffect } from 'react';
import { X, Video, FileText, HelpCircle, PenTool, Radio } from 'lucide-react';

const LessonCreateModal = ({ 
  isOpen, 
  onClose, 
  onLessonCreated, 
  courses = [],
  selectedCourseId = null,
  isCreating = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft',
    courseId: selectedCourseId || '',
    menu_order: 1,
    meta: {
      _course_id: selectedCourseId || '',
      _lesson_order: '1',
      _duration_minutes: '',
      _lesson_type: 'video',
      _video_url: '',
      _content_type: 'free',
      _prerequisite_lessons: '',
      _resources_urls: '',
      _completion_criteria: 'view'
    }
  });

  const [errors, setErrors] = useState({});

  // Update form when selectedCourseId changes
  useEffect(() => {
    if (selectedCourseId) {
      setFormData(prev => ({
        ...prev,
        courseId: selectedCourseId,
        meta: {
          ...prev.meta,
          _course_id: selectedCourseId.toString()
        }
      }));
    }
  }, [selectedCourseId]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Lesson title is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Lesson content is required';
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Course selection is required';
    }
    
    if (formData.meta._duration_minutes && (isNaN(parseInt(formData.meta._duration_minutes)) || parseInt(formData.meta._duration_minutes) < 0)) {
      newErrors.duration = 'Duration must be a positive number';
    }

    if (formData.meta._lesson_order && (isNaN(parseInt(formData.meta._lesson_order)) || parseInt(formData.meta._lesson_order) < 1)) {
      newErrors.lesson_order = 'Lesson order must be a positive number starting from 1';
    }

    // Video URL validation for video lessons
    if (formData.meta._lesson_type === 'video' && formData.meta._video_url) {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlPattern.test(formData.meta._video_url)) {
        newErrors.video_url = 'Please enter a valid video URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Log para debugging
    console.log('Form data being submitted:', formData);
    console.log('onLessonCreated function:', onLessonCreated);
    console.log('Type of onLessonCreated:', typeof onLessonCreated);

    try {
      // Validar que onLessonCreated es una función
      if (typeof onLessonCreated !== 'function') {
        throw new Error('onLessonCreated is not a function');
      }

      await onLessonCreated(formData);
      
      // Reset form only after successful creation
      setFormData({
        title: '',
        content: '',
        status: 'draft',
        courseId: selectedCourseId || '',
        menu_order: 1,
        meta: {
          _course_id: selectedCourseId || '',
          _lesson_order: '1',
          _duration_minutes: '',
          _lesson_type: 'video',
          _video_url: '',
          _content_type: 'free',
          _prerequisite_lessons: '',
          _resources_urls: '',
          _completion_criteria: 'view'
        }
      });
      setErrors({});
      
    } catch (error) {
      console.error('Error creating lesson:', error);
      setErrors({ submit: error.message || 'Failed to create lesson' });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('meta.')) {
      const metaKey = name.replace('meta.', '');
      setFormData(prev => ({
        ...prev,
        meta: {
          ...prev.meta,
          [metaKey]: value
        }
      }));

      // Update courseId when _course_id changes
      if (metaKey === '_course_id') {
        setFormData(prev => ({
          ...prev,
          courseId: parseInt(value) || ''
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));

      // Update meta._course_id when courseId changes
      if (name === 'courseId') {
        setFormData(prev => ({
          ...prev,
          meta: {
            ...prev.meta,
            _course_id: value.toString()
          }
        }));
      }
    }
    
    // Clear error when user starts typing
    if (errors[name] || errors.submit) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
        submit: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={!isCreating ? onClose : undefined}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Lesson
              </h3>
              <button
                type="button"
                className="bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                onClick={!isCreating ? onClose : undefined}
                disabled={isCreating}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="space-y-6">
              {/* Submit Error */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              )}

              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Basic Information</h4>
                
                {/* Course Selection */}
                <div>
                  <label htmlFor="courseId" className="block text-sm font-medium text-gray-700 mb-1">
                    Course *
                  </label>
                  <select
                    name="courseId"
                    id="courseId"
                    required
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.courseId ? 'border-red-300' : 'border-gray-300'
                    }`}
                    disabled={isCreating || !!selectedCourseId}
                  >
                    <option value="">Select a course...</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title?.rendered || course.title || 'Untitled Course'}
                      </option>
                    ))}
                  </select>
                  {errors.courseId && (
                    <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    required
                    value={formData.title}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter lesson title..."
                    disabled={isCreating}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Content */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Content *
                  </label>
                  <textarea
                    name="content"
                    id="content"
                    rows={4}
                    required
                    value={formData.content}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors.content ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter lesson content and description..."
                    disabled={isCreating}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                  )}
                </div>
              </div>

              {/* Lesson Configuration - Resto igual ... */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Lesson Configuration</h4>
                
                {/* First row: Status, Type, Content Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      id="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    >
                      <option value="draft">Draft</option>
                      <option value="publish">Published</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="meta._lesson_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Type
                    </label>
                    <select
                      name="meta._lesson_type"
                      id="meta._lesson_type"
                      value={formData.meta._lesson_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    >
                      <option value="video">Video Lesson</option>
                      <option value="text">Text Lesson</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                      <option value="live">Live Session</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="meta._content_type" className="block text-sm font-medium text-gray-700 mb-1">
                      Content Type
                    </label>
                    <select
                      name="meta._content_type"
                      id="meta._content_type"
                      value={formData.meta._content_type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                {/* Second row: Order, Duration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="meta._lesson_order" className="block text-sm font-medium text-gray-700 mb-1">
                      Lesson Order
                    </label>
                    <input
                      type="number"
                      name="meta._lesson_order"
                      id="meta._lesson_order"
                      min="1"
                      value={formData.meta._lesson_order}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.lesson_order ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="1"
                      disabled={isCreating}
                    />
                    {errors.lesson_order && (
                      <p className="mt-1 text-sm text-red-600">{errors.lesson_order}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="meta._duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="meta._duration_minutes"
                      id="meta._duration_minutes"
                      min="0"
                      value={formData.meta._duration_minutes}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.duration ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="30"
                      disabled={isCreating}
                    />
                    {errors.duration && (
                      <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
                    )}
                  </div>
                </div>

                {/* Video URL (shown only for video lessons) */}
                {formData.meta._lesson_type === 'video' && (
                  <div>
                    <label htmlFor="meta._video_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <input
                      type="url"
                      name="meta._video_url"
                      id="meta._video_url"
                      value={formData.meta._video_url}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.video_url ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="https://example.com/video.mp4"
                      disabled={isCreating}
                    />
                    {errors.video_url && (
                      <p className="mt-1 text-sm text-red-600">{errors.video_url}</p>
                    )}
                  </div>
                )}

                {/* Completion Criteria */}
                <div>
                  <label htmlFor="meta._completion_criteria" className="block text-sm font-medium text-gray-700 mb-1">
                    Completion Criteria
                  </label>
                  <select
                    name="meta._completion_criteria"
                    id="meta._completion_criteria"
                    value={formData.meta._completion_criteria}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={isCreating}
                  >
                    <option value="view">View lesson</option>
                    <option value="quiz">Complete quiz</option>
                    <option value="assignment">Submit assignment</option>
                    <option value="time">Watch for duration</option>
                  </select>
                </div>

                {/* Resources URLs */}
                <div>
                  <label htmlFor="meta._resources_urls" className="block text-sm font-medium text-gray-700 mb-1">
                    Resource URLs <span className="text-gray-500 text-xs">(one per line)</span>
                  </label>
                  <textarea
                    name="meta._resources_urls"
                    id="meta._resources_urls"
                    rows={3}
                    value={formData.meta._resources_urls}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://example.com/resource1.pdf&#10;https://example.com/resource2.pdf"
                    disabled={isCreating}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Creating Lesson...
                  </>
                ) : (
                  'Create Lesson'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LessonCreateModal;