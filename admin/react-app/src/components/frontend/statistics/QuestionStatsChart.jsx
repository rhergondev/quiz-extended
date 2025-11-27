// admin/react-app/src/components/frontend/statistics/QuestionStatsChart.jsx

import React, { useState } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { PieChart, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const QuestionStatsChart = ({ 
  statsData, 
  compact = false,
  isDarkMode = false,
  pageColors = null 
}) => {
  const { getColor } = useTheme();
  const [hoveredSegment, setHoveredSegment] = useState(null);

  // Use provided pageColors or generate defaults
  const colors = pageColors || {
    text: isDarkMode ? getColor('textPrimary', '#f9fafb') : getColor('primary', '#1a202c'),
    textMuted: getColor('textSecondary', '#6b7280'),
    primary: getColor('primary', '#3b82f6'),
    background: getColor('background', '#ffffff'),
    secondaryBg: getColor('secondaryBackground', '#f3f4f6'),
  };

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
  let currentAngle = -90;
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
      className={`p-4 rounded-lg border flex flex-col ${compact ? '' : 'shadow-lg'}`}
      style={{ 
        backgroundColor: colors.background,
        borderColor: isDarkMode ? colors.primary + '40' : '#e5e7eb'
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: isDarkMode ? colors.primary + '30' : '#e5e7eb' }}>
        <PieChart className="w-4 h-4" style={{ color: colors.primary }} />
        <h2 className="text-sm font-semibold" style={{ color: colors.text }}>Distribución de Respuestas</h2>
      </div>

      <div className="flex items-center gap-4 flex-1">
        {/* Donut Chart - Smaller */}
        <div className="relative flex-shrink-0 w-28 h-28">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={isDarkMode ? colors.primary + '20' : '#f3f4f6'}
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
                      filter: isHovered ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(0,0,0,0.2))' : 'none',
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
            <p className="text-2xl font-bold" style={{ color: colors.text }}>{total}</p>
            <p className="text-xs" style={{ color: colors.textMuted }}>Total</p>
          </div>
        </div>

        {/* Legend - Compact */}
        <div className="flex-1 space-y-1.5">
          {data.map((item, index) => {
            const Icon = item.icon;
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
            const isHovered = hoveredSegment === index;
            
            return (
              <div 
                key={index}
                className="flex items-center justify-between p-1.5 rounded transition-all cursor-pointer"
                style={{ 
                  backgroundColor: isHovered ? `${item.color}15` : 'transparent'
                }}
                onMouseEnter={() => setHoveredSegment(index)}
                onMouseLeave={() => setHoveredSegment(null)}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                  <span className="text-xs font-medium" style={{ color: colors.text }}>{item.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  <span className="text-xs" style={{ color: colors.textMuted }}>({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuestionStatsChart;
