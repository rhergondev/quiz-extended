import React, { useState } from 'react';
import { X, Sliders } from 'lucide-react';
import Button from '../common/Button';
import FilterDropdown from '../common/FilterDropdown';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { getColor } = useTheme();
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
      <label htmlFor={name} className="block text-sm font-medium qe-text-primary mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        disabled={disabled}
        className="w-full h-10 pl-3 pr-6 text-base border-2 rounded-lg appearance-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}
        onFocus={(e) => {
          if (!disabled) {
            e.currentTarget.style.borderColor = getColor('primary', '#3b82f6');
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = getColor('primary', '#3b82f6') + '30';
        }}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="fixed inset-0" onClick={onClose}></div>
      
      {/* Modal centrado tipo widget */}
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] rounded-xl shadow-lg border-2 flex flex-col"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
          borderColor: getColor('primary', '#3b82f6')
        }}
      >
        {/* Header del modal */}
        <div 
          className="p-6 border-b-2 flex items-center justify-between flex-shrink-0" 
          style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}
        >
          <h3 className="text-2xl font-bold qe-text-primary flex items-center gap-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: getColor('primary', '#3b82f6') + '20' }}
            >
              <Sliders className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
            </div>
            {isPracticeMode ? 'Configurar Práctica' : 'Configurar Cuestionario'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg transition-all"
            style={{ backgroundColor: getColor('primary', '#3b82f6') + '15' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '25';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '15';
            }}
            title="Cerrar"
          >
            <X className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
          </button>
        </div>

        {/* Contenido del modal con scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* Usamos el nuevo renderSelect para cada dropdown */}
            {renderSelect('Filtrar por Curso', 'course', filters.course, handleFilterChange, courseOptions, isLoading)}
            {renderSelect('Filtrar por Lección', 'lesson', filters.lesson, handleFilterChange, lessonOptions, isLoading)}
            {renderSelect('Filtrar por Categoría', 'category', filters.category, handleFilterChange, categories, isLoading)}
            {renderSelect('Filtrar por Dificultad', 'difficulty', filters.difficulty, handleFilterChange, difficulties, isLoading)}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium qe-text-primary mb-2">
                  Número de Preguntas
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={filters.numQuestions}
                  onChange={(e) => handleFilterChange('numQuestions', parseInt(e.target.value, 10))}
                  className="w-full h-10 px-3 text-base border-2 rounded-lg transition-colors"
                  style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = getColor('primary', '#3b82f6');
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = getColor('primary', '#3b82f6') + '30';
                  }}
                />
              </div>
              {!isPracticeMode && (
                <div>
                  <label className="block text-sm font-medium qe-text-primary mb-2">
                    Límite de Tiempo (minutos)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={filters.timeLimit}
                    onChange={(e) => handleFilterChange('timeLimit', parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 text-base border-2 rounded-lg transition-colors"
                    style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}
                    placeholder="0 para ilimitado"
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = getColor('primary', '#3b82f6');
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = getColor('primary', '#3b82f6') + '30';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer con botones */}
        <div 
          className="p-4 border-t-2 flex justify-center gap-3 flex-shrink-0" 
          style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}
        >
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-semibold transition-all border-2"
            style={{ 
              borderColor: getColor('primary', '#3b82f6') + '30',
              color: getColor('primary', '#3b82f6')
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = getColor('primary', '#3b82f6') + '10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerateClick}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: getColor('primary', '#3b82f6')
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isLoading ? 'Cargando filtros...' : isPracticeMode ? 'Comenzar Práctica' : 'Generar Cuestionario'}
          </button>
        </div>
      </div>
    </div>
  );
};


export default QuizGeneratorModal;