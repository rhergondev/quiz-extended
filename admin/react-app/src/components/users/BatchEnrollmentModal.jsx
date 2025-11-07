import React, { useState, useMemo } from 'react';
import { X, Users, BookOpen, CheckCircle, Search } from 'lucide-react';
import QEButton from '../common/QEButton';

/**
 * Modal para inscripción masiva de usuarios en cursos
 */
const BatchEnrollmentModal = ({ 
  selectedUserIds = [], 
  availableCourses = [], 
  onSubmit, 
  onClose 
}) => {
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar cursos por término de búsqueda
  const filteredCourses = useMemo(() => {
    if (!searchTerm) return availableCourses;
    
    return availableCourses.filter(course =>
      course.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableCourses, searchTerm]);

  // Manejar selección de curso
  const handleToggleCourse = (courseId) => {
    setSelectedCourseIds(prev => {
      if (prev.includes(courseId)) {
        return prev.filter(id => id !== courseId);
      } else {
        return [...prev, courseId];
      }
    });
  };

  // Seleccionar todos los cursos filtrados
  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredCourses.map(c => c.value);
    const allSelected = allFilteredIds.every(id => selectedCourseIds.includes(id));
    
    if (allSelected) {
      // Deseleccionar todos los filtrados
      setSelectedCourseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      // Seleccionar todos los filtrados (sin duplicar)
      setSelectedCourseIds(prev => {
        const newIds = allFilteredIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      });
    }
  };

  // Verificar si todos los cursos filtrados están seleccionados
  const allFilteredSelected = useMemo(() => {
    if (filteredCourses.length === 0) return false;
    return filteredCourses.every(course => selectedCourseIds.includes(course.value));
  }, [filteredCourses, selectedCourseIds]);

  // Manejar envío
  const handleSubmit = async () => {
    if (selectedCourseIds.length === 0) {
      alert('Please select at least one course');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(selectedCourseIds);
    } catch (error) {
      console.error('Error submitting batch enrollment:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 bg-white bg-opacity-20 rounded-full p-2">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Batch Enrollment
                  </h3>
                  <p className="text-sm text-blue-100">
                    Enroll {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} in courses
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-blue-100 transition-colors"
                disabled={isSubmitting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Summary */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      <strong>{selectedUserIds.length}</strong> user{selectedUserIds.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      <strong>{selectedCourseIds.length}</strong> course{selectedCourseIds.length !== 1 ? 's' : ''} selected
                    </span>
                  </div>
                </div>
                {selectedCourseIds.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Total enrollments: <strong>{selectedUserIds.length * selectedCourseIds.length}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Select All */}
            <div className="mb-3 flex items-center justify-between px-2">
              <button
                onClick={handleSelectAllFiltered}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {allFilteredSelected ? 'Deselect All' : 'Select All'} ({filteredCourses.length})
              </button>
              {searchTerm && (
                <span className="text-xs text-gray-500">
                  Showing {filteredCourses.length} of {availableCourses.length} courses
                </span>
              )}
            </div>

            {/* Course List */}
            <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
              {filteredCourses.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No courses found</p>
                  {searchTerm && (
                    <p className="text-sm text-gray-400 mt-1">
                      Try adjusting your search terms
                    </p>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredCourses.map((course) => {
                    const isSelected = selectedCourseIds.includes(course.value);
                    
                    return (
                      <button
                        key={course.value}
                        onClick={() => handleToggleCourse(course.value)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center justify-between ${
                          isSelected ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div
                            className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-300'
                            }`}
                          >
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-white" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {course.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedCourseIds.length > 0 && (
                <span>
                  Ready to create <strong>{selectedUserIds.length * selectedCourseIds.length}</strong> enrollment{selectedUserIds.length * selectedCourseIds.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <QEButton
                onClick={onClose}
                variant="ghost"
                disabled={isSubmitting}
              >
                Cancel
              </QEButton>
              <QEButton
                onClick={handleSubmit}
                variant="primary"
                disabled={selectedCourseIds.length === 0 || isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Processing...' : `Enroll in ${selectedCourseIds.length} Course${selectedCourseIds.length !== 1 ? 's' : ''}`}
              </QEButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchEnrollmentModal;
