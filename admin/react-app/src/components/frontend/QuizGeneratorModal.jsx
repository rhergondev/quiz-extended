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

  // Función para ajustar el brillo del color
  const adjustColorBrightness = (color, percent) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const rgbToHsl = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) {
        h = s = 0;
      } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return [h * 360, s * 100, l * 100];
    };

    const hslToRgb = (h, s, l) => {
      h /= 360; s /= 100; l /= 100;
      let r, g, b;
      if (s === 0) {
        r = g = b = l;
      } else {
        const hue2rgb = (p, q, t) => {
          if (t < 0) t += 1;
          if (t > 1) t -= 1;
          if (t < 1/6) return p + (q - p) * 6 * t;
          if (t < 1/2) return q;
          if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
      }
      return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    };

    const [h, s, l] = rgbToHsl(r, g, b);
    const newL = Math.max(0, Math.min(100, l + (l * percent)));
    const [newR, newG, newB] = hslToRgb(h, s, newL);
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };

  const isLightColor = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
  };

  const getAdjustedPrimaryColor = () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--qe-primary')
      .trim();
    if (primaryColor && primaryColor.startsWith('#')) {
      const isLight = isLightColor(primaryColor);
      return adjustColorBrightness(primaryColor, isLight ? -0.05 : 0.05);
    }
    return primaryColor;
  };

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
    <>
      {/* Overlay oscuro */}
      <div 
        className="fixed inset-0 z-[60]" 
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="relative rounded-lg shadow-xl max-w-2xl w-full mx-auto pointer-events-auto"
          style={{ backgroundColor: 'var(--qe-bg-card)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="p-6 border-b qe-border-primary flex justify-between items-center"
            style={{ backgroundColor: getAdjustedPrimaryColor() }}
          >
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-white" />
            {isPracticeMode ? 'Configurar Práctica' : 'Configurar Cuestionario'}
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto" style={{ backgroundColor: '#FFFFFF' }}>
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
        
        <div 
          className="px-6 py-4 flex justify-end"
          style={{ backgroundColor: getAdjustedPrimaryColor() }}
        >
          <Button onClick={handleGenerateClick} disabled={isLoading} variant="ghost" className="text-white hover:bg-white hover:bg-opacity-20 transition-colors">
            {isLoading ? 'Cargando filtros...' : isPracticeMode ? 'Comenzar Práctica' : 'Generar Cuestionario'}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};


export default QuizGeneratorModal;