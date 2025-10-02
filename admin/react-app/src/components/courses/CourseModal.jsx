// admin/react-app/src/components/courses/CourseModal.jsx

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, AlertCircle, ImageIcon, Upload, Users, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../common/Button';
import FilterDropdown from '../common/FilterDropdown';
import { getTaxonomyTerms, createTaxonomyTerm } from '../../api/services/taxonomyService';
import { uploadMedia, validateFile, createPreviewUrl } from '../../api/services/mediaService';

/**
 * CourseModal Component - IMPROVED VERSION
 * * - Includes max_students and duration_weeks fields.
 * - Handles and displays server-side validation errors.
 * - Improved state management for a better user experience.
 * * @param {object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close callback
 * @param {Function} props.onSave - Save callback (now expects a promise)
 * @param {object} props.course - Course object (null for create mode)
 * @param {string} props.mode - 'create', 'edit', or 'view'
 * @param {boolean} props.isLoading - Loading state from parent
 */
const CourseModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  course = null, 
  mode = 'create', 
  isLoading: parentIsLoading = false 
}) => {
  const { t } = useTranslation();
  
  // --- STATE ---
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    featured_media: null,
    status: 'draft',
    _course_position: '0',
    _product_type: 'free',
    _price: '0',
    _sale_price: '0',
    _start_date: '',
    _end_date: '',
    qe_category: []
  });
  
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null); // For server-side errors
  const [imagePreview, setImagePreview] = useState(null);
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // --- EFFECTS ---
  
  useEffect(() => {
  if (course && mode !== 'create') {
    const meta = course.meta || {};
    
    let contentValue = '';
    if (course.content?.rendered) {
      contentValue = course.content.rendered;
    } else if (course.content) {
      contentValue = course.content;
    } else if (course.description?.rendered) {
      contentValue = course.description.rendered;
    } else if (course.description) {
      contentValue = course.description;
    } else if (meta._course_description) {
      contentValue = meta._course_description;
    }
    
    setFormData({
      title: course.title?.rendered || course.title || '',
      content: contentValue, // 🔥 Usar el valor correcto
      featured_media: course.featured_media || null,
      status: course.status || 'draft',
      _course_position: meta._course_position || '0',
      _product_type: meta._product_type || 'free',
      _price: meta._price || '0',
      _sale_price: meta._sale_price || '0',
      _start_date: meta._start_date || '',
      _end_date: meta._end_date || '',
      qe_category: course.qe_category || []
    });

    if (course.featured_media && course._embedded?.['wp:featuredmedia']?.[0]) {
      const imageUrl = course._embedded['wp:featuredmedia'][0].source_url;
      setImagePreview(imageUrl);
    } else if (course.featured_media) {
      setImagePreview(null);
    }
  }
}, [course, mode]);
  
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setSubmitError(null);
      setShowNewCategoryForm(false);
      setNewCategoryName('');
    }
  }, [isOpen]);

    useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // --- API CALLS ---
  
   const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      console.log('🔍 Fetching categories...');
      const terms = await getTaxonomyTerms('qe_category');
      const categoryOptions = terms.map(term => ({
        value: term.id,
        label: term.name
      }));
      console.log('✅ Categories loaded:', categoryOptions.length);
      setCategories(categoryOptions);
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };
  
  // ❇️ CHANGED: Add new category to state immediately
  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setCreatingCategory(true);
    try {
      const newTerm = await createTaxonomyTerm('qe_category', {
        name: newCategoryName.trim()
      });
      
      // Add the new category to the list
      const newCategory = {
        value: newTerm.id,
        label: newTerm.name
      };
      setCategories(prev => [...prev, newCategory]);
      
      // Select the new category
      setFormData(prev => ({ ...prev, qe_category: [newTerm.id] }));
      setNewCategoryName('');
      setShowNewCategoryForm(false);
    } catch (error) {
      console.error('❌ Error creating category:', error);
    } finally {
      setCreatingCategory(false);
    }
  };

  // --- HANDLERS ---
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  // ... (otros handlers como handleImageChange, etc., que ya tienes)
  
    const handleCategoryChange = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      qe_category: [categoryId]
    }));
  };
  
  const handleProductTypeChange = (type) => {
    handleInputChange('_product_type', type);
    if (type === 'free') {
      handleInputChange('_price', '0');
      handleInputChange('_sale_price', '');
    }
  };
  
  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validation = validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (!validation.isValid) {
      setErrors(prev => ({ ...prev, featured_media: validation.error }));
      return;
    }
    
    try {
      const previewUrl = await createPreviewUrl(file);
      setImagePreview(previewUrl);
      
      setUploadingImage(true);
      setUploadProgress(0);
      
      const uploadedMedia = await uploadMedia(file, {
        title: formData.title || file.name,
        alt_text: formData.title || '',
        onProgress: setUploadProgress
      });
      
      handleInputChange('featured_media', uploadedMedia.id);
      setImagePreview(uploadedMedia.url);
      
      if (errors.featured_media) {
        setErrors(prev => ({ ...prev, featured_media: undefined }));
      }
      
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      setErrors(prev => ({ 
        ...prev, 
        featured_media: error.message || 'Failed to upload image'
      }));
      handleInputChange('featured_media', null);
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };
  
  const removeImage = () => {
    setImagePreview(null);
    handleInputChange('featured_media', null);
  };

  // --- VALIDATION ---
  
  const validateForm = () => {
    const newErrors = {};
    if (!formData.title.trim()) newErrors.title = t('courses.validation.titleRequired');
    if (!formData.content.trim()) newErrors.content = t('courses.validation.contentRequired');
    if (formData._product_type === 'paid') {
      const price = parseFloat(formData._price);
      if (isNaN(price) || price <= 0) {
        newErrors._price = t('courses.validation.priceInvalid');
      }
      const salePrice = parseFloat(formData._sale_price);
      if (!isNaN(salePrice) && salePrice >= price) {
        newErrors._sale_price = "Sale price must be less than the regular price.";
      }
    }
    if (formData._start_date && formData._end_date) {
      if (new Date(formData._end_date) < new Date(formData._start_date)) {
        newErrors._end_date = t('courses.validation.endDateInvalid');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- SAVE ---
  
  const handleSave = async (nextAction = 'close') => {
    setSubmitError(null);
    if (!validateForm()) return;
    
    try {
      const courseData = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        featured_media: formData.featured_media || 0,
        qe_category: formData.qe_category.filter(id => id),
        meta: {
          _course_position: parseInt(formData._course_position) || 0,
          _product_type: formData._product_type,
          _price: formData._product_type === 'paid' ? parseFloat(formData._price) || 0 : 0,
          _sale_price: formData._product_type === 'paid' && formData._sale_price ? parseFloat(formData._sale_price) : '',
          _start_date: formData._start_date || '',
          _end_date: formData._end_date || '',
        }
      };
      

      await onSave(courseData, nextAction);
      
      if (nextAction === 'create') {
        // Reset form for next entry
        setFormData({
          title: '', content: '', featured_media: null, status: 'draft',
          _course_position: '0', _product_type: 'free', _price: '0', _sale_price: '',
          _start_date: '', _end_date: '', qe_category: []
        });
        setImagePreview(null);
      }
    } catch (error) {
      console.error('❌ Error saving course:', error);
      // This is where we catch the validation error from the backend!
      setSubmitError(error.message || 'An unexpected error occurred. Please try again.');
    }
  };

  // --- RENDER ---
  
  if (!isOpen) return null;
  
  const isViewMode = mode === 'view';
  const isCreateMode = mode === 'create';
  const isLoading = parentIsLoading || uploadingImage || creatingCategory;
  
  const modalTitle = isCreateMode ? t('courses.createCourse') : (mode === 'edit' ? t('courses.editCourse') : t('courses.viewCourse'));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
          onClick={onClose}
        />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">{modalTitle}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Title, Image, Position, etc. (existing fields) */}

               {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.fields.title')} *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  disabled={isViewMode}
                  placeholder={t('courses.placeholders.title')}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.title}
                  </p>
                )}
              </div>

              {/* Image & Position Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Featured Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.fields.image')}
                  </label>
                  {imagePreview ? (
                    <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center">
                          <div className="w-3/4 bg-gray-200 rounded-full h-2 mb-2">
                            <div 
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-white text-sm">
                            {t('common.uploading')} {uploadProgress}%
                          </span>
                        </div>
                      )}
                      {!isViewMode && !uploadingImage && (
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-indigo-400 transition-colors">
                      {uploadingImage ? (
                        <div className="flex flex-col items-center">
                          <Upload className="h-12 w-12 text-indigo-600 mb-2 animate-pulse" />
                          <span className="text-sm text-gray-600">
                            {t('common.uploading')} {uploadProgress}%
                          </span>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                          {!isViewMode && (
                            <label className="cursor-pointer text-indigo-600 hover:text-indigo-700">
                              <span className="text-sm font-medium">
                                {t('courses.actions.uploadImage')}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={uploadingImage}
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {errors.featured_media && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.featured_media}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {t('courses.hints.image')}
                  </p>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.fields.position')}
                  </label>
                  <input
                    type="number"
                    value={formData._course_position}
                    onChange={(e) => handleInputChange('_course_position', e.target.value)}
                    disabled={isViewMode}
                    min="0"
                    placeholder="0"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors._course_position ? 'border-red-500' : 'border-gray-300'
                    } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  {errors._course_position && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors._course_position}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {t('courses.hints.position')}
                  </p>
                </div>
              </div>

              {/* Category with inline creation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('courses.fields.category')}
                  </label>
                  {!isViewMode && !showNewCategoryForm && (
                    <button
                      onClick={() => setShowNewCategoryForm(true)}
                      type="button"
                      className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      {t('courses.actions.addCategory')}
                    </button>
                  )}
                </div>
                
                {showNewCategoryForm && (
                  <div className="mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder={t('courses.placeholders.newCategory')}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            createNewCategory();
                          }
                        }}
                        disabled={creatingCategory}
                      />
                      <Button
                        size="sm"
                        onClick={createNewCategory}
                        disabled={!newCategoryName.trim() || creatingCategory}
                        isLoading={creatingCategory}
                      >
                        {t('common.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setShowNewCategoryForm(false);
                          setNewCategoryName('');
                        }}
                        disabled={creatingCategory}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
                
                <FilterDropdown
                  label=""
                  value={formData.qe_category[0] || ''}
                  onChange={handleCategoryChange}
                  options={categories}
                  placeholder={t('courses.category.all')}
                  isLoading={loadingCategories}
                  showSearch={true}
                />
              </div>

              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('courses.fields.productType')}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="product_type"
                      value="free"
                      checked={formData._product_type === 'free'}
                      onChange={() => handleProductTypeChange('free')}
                      disabled={isViewMode}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t('courses.priceFilter.free')}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="product_type"
                      value="paid"
                      checked={formData._product_type === 'paid'}
                      onChange={() => handleProductTypeChange('paid')}
                      disabled={isViewMode}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">
                      {t('courses.priceFilter.paid')}
                    </span>
                  </label>
                </div>
              </div>

              {/* Pricing - Only show if paid */}
              {formData._product_type === 'paid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('courses.fields.price')} *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData._price}
                        onChange={(e) => handleInputChange('_price', e.target.value)}
                        disabled={isViewMode}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={`w-full pr-8 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors._price ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">€</span>
                      </div>
                    </div>
                    {errors._price && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors._price}
                      </p>
                    )}
                  </div>

                  {/* Sale Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('courses.fields.salePrice')}
                      <span className="text-gray-500 text-xs ml-2">
                        ({t('courses.hints.optional')})
                      </span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={formData._sale_price}
                        onChange={(e) => handleInputChange('_sale_price', e.target.value)}
                        disabled={isViewMode}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={`w-full pr-8 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          errors._sale_price ? 'border-red-500' : 'border-gray-300'
                        } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 text-sm">€</span>
                      </div>
                    </div>
                     {errors._sale_price && (
                      <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors._sale_price}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      {t('courses.hints.salePrice')}
                    </p>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.fields.startDate')}
                  </label>
                  <input
                    type="date"
                    value={formData._start_date}
                    onChange={(e) => handleInputChange('_start_date', e.target.value)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isViewMode ? 'bg-gray-100' : 'bg-white'
                    }`}
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('courses.fields.endDate')}
                  </label>
                  <input
                    type="date"
                    value={formData._end_date}
                    onChange={(e) => handleInputChange('_end_date', e.target.value)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      errors._end_date ? 'border-red-500' : 'border-gray-300'
                    } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                  />
                  {errors._end_date && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors._end_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('courses.fields.description')} *
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  disabled={isViewMode}
                  placeholder={t('courses.placeholders.content')}
                  rows={6}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.content ? 'border-red-500' : 'border-gray-300'
                  } ${isViewMode ? 'bg-gray-100' : 'bg-white'}`}
                />
                {errors.content && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.content}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600 flex-1">
              {/* SERVER-SIDE ERROR DISPLAY */}
              {submitError && (
                <span className="text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {submitError}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isLoading}>
                {t('common.cancel')}
              </Button>
              
              {!isViewMode && (
                <>
                  {isCreateMode && (
                    <Button
                      variant="secondary"
                      onClick={() => handleSave('create')}
                      isLoading={isLoading}
                      iconLeft={Plus}
                    >
                      {t('courses.actions.saveAndCreate')}
                    </Button>
                  )}
                  
                  <Button
                    variant="primary"
                    onClick={() => handleSave('close')}
                    isLoading={isLoading}
                    iconLeft={Save}
                  >
                    {t('common.save')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseModal;