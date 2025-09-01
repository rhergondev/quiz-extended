import React, { useState } from 'react';
import { X } from 'lucide-react';

const CourseCreateModal = ({ 
  isOpen, 
  onClose, 
  onCourseCreated, 
  categories = [],
  isCreating = false 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    status: 'draft',
    meta: {
      _start_date: '',
      _end_date: '',
      _price: '',
      _sale_price: '',
      _course_category: '',
    }
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.content.trim()) {
      newErrors.content = 'Description is required';
    }
    
    if (formData.meta._price && isNaN(parseFloat(formData.meta._price))) {
      newErrors.price = 'Price must be a valid number';
    }
    
    if (formData.meta._sale_price && isNaN(parseFloat(formData.meta._sale_price))) {
      newErrors.sale_price = 'Sale price must be a valid number';
    }

    // Validate date range if both dates are provided
    if (formData.meta._start_date && formData.meta._end_date) {
      const startDate = new Date(formData.meta._start_date);
      const endDate = new Date(formData.meta._end_date);
      
      if (startDate >= endDate) {
        newErrors.date_range = 'End date must be after start date';
      }
    }

    // Validate sale price is less than regular price
    if (formData.meta._price && formData.meta._sale_price) {
      const price = parseFloat(formData.meta._price);
      const salePrice = parseFloat(formData.meta._sale_price);
      
      if (salePrice >= price) {
        newErrors.sale_price = 'Sale price must be less than regular price';
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

    try {
      await onCourseCreated(formData);
      // Reset form
      setFormData({
        title: '',
        content: '',
        status: 'draft',
        meta: {
          _start_date: '',
          _end_date: '',
          _price: '',
          _sale_price: '',
          _course_category: '',
        }
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating course:', error);
      setErrors({ submit: error.message });
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
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Create New Course
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
                
                {/* Title */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title *
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
                    placeholder="Enter course title..."
                    disabled={isCreating}
                  />
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Description *
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
                    placeholder="Enter course description..."
                    disabled={isCreating}
                  />
                  {errors.content && (
                    <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                  )}
                </div>

                {/* Status and Category Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    </select>
                  </div>

                  <div>
                    <label htmlFor="meta._course_category" className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="meta._course_category"
                      id="meta._course_category"
                      value={formData.meta._course_category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    >
                      <option value="">Select category...</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Course Details */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Course Details</h4>
                
                {/* Dates Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="meta._start_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="meta._start_date"
                      id="meta._start_date"
                      value={formData.meta._start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label htmlFor="meta._end_date" className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      name="meta._end_date"
                      id="meta._end_date"
                      value={formData.meta._end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      disabled={isCreating}
                    />
                  </div>
                </div>
                
                {/* Date range validation error */}
                {errors.date_range && (
                  <p className="text-sm text-red-600">{errors.date_range}</p>
                )}

                {/* Pricing Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="meta._price" className="block text-sm font-medium text-gray-700 mb-1">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      name="meta._price"
                      id="meta._price"
                      step="0.01"
                      min="0"
                      value={formData.meta._price}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.price ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      disabled={isCreating}
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="meta._sale_price" className="block text-sm font-medium text-gray-700 mb-1">
                      Sale Price ($)
                    </label>
                    <input
                      type="number"
                      name="meta._sale_price"
                      id="meta._sale_price"
                      step="0.01"
                      min="0"
                      value={formData.meta._sale_price}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        errors.sale_price ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      disabled={isCreating}
                    />
                    {errors.sale_price && (
                      <p className="mt-1 text-sm text-red-600">{errors.sale_price}</p>
                    )}
                  </div>
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
                    Creating Course...
                  </>
                ) : (
                  'Create Course'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CourseCreateModal;