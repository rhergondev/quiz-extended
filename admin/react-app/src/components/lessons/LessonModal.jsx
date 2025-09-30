import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Plus, Trash2, GripVertical, Video, FileText, Download, 
  HelpCircle, FileImage, Volume2, Save, Eye, AlertCircle,
  ChevronDown, ChevronUp, Settings, Clock
} from 'lucide-react';

// 🔧 CAMBIO: Usar @dnd-kit en lugar de react-beautiful-dnd
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QuizSingleSelector from '../common/QuizSingleSelector';

const LessonModal = ({
  isOpen,
  onClose,
  lesson = null,
  onSave,
  mode = 'create',
  availableCourses = [],
  isLoading = false
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    courseId: '',
    lessonType: 'mixed',
    description: '',
    lessonOrder: '1',
    prerequisiteLessons: '',
    completionCriteria: 'view_all',
    isRequired: false,
    status: 'draft',
    steps: []
  });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  // Step creation state
  const [showStepCreator, setShowStepCreator] = useState(false);
  const [newStep, setNewStep] = useState({
    type: 'text',
    title: '',
    data: {}
  });

  // 🔧 CAMBIO: Configurar sensores para @dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize form with lesson data
  useEffect(() => {
    if (lesson && mode !== 'create') {
      console.log('🔄 Initializing form with lesson data:', lesson);
      setFormData({
        title: lesson.title?.rendered || lesson.title || '',
        content: lesson.content?.rendered || lesson.content || '',
        courseId: lesson.meta?._course_id || '',
        lessonType: lesson.meta?._lesson_type || 'mixed',
        description: lesson.meta?._lesson_description || '',
        lessonOrder: lesson.meta?._lesson_order || '1',
        prerequisiteLessons: lesson.meta?._prerequisite_lessons || '',
        completionCriteria: lesson.meta?._completion_criteria || 'view_all',
        isRequired: lesson.meta?._is_required === 'yes',
        status: lesson.status || 'draft',
        steps: lesson.meta?._lesson_steps || []
      });
    }
  }, [lesson, mode]);

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.courseId) {
      newErrors.courseId = 'Course selection is required';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'At least one step is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleSave = async (nextAction = 'close') => {
    if (!validateForm()) {
      console.log('❌ Form validation failed:', errors);
      return;
    }

    try {
      console.log('💾 Saving lesson with next action:', nextAction);
      await onSave(formData, nextAction);
    } catch (error) {
      console.error('❌ Save failed:', error);
    }
  };

  // Step management functions
  const generateStepId = () => {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addStep = (stepData) => {
    const newStepWithId = {
      ...stepData,
      id: generateStepId(),
      order: formData.steps.length + 1,
      required: false
    };

    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, newStepWithId]
    }));

    setShowStepCreator(false);
    setNewStep({ type: 'text', title: '', data: {} });
    console.log('✅ Step added:', newStepWithId);
  };

  const removeStep = (stepId) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, order: index + 1 }))
    }));
    console.log('🗑️ Step removed:', stepId);
  };

  const updateStep = (stepId, updates) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
    console.log('📝 Step updated:', stepId, updates);
  };

  // 🔧 CAMBIO: Manejar drag end con @dnd-kit
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = formData.steps.findIndex(step => step.id === active.id);
      const newIndex = formData.steps.findIndex(step => step.id === over.id);
      
      const newSteps = arrayMove(formData.steps, oldIndex, newIndex);
      
      // Update order numbers
      const updatedSteps = newSteps.map((step, index) => ({
        ...step,
        order: index + 1
      }));

      setFormData(prev => ({
        ...prev,
        steps: updatedSteps
      }));

      console.log('🔄 Steps reordered');
    }
  };

  // Step type configurations
  const stepTypes = {
    video: {
      label: 'Video',
      icon: Video,
      color: 'text-blue-600 bg-blue-50',
      fields: ['video_url', 'duration', 'autoplay', 'subtitles_url']
    },
    text: {
      label: 'Text Content',
      icon: FileText,
      color: 'text-green-600 bg-green-50',
      fields: ['content', 'estimated_time']
    },
    pdf: {
      label: 'PDF Document',
      icon: Download,
      color: 'text-red-600 bg-red-50',
      fields: ['file_url', 'file_name', 'file_size', 'downloadable']
    },
    quiz: {
      label: 'Quiz',
      icon: HelpCircle,
      color: 'text-purple-600 bg-purple-50',
      fields: ['quiz_id', 'passing_score', 'max_attempts', 'required']
    },
    image: {
      label: 'Image',
      icon: FileImage,
      color: 'text-orange-600 bg-orange-50',
      fields: ['image_url', 'alt_text', 'caption', 'lightbox']
    },
    audio: {
      label: 'Audio',
      icon: Volume2,
      color: 'text-indigo-600 bg-indigo-50',
      fields: ['audio_url', 'duration', 'transcript_url']
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {mode === 'create' ? 'Create New Lesson' : 
                   mode === 'edit' ? 'Edit Lesson' : 'View Lesson'}
                </h3>
                {lesson && (
                  <p className="text-sm text-gray-500 mt-1">
                    ID: {lesson.id} • {formData.steps.length} steps
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-4">
              <nav className="flex space-x-8" aria-label="Tabs">
                {[
                  { id: 'basic', name: 'Basic Info', icon: Settings },
                  { id: 'steps', name: `Content Steps (${formData.steps.length})`, icon: FileText },
                  { id: 'settings', name: 'Settings', icon: Settings }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`${
                        activeTab === tab.id
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 max-h-[60vh] overflow-y-auto">
            
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Title */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter lesson title..."
                      disabled={mode === 'view'}
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                    )}
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course *
                    </label>
                    <select
                      value={formData.courseId}
                      onChange={(e) => handleInputChange('courseId', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.courseId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={mode === 'view'}
                    >
                      <option value="">Select a course...</option>
                      {availableCourses.map(course => (
                        <option key={course.value} value={course.value}>
                          {course.label}
                        </option>
                      ))}
                    </select>
                    {errors.courseId && (
                      <p className="mt-1 text-sm text-red-600">{errors.courseId}</p>
                    )}
                  </div>

                  {/* Lesson Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Type
                    </label>
                    <select
                      value={formData.lessonType}
                      onChange={(e) => handleInputChange('lessonType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={mode === 'view'}
                    >
                      <option value="video">Video</option>
                      <option value="text">Text</option>
                      <option value="mixed">Mixed Content</option>
                      <option value="quiz">Quiz</option>
                      <option value="interactive">Interactive</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of the lesson..."
                    disabled={mode === 'view'}
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lesson Overview Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => handleInputChange('content', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Overview content for the lesson (optional)..."
                    disabled={mode === 'view'}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This content appears before the lesson steps. HTML is supported.
                  </p>
                </div>
              </div>
            )}

            {/* Steps Tab */}
            {activeTab === 'steps' && (
              <div className="space-y-6">
                {/* Steps Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Content Steps</h4>
                    <p className="text-sm text-gray-500">
                      Add and organize content steps for this lesson
                    </p>
                  </div>
                  {mode !== 'view' && (
                    <button
                      onClick={() => setShowStepCreator(true)}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Step
                    </button>
                  )}
                </div>

                {/* Error for steps */}
                {errors.steps && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
                      <p className="text-sm text-red-700">{errors.steps}</p>
                    </div>
                  </div>
                )}

                {/* Steps List */}
                {formData.steps.length > 0 ? (
                  // 🔧 CAMBIO: Usar DndContext de @dnd-kit
                  <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext 
                      items={formData.steps.map(step => step.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {formData.steps.map((step, index) => (
                          <SortableStepCard
                            key={step.id}
                            step={step}
                            index={index}
                            stepTypes={stepTypes}
                            onUpdate={(updates) => updateStep(step.id, updates)}
                            onRemove={() => removeStep(step.id)}
                            isViewMode={mode === 'view'}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No steps added</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by adding your first content step.
                    </p>
                    {mode !== 'view' && (
                      <div className="mt-6">
                        <button
                          onClick={() => setShowStepCreator(true)}
                          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Step
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Step Creator Modal */}
                {showStepCreator && (
                  <StepCreatorModal
                    isOpen={showStepCreator}
                    onClose={() => {
                      setShowStepCreator(false);
                      setNewStep({ type: 'text', title: '', data: {} });
                    }}
                    onSave={addStep}
                    stepTypes={stepTypes}
                    newStep={newStep}
                    setNewStep={setNewStep}
                  />
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lesson Order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Lesson Order
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.lessonOrder}
                      onChange={(e) => handleInputChange('lessonOrder', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={mode === 'view'}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Order of this lesson within the course
                    </p>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={mode === 'view'}
                    >
                      <option value="draft">Draft</option>
                      <option value="publish">Published</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  {/* Completion Criteria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Criteria
                    </label>
                    <select
                      value={formData.completionCriteria}
                      onChange={(e) => handleInputChange('completionCriteria', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={mode === 'view'}
                    >
                      <option value="view_all">View All Steps</option>
                      <option value="complete_required">Complete Required Steps</option>
                      <option value="pass_quiz">Pass Quiz Steps</option>
                      <option value="manual">Manual Completion</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      How students complete this lesson
                    </p>
                  </div>

                  {/* Required Lesson Toggle */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="is-required"
                        type="checkbox"
                        checked={formData.isRequired}
                        onChange={(e) => handleInputChange('isRequired', e.target.checked)}
                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        disabled={mode === 'view'}
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="is-required" className="font-medium text-gray-700">
                        Required Lesson
                      </label>
                      <p className="text-gray-500">
                        Students must complete this lesson to progress
                      </p>
                    </div>
                  </div>
                </div>

                {/* Prerequisite Lessons */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prerequisite Lessons
                  </label>
                  <input
                    type="text"
                    value={formData.prerequisiteLessons}
                    onChange={(e) => handleInputChange('prerequisiteLessons', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Comma-separated lesson IDs (e.g., 123, 456)"
                    disabled={mode === 'view'}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Lessons that must be completed before this one (optional)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {mode !== 'view' && (
                  <>
                    <button
                      onClick={() => handleSave('close')}
                      disabled={isLoading}
                      className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save & Close
                    </button>
                    
                    {mode === 'create' && (
                      <button
                        onClick={() => handleSave('create')}
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Save & Create New
                      </button>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {mode === 'view' ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// 🔧 CAMBIO: Nuevo componente que usa useSortable
const SortableStepCard = ({ step, index, stepTypes, onUpdate, onRemove, isViewMode }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white border border-gray-200 rounded-lg p-4 ${
        isDragging ? 'shadow-lg opacity-50' : 'hover:shadow-sm'
      } transition-shadow`}
    >
      <StepCard
        step={step}
        index={index}
        stepTypes={stepTypes}
        onUpdate={onUpdate}
        onRemove={onRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        isViewMode={isViewMode}
      />
    </div>
  );
};

// --- STEP CARD COMPONENT ---
const StepCard = ({ step, index, stepTypes, onUpdate, onRemove, dragHandleProps, isViewMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const stepType = stepTypes[step.type];
  const Icon = stepType?.icon || FileText;

  return (
    <div className="space-y-3">
      {/* Step Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!isViewMode && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-gray-400" />
            </div>
          )}
          
          <span className="flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            {step.order || index + 1}
          </span>
          
          <div className={`p-2 rounded-md ${stepType?.color || 'text-gray-600 bg-gray-50'}`}>
            <Icon className="h-4 w-4" />
          </div>
          
          <div className="flex-1">
            <h5 className="text-sm font-medium text-gray-900">{step.title}</h5>
            <p className="text-xs text-gray-500 capitalize">{stepType?.label || step.type}</p>
          </div>
          
          {step.required && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Required
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {!isViewMode && (
            <button
              onClick={onRemove}
              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Step Content (Expandable) */}
      {isExpanded && (
        <div className="pl-8 space-y-3 border-l-2 border-gray-100">
          <StepEditor
            step={step}
            stepType={stepType}
            onUpdate={onUpdate}
            isViewMode={isViewMode}
          />
        </div>
      )}
    </div>
  );
};

// --- STEP EDITOR COMPONENT ---
const StepEditor = ({ step, stepType, onUpdate, isViewMode }) => {
  const handleDataChange = (field, value) => {
    onUpdate({
      data: {
        ...step.data,
        [field]: value
      }
    });
  };

  const handleBasicChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Basic Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Step Title</label>
          <input
            type="text"
            value={step.title}
            onChange={(e) => handleBasicChange('title', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            disabled={isViewMode}
          />
        </div>
        
        <div className="flex items-center">
          <input
            id={`required-${step.id}`}
            type="checkbox"
            checked={step.required || false}
            onChange={(e) => handleBasicChange('required', e.target.checked)}
            className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isViewMode}
          />
          <label htmlFor={`required-${step.id}`} className="ml-2 text-xs text-gray-700">
            Required step
          </label>
        </div>
      </div>

      {/* Type-specific Fields */}
      <div className="grid grid-cols-1 gap-4">
        {step.type === 'video' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Video URL</label>
              <input
                type="url"
                value={step.data?.video_url || ''}
                onChange={(e) => handleDataChange('video_url', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
                disabled={isViewMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  value={step.data?.duration || ''}
                  onChange={(e) => handleDataChange('duration', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  disabled={isViewMode}
                />
              </div>
              <div className="flex items-center">
                <input
                  id={`autoplay-${step.id}`}
                  type="checkbox"
                  checked={step.data?.autoplay || false}
                  onChange={(e) => handleDataChange('autoplay', e.target.checked)}
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isViewMode}
                />
                <label htmlFor={`autoplay-${step.id}`} className="ml-2 text-xs text-gray-700">
                  Autoplay
                </label>
              </div>
            </div>
          </>
        )}

        {step.type === 'text' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={step.data?.content || ''}
                onChange={(e) => handleDataChange('content', e.target.value)}
                rows={4}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="Enter text content... HTML is supported."
                disabled={isViewMode}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Reading Time (minutes)</label>
              <input
                type="number"
                min="1"
                value={step.data?.estimated_time || ''}
                onChange={(e) => handleDataChange('estimated_time', parseInt(e.target.value) || 5)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                disabled={isViewMode}
              />
            </div>
          </>
        )}

        {step.type === 'pdf' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">PDF File URL</label>
              <input
                type="url"
                value={step.data?.file_url || ''}
                onChange={(e) => handleDataChange('file_url', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
                disabled={isViewMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">File Name</label>
                <input
                  type="text"
                  value={step.data?.file_name || ''}
                  onChange={(e) => handleDataChange('file_name', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="document.pdf"
                  disabled={isViewMode}
                />
              </div>
              <div className="flex items-center">
                <input
                  id={`downloadable-${step.id}`}
                  type="checkbox"
                  checked={step.data?.downloadable !== false}
                  onChange={(e) => handleDataChange('downloadable', e.target.checked)}
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isViewMode}
                />
                <label htmlFor={`downloadable-${step.id}`} className="ml-2 text-xs text-gray-700">
                  Allow download
                </label>
              </div>
            </div>
          </>
        )}

        {/* 🔧 CAMBIO: Usar QuizSelector para steps de quiz */}
        {step.type === 'quiz' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Select Quiz *
              </label>
              <QuizSingleSelector
                value={step.data?.quiz_id || ''}
                onChange={(quizId) => handleDataChange('quiz_id', quizId)}
                placeholder="Choose a quiz for this step..."
                disabled={isViewMode}
                showSearch={true}
                showCourseFilter={true}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the quiz that students will complete in this step
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Passing Score (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={step.data?.passing_score || '70'}
                  onChange={(e) => handleDataChange('passing_score', parseInt(e.target.value) || 70)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Attempts</label>
                <input
                  type="number"
                  min="1"
                  value={step.data?.max_attempts || '3'}
                  onChange={(e) => handleDataChange('max_attempts', parseInt(e.target.value) || 3)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  disabled={isViewMode}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Time (minutes)</label>
                <input
                  type="number"
                  min="1"
                  value={step.data?.estimated_time || '10'}
                  onChange={(e) => handleDataChange('estimated_time', parseInt(e.target.value) || 10)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  disabled={isViewMode}
                />
              </div>
              <div className="flex items-center">
                <input
                  id={`quiz-required-${step.id}`}
                  type="checkbox"
                  checked={step.data?.required !== false}
                  onChange={(e) => handleDataChange('required', e.target.checked)}
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isViewMode}
                />
                <label htmlFor={`quiz-required-${step.id}`} className="ml-2 text-xs text-gray-700">
                  Must pass to continue
                </label>
              </div>
            </div>
          </>
        )}

        {step.type === 'image' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Image URL</label>
              <input
                type="url"
                value={step.data?.image_url || ''}
                onChange={(e) => handleDataChange('image_url', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
                disabled={isViewMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Alt Text</label>
                <input
                  type="text"
                  value={step.data?.alt_text || ''}
                  onChange={(e) => handleDataChange('alt_text', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="Description for accessibility"
                  disabled={isViewMode}
                />
              </div>
              <div className="flex items-center">
                <input
                  id={`lightbox-${step.id}`}
                  type="checkbox"
                  checked={step.data?.lightbox || false}
                  onChange={(e) => handleDataChange('lightbox', e.target.checked)}
                  className="h-3 w-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isViewMode}
                />
                <label htmlFor={`lightbox-${step.id}`} className="ml-2 text-xs text-gray-700">
                  Enable lightbox
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Caption</label>
              <textarea
                value={step.data?.caption || ''}
                onChange={(e) => handleDataChange('caption', e.target.value)}
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="Optional image caption"
                disabled={isViewMode}
              />
            </div>
          </>
        )}

        {step.type === 'audio' && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Audio URL</label>
              <input
                type="url"
                value={step.data?.audio_url || ''}
                onChange={(e) => handleDataChange('audio_url', e.target.value)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                placeholder="https://..."
                disabled={isViewMode}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  value={step.data?.duration || ''}
                  onChange={(e) => handleDataChange('duration', parseInt(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Transcript URL</label>
                <input
                  type="url"
                  value={step.data?.transcript_url || ''}
                  onChange={(e) => handleDataChange('transcript_url', e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="https://... (optional)"
                  disabled={isViewMode}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// --- STEP CREATOR MODAL ---
const StepCreatorModal = ({ isOpen, onClose, onSave, stepTypes, newStep, setNewStep }) => {
  const handleSave = () => {
    if (!newStep.title.trim()) {
      alert('Please enter a step title');
      return;
    }
    
    onSave(newStep);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Add New Step
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Step Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(stepTypes).map(([type, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={type}
                            onClick={() => setNewStep(prev => ({ ...prev, type }))}
                            className={`p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                              newStep.type === type ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className={`p-1 rounded ${config.color}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-medium">{config.label}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Step Title
                    </label>
                    <input
                      type="text"
                      value={newStep.title}
                      onChange={(e) => setNewStep(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter step title..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSave}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Add Step
            </button>
            <button
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonModal;