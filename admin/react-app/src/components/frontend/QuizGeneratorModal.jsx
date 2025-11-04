import React, { useState } from 'react';
import { X, Sliders } from 'lucide-react';
import Button from '../common/Button';
import FilterDropdown from '../common/FilterDropdown';

const QuizGeneratorModal = ({
  isOpen,
  onClose,
  onGenerate,
  courses,
  lessons,
  categories,
  difficulties,
  isLoading,
  isPracticeMode = false
}) => {
  const [filters, setFilters] = useState({
    course: 'all',
    lesson: 'all',
    category: 'all',
    difficulty: 'all',
    numQuestions: 10,
    timeLimit: 0,
  });

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const courseOptions = [{ value: 'all', label: 'Todos los Cursos' }, ...courses.map(c => ({ value: c.id, label: c.title.rendered || c.title }))];
  const lessonOptions = [{ value: 'all', label: 'Todas las Lecciones' }, ...lessons.map(l => ({ value: l.id, label: l.title.rendered || l.title }))];

  const handleGenerateClick = () => {
    onGenerate(filters);
  };

  const renderSelect = (label, name, value, onChange, options, disabled = false) => (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className="w-full h-10 pl-3 pr-6 text-base placeholder-gray-600 border rounded-lg appearance-none focus:shadow-outline-blue focus:border-blue-300"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            {isPracticeMode ? 'Configurar Práctica' : 'Configurar Cuestionario'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Usamos el nuevo renderSelect para cada dropdown */}
          {renderSelect('Filtrar por Curso', 'course', filters.course, handleFilterChange, courseOptions, isLoading)}
          {renderSelect('Filtrar por Lección', 'lesson', filters.lesson, handleFilterChange, lessonOptions, isLoading)}
          {renderSelect('Filtrar por Categoría', 'category', filters.category, handleFilterChange, categories, isLoading)}
          {renderSelect('Filtrar por Dificultad', 'difficulty', filters.difficulty, handleFilterChange, difficulties, isLoading)}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Preguntas
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={filters.numQuestions}
                onChange={(e) => handleFilterChange('numQuestions', parseInt(e.target.value, 10))}
                className="w-full h-10 px-3 text-base placeholder-gray-600 border rounded-lg focus:shadow-outline-blue focus:border-blue-300"
              />
            </div>
            {!isPracticeMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Límite de Tiempo (minutos)
                </label>
                <input
                  type="number"
                  min="0"
                  value={filters.timeLimit}
                  onChange={(e) => handleFilterChange('timeLimit', parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 text-base placeholder-gray-600 border rounded-lg focus:shadow-outline-blue focus:border-blue-300"
                  placeholder="0 para ilimitado"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <Button onClick={handleGenerateClick} disabled={isLoading}>
            {isLoading ? 'Cargando filtros...' : isPracticeMode ? 'Comenzar Práctica' : 'Generar Cuestionario'}
          </Button>
        </div>
      </div>
    </div>
  );
};


export default QuizGeneratorModal;