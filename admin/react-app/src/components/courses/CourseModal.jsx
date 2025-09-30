import React, { useState, useEffect } from 'react';
import { 
  X, BookOpen, DollarSign, Users, Clock, 
  BarChart3, Save, Plus, Eye, AlertCircle 
} from 'lucide-react';

const CourseModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  course = null, 
  mode = 'create', 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'programming',
    difficulty: 'intermediate',
    price: '0',
    maxStudents: '100',
    duration: '10',
    status: 'draft'
  });

  const [errors, setErrors] = useState({});
  const [saveMode, setSaveMode] = useState('close'); // 'close', 'create', 'edit'

  // Initialize form data when course changes
  useEffect(() => {
    if (course && mode !== 'create') {
      setFormData({
        title: course.title?.rendered || course.title || '',
        description: course.content?.rendered || course.excerpt?.rendered || '',
        category: course.meta?._course_category || course.category || 'programming',
        difficulty: course.meta?._course_difficulty || course.difficulty || 'intermediate',
        price: course.meta?._course_price || course.price?.toString() || '0',
        maxStudents: course.meta?._course_max_students || '100',
        duration: course.meta?._course_duration || course.duration_hours?.toString() || '10',
        status: course.status || 'draft'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'programming',
        difficulty: 'intermediate',
        price: '0',
        maxStudents: '100',
        duration: '10',
        status: 'draft'
      });
    }
    setErrors({});
  }, [course, mode]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setSaveMode('close');
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Course title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Course description is required';
    }

    if (formData.price && isNaN(parseFloat(formData.price))) {
      newErrors.price = 'Price must be a valid number';
    }

    if (formData.maxStudents && isNaN(parseInt(formData.maxStudents))) {
      newErrors.maxStudents = 'Max students must be a valid number';
    }

    if (formData.duration && isNaN(parseInt(formData.duration))) {
      newErrors.duration = 'Duration must be a valid number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (nextAction = 'close') => {
    if (!validateForm()) return;

    try {
      const courseData = {
        ...formData,
        price: parseFloat(formData.price) || 0,
        maxStudents: parseInt(formData.maxStudents) || 0,
        duration: parseInt(formData.duration) || 0
      };

      await onSave(courseData, nextAction);
      
      // Only reset if we're staying in modal
      if (nextAction === 'create') {
        setFormData({
          title: '',
          description: '',
          category: 'programming',
          difficulty: 'intermediate',
          price: '0',
          maxStudents: '100',
          duration: '10',
          status: 'draft'
        });
      }
    } catch (error) {
      console.error('Error saving course:', error);
    }
  };

  if (!isOpen) return null;

  const isViewMode = mode === 'view';
  const isEditMode = mode === 'edit';
  const isCreateMode = mode === 'create';

  const modalTitle = isCreateMode ? 'Create New Course' :
                   isEditMode ? 'Edit Course' : 'Course Details';

  const categoryOptions = [
    { value: 'programming', label: 'Programming' },
    { value: 'design', label: 'Design' },
    { value: 'business', label: 'Business' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'photography', label: 'Photography' }
  ];

  const difficultyOptions = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'publish', label: 'Published' },
    { value: 'private', label: 'Private' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {modalTitle}
                </h2>
                {course && (
                  <p className="text-sm text-gray-500 mt-1">
                    Course ID: {course.id}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Basic Information
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Title *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        disabled={isViewMode}
                        placeholder="Enter course title..."
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.title ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      {errors.title && (
                        <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course Description *
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={isViewMode}
                        placeholder="Describe what students will learn..."
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.description ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      {errors.description && (
                        <p className="text-red-600 text-sm mt-1">{errors.description}</p>
                      )}
                    </div>

                    {/* Category & Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category
                        </label>
                        <select
                          value={formData.category}
                          onChange={(e) => handleInputChange('category', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isViewMode ? 'bg-gray-100' : 'bg-white'
                          } border-gray-300`}
                        >
                          {categoryOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Difficulty Level
                        </label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => handleInputChange('difficulty', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                            isViewMode ? 'bg-gray-100' : 'bg-white'
                          } border-gray-300`}
                        >
                          {difficultyOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Settings */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Course Settings
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price ($)
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        disabled={isViewMode}
                        placeholder="0"
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.price ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      {errors.price && (
                        <p className="text-red-600 text-sm mt-1">{errors.price}</p>
                      )}
                    </div>

                    {/* Max Students */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Students
                      </label>
                      <input
                        type="number"
                        value={formData.maxStudents}
                        onChange={(e) => handleInputChange('maxStudents', e.target.value)}
                        disabled={isViewMode}
                        placeholder="100"
                        min="1"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.maxStudents ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      {errors.maxStudents && (
                        <p className="text-red-600 text-sm mt-1">{errors.maxStudents}</p>
                      )}
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration (hours)
                      </label>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => handleInputChange('duration', e.target.value)}
                        disabled={isViewMode}
                        placeholder="10"
                        min="1"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors.duration ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      {errors.duration && (
                        <p className="text-red-600 text-sm mt-1">{errors.duration}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Publication Status */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Publication
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      disabled={isViewMode}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isViewMode ? 'bg-gray-100' : 'bg-white'
                      } border-gray-300`}
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.status === 'draft' && 'Course is saved but not visible to students'}
                      {formData.status === 'publish' && 'Course is live and visible to students'}
                      {formData.status === 'private' && 'Course is only visible to administrators'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                {/* Preview/Summary */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-0">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Course Summary
                  </h3>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">Price</p>
                        <p className="text-gray-600">
                          {parseFloat(formData.price) === 0 ? 'Free' : `$${parseFloat(formData.price || 0).toFixed(2)}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-blue-500" />
                      <div>
                        <p className="font-medium">Max Students</p>
                        <p className="text-gray-600">{formData.maxStudents || 0}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium">Duration</p>
                        <p className="text-gray-600">{formData.duration || 0} hours</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="font-medium">Level</p>
                        <p className="text-gray-600 capitalize">{formData.difficulty}</p>
                      </div>
                    </div>
                  </div>

                  {/* Course Stats (if editing existing course) */}
                  {course && !isCreateMode && (
                    <>
                      <hr className="my-4" />
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Students:</span>
                          <span className="font-medium">{course.student_count || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Completion Rate:</span>
                          <span className="font-medium">{course.completion_rate || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Lessons:</span>
                          <span className="font-medium">{course.lesson_count || 0}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          {!isViewMode && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex items-center text-sm text-gray-500">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>* Required fields</span>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                
                {isCreateMode && (
                  <button
                    onClick={() => handleSave('create')}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Save & Create New
                  </button>
                )}
                
                <button
                  onClick={() => handleSave('close')}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isEditMode ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </div>
          )}
          
          {isViewMode && (
            <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseModal;