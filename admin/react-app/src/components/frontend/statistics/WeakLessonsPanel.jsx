// admin/react-app/src/components/frontend/statistics/WeakLessonsPanel.jsx

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { AlertTriangle, BookOpen, TrendingDown, Target, AlertCircle } from 'lucide-react';

const WeakLessonsPanel = ({ selectedCourse }) => {
  const { getColor } = useTheme();
  const [weakLessons, setWeakLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeakLessons();
  }, [selectedCourse]);

  const fetchWeakLessons = async () => {
    setLoading(true);
    
    // TODO: Implementar llamada a API real
    // Por ahora usamos datos de ejemplo
    setTimeout(() => {
      const fakeData = [
        {
          id: 1,
          lesson_title: 'Derecho Constitucional - Artículos 1-10',
          course_title: 'Curso de Oposiciones',
          total_questions: 45,
          failed_questions: 18,
          accuracy: 60.0,
          last_attempt: '2025-11-08'
        },
        {
          id: 2,
          lesson_title: 'Matemáticas Financieras Avanzadas',
          course_title: 'Matemáticas para Oposiciones',
          total_questions: 32,
          failed_questions: 14,
          accuracy: 56.3,
          last_attempt: '2025-11-09'
        },
        {
          id: 3,
          lesson_title: 'Legislación Laboral - Contratos',
          course_title: 'Derecho Laboral',
          total_questions: 28,
          failed_questions: 11,
          accuracy: 60.7,
          last_attempt: '2025-11-07'
        },
        {
          id: 4,
          lesson_title: 'Historia Contemporánea de España',
          course_title: 'Historia',
          total_questions: 40,
          failed_questions: 15,
          accuracy: 62.5,
          last_attempt: '2025-11-10'
        },
        {
          id: 5,
          lesson_title: 'Procedimiento Administrativo Común',
          course_title: 'Derecho Administrativo',
          total_questions: 35,
          failed_questions: 12,
          accuracy: 65.7,
          last_attempt: '2025-11-06'
        }
      ];

      // Filtrar por curso si está seleccionado
      const filteredData = selectedCourse 
        ? fakeData.filter(lesson => lesson.course_title === 'Curso seleccionado')
        : fakeData;

      setWeakLessons(filteredData);
      setLoading(false);
    }, 500);
  };

  const getAccuracyColor = (accuracy) => {
    if (accuracy >= 70) return '#10b981'; // Verde - mantener
    if (accuracy >= 50) return getColor('accent', '#f59e0b'); // Amarillo/Accent
    return '#ef4444'; // Rojo - mantener
  };

  const getUrgencyLevel = (accuracy) => {
    if (accuracy < 50) return { label: 'Urgente', color: '#ef4444' }; // Rojo
    if (accuracy < 65) return { label: 'Importante', color: getColor('accent', '#f59e0b') }; // Accent
    return { label: 'Revisar', color: getColor('primary', '#3b82f6') }; // Primary
  };

  if (loading) {
    return (
      <div 
        className="p-6 rounded-xl shadow-lg animate-pulse border-2"
        style={{ 
          backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
          borderColor: getColor('primary', '#3b82f6')
        }}
      >
        <div className="h-8 bg-gray-300 rounded mb-4 w-1/2"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-6 rounded-xl shadow-lg border-2"
      style={{ 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
        <AlertTriangle className="w-6 h-6" style={{ color: getColor('accent', '#f59e0b') }} />
        <h2 className="text-xl font-bold qe-text-primary">Lecciones a Repasar</h2>
      </div>

      {weakLessons.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <BookOpen className="w-16 h-16 mx-auto opacity-20 qe-text-secondary" />
          </div>
          <p className="text-lg font-semibold qe-text-primary mb-2">¡Excelente trabajo!</p>
          <p className="qe-text-secondary">
            No tienes lecciones que requieran atención especial
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {weakLessons.map((lesson, index) => {
            const urgency = getUrgencyLevel(lesson.accuracy);
            const accuracyColor = getAccuracyColor(lesson.accuracy);
            
            return (
              <div 
                key={lesson.id}
                className="p-4 rounded-lg border-l-4 transition-all hover:shadow-md cursor-pointer"
                style={{ 
                  backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
                  borderLeftColor: urgency.color
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0">
                    {/* Cabecera con número y título */}
                    <div className="flex items-start gap-3 mb-2">
                      <div 
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{ 
                          backgroundColor: urgency.color + '20',
                          color: urgency.color
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base qe-text-primary mb-1 line-clamp-1">
                          {lesson.lesson_title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs qe-text-secondary">
                          <BookOpen className="w-3 h-3" />
                          <span className="truncate">{lesson.course_title}</span>
                        </div>
                      </div>
                    </div>

                    {/* Estadísticas */}
                    <div className="grid grid-cols-3 gap-3 mt-3">
                      <div className="text-center p-2 rounded" style={{ backgroundColor: getColor('background', '#ffffff') }}>
                        <p className="text-xs qe-text-secondary mb-0.5">Total</p>
                        <p className="text-lg font-bold qe-text-primary">{lesson.total_questions}</p>
                      </div>
                      <div className="text-center p-2 rounded" style={{ backgroundColor: '#fef2f2' }}>
                        <p className="text-xs qe-text-secondary mb-0.5">Falladas</p>
                        <p className="text-lg font-bold" style={{ color: '#ef4444' }}>
                          {lesson.failed_questions}
                        </p>
                      </div>
                      <div className="text-center p-2 rounded" style={{ backgroundColor: accuracyColor + '15' }}>
                        <p className="text-xs qe-text-secondary mb-0.5">Precisión</p>
                        <p className="text-lg font-bold" style={{ color: accuracyColor }}>
                          {lesson.accuracy}%
                        </p>
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3">
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${lesson.accuracy}%`,
                            backgroundColor: accuracyColor
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Badge de urgencia */}
                  <div className="flex-shrink-0">
                    <div 
                      className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{ 
                        backgroundColor: urgency.color + '20',
                        color: urgency.color
                      }}
                    >
                      <AlertCircle className="w-3 h-3" />
                      {urgency.label}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info adicional */}
      {weakLessons.length > 0 && (
        <div className="mt-6 p-4 rounded-lg border-l-4" style={{ 
          backgroundColor: getColor('primary', '#3b82f6') + '10',
          borderLeftColor: getColor('primary', '#3b82f6')
        }}>
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: getColor('primary', '#3b82f6') }} />
            <div>
              <p className="font-bold qe-text-primary mb-1">
                💡 Recomendación de Estudio
              </p>
              <p className="text-sm qe-text-secondary">
                Enfócate primero en las lecciones marcadas como "Urgente". 
                Repasa el material teórico y practica con más cuestionarios de estas lecciones 
                para mejorar tu precisión antes de continuar.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeakLessonsPanel;
