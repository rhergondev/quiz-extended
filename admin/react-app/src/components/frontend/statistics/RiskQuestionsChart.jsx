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
    if (accuracy >= 70) return '#10b981';
    if (accuracy >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getUrgencyLevel = (accuracy) => {
    if (accuracy < 50) return { label: 'Urgente', color: '#ef4444' };
    if (accuracy < 65) return { label: 'Importante', color: '#f59e0b' };
    return { label: 'Revisar', color: '#3b82f6' };
  };

  if (loading) {
    return (
      <div 
        className="p-6 rounded-xl shadow-lg"
        style={{ backgroundColor: getColor('background', '#ffffff') }}
      >
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" 
               style={{ borderColor: getColor('primary', '#3b82f6') }}></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-6 rounded-xl shadow-lg"
      style={{ backgroundColor: getColor('background', '#ffffff') }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6" style={{ color: '#f59e0b' }} />
          <h2 className="text-2xl font-bold qe-text-primary">
            Lecciones a Revisar
          </h2>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full" 
             style={{ backgroundColor: '#fef3c7' }}>
          <Target className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold" style={{ color: '#92400e' }}>
            {weakLessons.length} lecciones
          </span>
        </div>
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
          backgroundColor: '#eff6ff',
          borderLeftColor: '#3b82f6'
        }}>
          <div className="flex items-start gap-3">
            <TrendingDown className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
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

  // Simulación de datos de riesgo
  // Alto Riesgo: Preguntas falladas múltiples veces
  // Medio Riesgo: Preguntas con 1-2 fallos
  // Bajo Riesgo / Seguras: Preguntas siempre correctas
  const data = [
    { 
      label: 'Alto Riesgo', 
      value: 12, // Preguntas que fallan consistentemente
      color: '#ef4444',
      icon: AlertTriangle,
      description: 'Requieren más estudio'
    },
    { 
      label: 'Riesgo Medio', 
      value: 28, // Preguntas con fallos ocasionales
      color: '#f59e0b',
      icon: AlertCircle,
      description: 'Revisar ocasionalmente'
    },
    { 
      label: 'Seguras', 
      value: 55, // Preguntas dominadas
      color: '#10b981',
      icon: Shield,
      description: 'Bien dominadas'
    },
  ];

  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Calculate angles for donut chart
  let currentAngle = -90; // Start from top
  const segments = data.map((item, index) => {
    const percentage = total > 0 ? (item.value / total) * 100 : 0;
    const angle = (percentage / 100) * 360;
    const segment = {
      ...item,
      percentage,
      startAngle: currentAngle,
      endAngle: currentAngle + angle,
      index
    };
    currentAngle += angle;
    return segment;
  });

  const createArc = (startAngle, endAngle, innerRadius, outerRadius) => {
    const start = polarToCartesian(50, 50, outerRadius, endAngle);
    const end = polarToCartesian(50, 50, outerRadius, startAngle);
    const innerStart = polarToCartesian(50, 50, innerRadius, endAngle);
    const innerEnd = polarToCartesian(50, 50, innerRadius, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    
    return [
      `M ${start.x} ${start.y}`,
      `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  return (
    <div 
      className="p-6 rounded-xl shadow-lg"
      style={{ backgroundColor: getColor('background', '#ffffff') }}
    >
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
        <h2 className="text-2xl font-bold qe-text-primary">
          Preguntas por Nivel de Riesgo
        </h2>
      </div>

      <div className="flex flex-col lg:flex-row items-center gap-6">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0 w-64 h-64">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Shadow/Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="16"
            />
            
            {/* Donut segments */}
            {segments.map((segment, index) => {
              const isHovered = hoveredSegment === index;
              const innerRadius = isHovered ? 28 : 30;
              const outerRadius = isHovered ? 44 : 42;
              
              return (
                <g key={index}>
                  <path
                    d={createArc(segment.startAngle, segment.endAngle, innerRadius, outerRadius)}
                    fill={segment.color}
                    className="transition-all duration-300 cursor-pointer"
                    style={{ 
                      filter: isHovered ? 'brightness(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.2))' : 'none',
                      transformOrigin: '50% 50%'
                    }}
                    onMouseEnter={() => setHoveredSegment(index)}
                    onMouseLeave={() => setHoveredSegment(null)}
                  />
                </g>
              );
            })}
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-4xl font-bold qe-text-primary mb-1">{total}</p>
            <p className="text-xs qe-text-secondary font-medium">Evaluadas</p>
            {hoveredSegment !== null && (
              <div className="mt-1 px-2 py-0.5 rounded-full animate-fade-in" 
                   style={{ backgroundColor: segments[hoveredSegment].color + '20' }}>
                <p className="text-xs font-semibold" style={{ color: segments[hoveredSegment].color }}>
                  {segments[hoveredSegment].label}: {segments[hoveredSegment].value}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Legend - Compacta */}
        <div className="flex-1 space-y-2 w-full">
          {data.map((item, index) => {
            const Icon = item.icon;
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            const isHovered = hoveredSegment === index;
            
            return (
              <div 
                key={index}
                className="p-2.5 rounded-lg border transition-all duration-300 cursor-pointer"
                style={{ 
                  borderColor: isHovered ? item.color : '#e5e7eb',
                  backgroundColor: isHovered ? `${item.color}15` : `${item.color}08`,
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-1 rounded transition-transform"
                      style={{ 
                        backgroundColor: item.color + '20',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm qe-text-primary">{item.label}</p>
                      <p className="text-xs qe-text-secondary">{item.description}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-baseline gap-1.5">
                    <p className="text-xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-xs qe-text-secondary font-medium">({percentage}%)</p>
                  </div>
                </div>
                
                {/* Progress bar más delgada */}
                <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-700 ease-out relative"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: item.color
                    }}
                  >
                    {/* Shine effect */}
                    <div 
                      className="absolute inset-0 opacity-30"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
                        animation: isHovered ? 'shine 1.5s infinite' : 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Info adicional */}
      <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: '#fef3c7' }}>
        <p className="text-sm qe-text-secondary">
          💡 <strong className="qe-text-primary">Consejo:</strong> Enfócate en las preguntas de alto riesgo para mejorar tu rendimiento general.
        </p>
      </div>

      {/* Add CSS animation for shine effect */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default RiskQuestionsChart;
