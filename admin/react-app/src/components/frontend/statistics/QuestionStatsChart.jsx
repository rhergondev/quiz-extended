// admin/react-app/src/components/frontend/statistics/QuestionStatsChart.jsx

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { PieChart, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const QuestionStatsChart = ({ statsData, compact = false }) => {
  const { getColor } = useTheme();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  const data = [
    { 
      label: 'Correctas', 
      value: statsData?.correct_answers || 0, 
      color: '#10b981',
      icon: CheckCircle 
    },
    { 
      label: 'Incorrectas', 
      value: statsData?.incorrect_answers || 0, 
      color: '#ef4444',
      icon: XCircle 
    },
    { 
      label: 'Sin Contestar', 
      value: statsData?.unanswered || 0, 
      color: '#94a3b8',
      icon: HelpCircle 
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
      className={`${compact ? '' : 'p-6 rounded-xl shadow-lg border-2'} flex flex-col h-full`}
      style={compact ? {} : { 
        backgroundColor: getColor('secondaryBackground', '#f8f9fa'),
        borderColor: getColor('primary', '#3b82f6')
      }}
    >
      {!compact && (
        <div className="flex items-center gap-3 mb-4 pb-4 border-b-2" style={{ borderColor: getColor('primary', '#3b82f6') + '30' }}>
          <PieChart className="w-6 h-6" style={{ color: getColor('primary', '#3b82f6') }} />
          <h2 className="text-xl font-bold qe-text-primary">Distribución</h2>
        </div>
      )}

      <div className="flex flex-col lg:flex-row items-center gap-4 flex-1">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0 w-48 h-48">
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
            <p className="text-xs qe-text-secondary font-medium">Total</p>
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

        {/* Legend Cards - Más compactas */}
        <div className="flex-1 space-y-2 w-full">
          {data.map((item, index) => {
            const Icon = item.icon;
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            const isHovered = hoveredSegment === index;
            
            return (
              <div 
                key={index}
                className="p-2 rounded-lg border transition-all duration-300 cursor-pointer"
                style={{ 
                  borderColor: isHovered ? item.color : '#e5e7eb',
                  backgroundColor: isHovered ? `${item.color}15` : `${item.color}08`,
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isHovered ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div 
                      className="p-0.5 rounded transition-transform"
                      style={{ 
                        backgroundColor: item.color + '20',
                        transform: isHovered ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      <Icon className="w-3 h-3" style={{ color: item.color }} />
                    </div>
                    <span className="font-semibold text-xs qe-text-primary">{item.label}</span>
                  </div>
                  <div className="text-right flex items-baseline gap-1">
                    <p className="text-lg font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="text-xs qe-text-secondary font-medium">({percentage}%)</p>
                  </div>
                </div>
                
                {/* Progress bar más delgada */}
                <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
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

      {/* Summary más compacto - solo mostrar si no es compact */}
      {!compact && (
        <div className="mt-4 pt-3 border-t-2" style={{ borderColor: getColor('primary', '#3b82f6') + '20' }}>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-medium qe-text-secondary">Total:</span>
            <span className="text-lg font-bold" style={{ color: getColor('primary', '#3b82f6') }}>
              {total}
            </span>
            <span className="text-xs qe-text-secondary">preguntas</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionStatsChart;
